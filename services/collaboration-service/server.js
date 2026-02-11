const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const ot = require('ot');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 8004;

// Redis for caching and real-time state
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

app.use(express.json());

const generateAccessCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const requireMeetingAccess = async (meetingId, userId) => {
  const meeting = await Meeting.findByPk(meetingId, {
    include: [{ model: MeetingParticipant, as: 'participants' }]
  });

  if (!meeting) {
    const error = new Error('Meeting not found');
    error.status = 404;
    throw error;
  }

  const isParticipant = meeting.hostId === userId
    || meeting.participants.some((participant) => participant.userId === userId);

  if (!isParticipant) {
    const error = new Error('Access denied');
    error.status = 403;
    throw error;
  }

  return meeting;
};

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/collaboration', {
  dialect: 'postgres',
  logging: false
});

// Models
const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: DataTypes.TEXT,
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('doc', 'wiki', 'note', 'kanban'),
    defaultValue: 'doc'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'shared'),
    defaultValue: 'private'
  },
  collaborators: DataTypes.ARRAY(DataTypes.UUID),
  tags: DataTypes.ARRAY(DataTypes.STRING),
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
});

const Wiki = sequelize.define('Wiki', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  },
  content: DataTypes.TEXT,
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  parentId: DataTypes.UUID,
  visibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'public'
  },
  contributors: DataTypes.ARRAY(DataTypes.UUID),
  // Phase 2: Categories/tags for wiki organization
  categories: DataTypes.ARRAY(DataTypes.STRING)
});

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  assigneeId: DataTypes.UUID,
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
    defaultValue: 'todo'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  dueDate: DataTypes.DATE,
  projectId: DataTypes.UUID
});

// NEW: GitHub-inspired Issues Model
const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: DataTypes.UUID,
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assigneeId: DataTypes.UUID,
  milestoneId: DataTypes.UUID, // Reference to Milestone model
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'closed'),
    defaultValue: 'open'
  },
  labels: DataTypes.ARRAY(DataTypes.STRING),
  milestone: DataTypes.STRING, // Legacy field, kept for backward compatibility
  comments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Issue Comments
const IssueComment = sequelize.define('IssueComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  issueId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// NEW: GitHub-inspired Projects Model
const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'private'
  },
  members: DataTypes.ARRAY(DataTypes.UUID)
});

// NEW: GitHub-inspired Milestones Model
const Milestone = sequelize.define('Milestone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  dueDate: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    defaultValue: 'open'
  },
  completedIssues: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalIssues: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 2 - Document Version History (Notion/Drive-inspired)
const DocumentVersion = sequelize.define('DocumentVersion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  changedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  changeDescription: DataTypes.TEXT,
  contentHash: DataTypes.STRING // For detecting actual content changes
});

// NEW: Phase 2 - Wiki Edit History (Wikipedia-inspired)
const WikiHistory = sequelize.define('WikiHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wikiId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  editedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  editSummary: DataTypes.TEXT,
  contentHash: DataTypes.STRING
});

// Phase 9: Meeting Modes and Live Sessions (Core)
const Meeting = sequelize.define('Meeting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  mode: {
    type: DataTypes.ENUM(
      'standard',
      'debate',
      'round_table',
      'court',
      'workshop',
      'town_hall',
      'conference',
      'quiz',
      'custom'
    ),
    defaultValue: 'standard'
  },
  scheduledAt: DataTypes.DATE,
  durationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
    defaultValue: 'scheduled'
  },
  hostId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  accessCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  allowGuests: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  maxParticipants: DataTypes.INTEGER,
  settings: DataTypes.JSONB
});

const MeetingParticipant = sequelize.define('MeetingParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: DataTypes.UUID,
  guestEmail: DataTypes.STRING,
  guestName: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('host', 'participant', 'moderator', 'guest'),
    defaultValue: 'participant'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  leftAt: DataTypes.DATE,
  isGuest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

const MeetingAgendaItem = sequelize.define('MeetingAgendaItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('planned', 'in_progress', 'completed'),
    defaultValue: 'planned'
  }
});

const MeetingNote = sequelize.define('MeetingNote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

const MeetingActionItem = sequelize.define('MeetingActionItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  assigneeId: DataTypes.UUID,
  dueDate: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'done'),
    defaultValue: 'open'
  }
});

const MeetingDecision = sequelize.define('MeetingDecision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  summary: DataTypes.TEXT,
  decidedBy: DataTypes.UUID,
  decidedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: External Meeting Integration
const ExternalMeetingLink = sequelize.define('ExternalMeetingLink', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  platform: {
    type: DataTypes.ENUM('google_meet', 'zoom', 'teams'),
    allowNull: false
  },
  externalId: DataTypes.STRING,
  joinUrl: DataTypes.STRING,
  metadata: DataTypes.JSONB,
  syncedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Meeting Recording Policy
const MeetingRecording = sequelize.define('MeetingRecording', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recordingUrl: DataTypes.STRING,
  recordingType: {
    type: DataTypes.ENUM('video', 'audio', 'transcript'),
    defaultValue: 'video'
  },
  startedAt: DataTypes.DATE,
  endedAt: DataTypes.DATE,
  duration: DataTypes.INTEGER,
  recordedBy: DataTypes.UUID,
  consent: DataTypes.JSONB, // Track who consented to recording
  policy: DataTypes.JSONB // Organization/meeting-specific recording policy
});

// Phase 9: Calendar Integration
const CalendarEvent = sequelize.define('CalendarEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  provider: {
    type: DataTypes.ENUM('google', 'outlook'),
    allowNull: false
  },
  externalEventId: DataTypes.STRING,
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  syncedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Debate Mode - Evidence and Arguments
const DebateEvidence = sequelize.define('DebateEvidence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  side: {
    type: DataTypes.ENUM('pro', 'con'),
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  sourceUrl: DataTypes.STRING,
  sourceType: {
    type: DataTypes.ENUM('article', 'study', 'expert', 'data', 'other'),
    defaultValue: 'other'
  },
  credibilityScore: DataTypes.FLOAT,
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const DebateArgument = sequelize.define('DebateArgument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  side: {
    type: DataTypes.ENUM('pro', 'con'),
    allowNull: false
  },
  roundNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  argumentType: {
    type: DataTypes.ENUM('opening', 'rebuttal', 'closing'),
    defaultValue: 'opening'
  },
  content: DataTypes.TEXT,
  evidenceIds: DataTypes.ARRAY(DataTypes.UUID),
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const DebateVote = sequelize.define('DebateVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  voterId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  winningSide: {
    type: DataTypes.ENUM('pro', 'con', 'tie'),
    allowNull: false
  },
  reasoning: DataTypes.TEXT,
  votedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Round Table Mode
const RoundTableTurn = sequelize.define('RoundTableTurn', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  roundNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  orderIndex: DataTypes.INTEGER,
  topicId: DataTypes.UUID,
  startedAt: DataTypes.DATE,
  endedAt: DataTypes.DATE,
  allocatedSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 120
  },
  usedSeconds: DataTypes.INTEGER,
  content: DataTypes.TEXT
});

const RoundTableTopic = sequelize.define('RoundTableTopic', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  orderIndex: DataTypes.INTEGER,
  status: {
    type: DataTypes.ENUM('pending', 'active', 'completed'),
    defaultValue: 'pending'
  },
  consensusLevel: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

// Phase 9: Virtual Court Mode
const CourtEvidence = sequelize.define('CourtEvidence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  exhibitNumber: DataTypes.STRING,
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  fileUrl: DataTypes.STRING,
  fileType: DataTypes.STRING,
  chainOfCustody: DataTypes.JSONB, // Immutable log of who handled evidence
  admissibilityStatus: {
    type: DataTypes.ENUM('pending', 'admitted', 'excluded'),
    defaultValue: 'pending'
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const CourtMotion = sequelize.define('CourtMotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  filedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  motionType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  ruling: {
    type: DataTypes.ENUM('granted', 'denied', 'deferred', 'pending'),
    defaultValue: 'pending'
  },
  rulingReason: DataTypes.TEXT,
  ruledBy: DataTypes.UUID,
  filedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ruledAt: DataTypes.DATE
});

const CourtVerdict = sequelize.define('CourtVerdict', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  judgeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  decision: DataTypes.TEXT,
  reasoning: DataTypes.TEXT,
  evidenceConsidered: DataTypes.ARRAY(DataTypes.UUID),
  renderedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Workshop Mode
const WorkshopIdea = sequelize.define('WorkshopIdea', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  category: DataTypes.STRING,
  votes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  priorityScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('proposed', 'discussing', 'accepted', 'rejected'),
    defaultValue: 'proposed'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Town Hall Mode
const TownHallQuestion = sequelize.define('TownHallQuestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  askerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  upvotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  answered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  answer: DataTypes.TEXT,
  answeredBy: DataTypes.UUID,
  answeredAt: DataTypes.DATE,
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const TownHallPoll = sequelize.define('TownHallPoll', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  question: {
    type: DataTypes.STRING,
    allowNull: false
  },
  options: DataTypes.JSONB, // Array of {id, text, votes}
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  totalVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Virtual Conference Mode
const ConferenceSession = sequelize.define('ConferenceSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  track: DataTypes.STRING,
  speakerIds: DataTypes.ARRAY(DataTypes.UUID),
  startTime: DataTypes.DATE,
  endTime: DataTypes.DATE,
  roomId: DataTypes.STRING,
  capacity: DataTypes.INTEGER,
  attendeeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  resources: DataTypes.JSONB // Links, slides, recordings
});

// Phase 9: Quiz Mode
const QuizQuestion = sequelize.define('QuizQuestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: DataTypes.JSONB, // Array of {id, text, isCorrect}
  correctAnswer: DataTypes.STRING,
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  timeLimit: DataTypes.INTEGER, // seconds
  orderIndex: DataTypes.INTEGER,
  category: DataTypes.STRING
});

const QuizResponse = sequelize.define('QuizResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  teamId: DataTypes.UUID,
  answer: DataTypes.STRING,
  isCorrect: DataTypes.BOOLEAN,
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  timeToAnswer: DataTypes.INTEGER, // milliseconds
  answeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Real-time state tracking
const MeetingState = sequelize.define('MeetingState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  currentRound: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  currentSpeaker: DataTypes.UUID,
  timerStartedAt: DataTypes.DATE,
  timerDuration: DataTypes.INTEGER, // seconds
  timerRemaining: DataTypes.INTEGER,
  isPaused: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  stateData: DataTypes.JSONB, // Mode-specific state
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 9: Audit trail for role actions
const MeetingAuditLog = sequelize.define('MeetingAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'meeting_control',
      'participant_action',
      'evidence_submission',
      'ruling',
      'vote',
      'timer',
      'role_change',
      'other'
    ),
    defaultValue: 'other'
  },
  details: DataTypes.JSONB,
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// ==================== PHASE 10 MODELS ====================

// Phase 10.1: Role Permission System
const MeetingRolePermission = sequelize.define('MeetingRolePermission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false
  },
  permissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  restrictions: DataTypes.JSONB
});

// Phase 10.1: Tamper-Evident Audit Trail
const AuditTrailEntry = sequelize.define('AuditTrailEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sequenceNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previousHash: DataTypes.STRING,
  currentHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  entityType: DataTypes.STRING,
  entityId: DataTypes.UUID,
  details: DataTypes.JSONB,
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 10.1: Redaction Records
const ContentRedaction = sequelize.define('ContentRedaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  contentType: {
    type: DataTypes.ENUM('transcript', 'recording', 'note', 'evidence', 'message'),
    allowNull: false
  },
  contentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  redactedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  redactionType: {
    type: DataTypes.ENUM('full', 'partial', 'blur'),
    defaultValue: 'partial'
  },
  originalContent: DataTypes.TEXT,
  redactedContent: DataTypes.TEXT,
  timeRanges: DataTypes.JSONB, // For recordings: [{start: 10, end: 15}]
  redactedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Phase 10.1: Consent Management
const ParticipantConsent = sequelize.define('ParticipantConsent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  consentType: {
    type: DataTypes.ENUM('recording', 'transcript', 'export', 'sharing', 'archival'),
    allowNull: false
  },
  granted: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  grantedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: DataTypes.DATE,
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.STRING
});

// Phase 10.2: Meeting Rulesets
const MeetingRuleset = sequelize.define('MeetingRuleset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  rules: {
    type: DataTypes.JSONB,
    allowNull: false
  }, // {timeLimits: {}, civilityRules: {}, evidenceRules: {}}
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Phase 10.2: Moderation Actions
const ModerationAction = sequelize.define('ModerationAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  moderatorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  actionType: {
    type: DataTypes.ENUM('warning', 'mute', 'unmute', 'role_change', 'remove', 'timeout'),
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: DataTypes.INTEGER, // For timeout/mute duration in seconds
  previousRole: DataTypes.STRING,
  newRole: DataTypes.STRING,
  issuedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: DataTypes.DATE
});

// Phase 10.2: Dispute Flags
const DisputeFlag = sequelize.define('DisputeFlag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reportedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  targetType: {
    type: DataTypes.ENUM('participant', 'content', 'evidence', 'ruling'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  },
  reviewedBy: DataTypes.UUID,
  resolution: DataTypes.TEXT,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  resolvedAt: DataTypes.DATE
});

// Phase 10.3: Meeting Templates
const MeetingTemplate = sequelize.define('MeetingTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('hearing', 'mediation', 'arbitration', 'town_hall', 'board_meeting', 'custom'),
    allowNull: false
  },
  description: DataTypes.TEXT,
  mode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleDefinitions: {
    type: DataTypes.JSONB,
    allowNull: false
  }, // Roles and their permissions
  rulesetTemplate: DataTypes.JSONB,
  agendaTemplate: DataTypes.JSONB,
  documentTemplates: DataTypes.JSONB,
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: DataTypes.UUID,
  organizationId: DataTypes.UUID,
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Phase 10.3: Verdict and Ruling Templates
const RulingTemplate = sequelize.define('RulingTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  templateType: {
    type: DataTypes.ENUM('verdict', 'ruling', 'decision', 'order'),
    allowNull: false
  },
  category: DataTypes.STRING,
  structure: {
    type: DataTypes.JSONB,
    allowNull: false
  }, // Template structure with fields
  legalStandards: DataTypes.JSONB, // Legal standards and requirements
  isStandard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: DataTypes.UUID
});

// Phase 10.3: Compliance Exports
const ComplianceExport = sequelize.define('ComplianceExport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  exportType: {
    type: DataTypes.ENUM('full', 'summary', 'evidence_only', 'transcript_only'),
    defaultValue: 'full'
  },
  format: {
    type: DataTypes.ENUM('pdf', 'json', 'bundle'),
    defaultValue: 'bundle'
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  fileUrl: DataTypes.STRING,
  fileSize: DataTypes.INTEGER,
  metadata: DataTypes.JSONB,
  includeRedactions: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  includeAuditTrail: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  completedAt: DataTypes.DATE
});

// Relationships
Issue.hasMany(IssueComment, { foreignKey: 'issueId' });
IssueComment.belongsTo(Issue, { foreignKey: 'issueId' });
Project.hasMany(Issue, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId' });
Project.hasMany(Milestone, { foreignKey: 'projectId' });
Milestone.hasMany(Issue, { foreignKey: 'milestoneId' });
Issue.belongsTo(Milestone, { foreignKey: 'milestoneId' });

// Phase 9: Meeting relationships
Meeting.hasMany(MeetingParticipant, { foreignKey: 'meetingId', as: 'participants' });
MeetingParticipant.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingAgendaItem, { foreignKey: 'meetingId', as: 'agenda' });
MeetingAgendaItem.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingNote, { foreignKey: 'meetingId', as: 'notes' });
MeetingNote.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingActionItem, { foreignKey: 'meetingId', as: 'actions' });
MeetingActionItem.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingDecision, { foreignKey: 'meetingId', as: 'decisions' });
MeetingDecision.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Phase 10: Governance, Safety, and Civic relationships
Meeting.hasMany(MeetingRolePermission, { foreignKey: 'meetingId', as: 'rolePermissions' });
MeetingRolePermission.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(AuditTrailEntry, { foreignKey: 'meetingId', as: 'auditTrail' });
AuditTrailEntry.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(ContentRedaction, { foreignKey: 'meetingId', as: 'redactions' });
ContentRedaction.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(ParticipantConsent, { foreignKey: 'meetingId', as: 'consents' });
ParticipantConsent.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingRuleset, { foreignKey: 'meetingId', as: 'rulesets' });
MeetingRuleset.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(ModerationAction, { foreignKey: 'meetingId', as: 'moderationActions' });
ModerationAction.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(DisputeFlag, { foreignKey: 'meetingId', as: 'disputes' });
DisputeFlag.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(ComplianceExport, { foreignKey: 'meetingId', as: 'exports' });
ComplianceExport.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Phase 2: Document and Wiki history relationships
Document.hasMany(DocumentVersion, { foreignKey: 'documentId', as: 'versions' });
DocumentVersion.belongsTo(Document, { foreignKey: 'documentId' });
Wiki.hasMany(WikiHistory, { foreignKey: 'wikiId', as: 'history' });
WikiHistory.belongsTo(Wiki, { foreignKey: 'wikiId' });

// Phase 6: Collaborative Editing Models (Originally deferred, now implemented)
const CollaborativeSession = sequelize.define('CollaborativeSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  documentType: {
    type: DataTypes.ENUM('document', 'wiki', 'spreadsheet'),
    defaultValue: 'document'
  },
  activeUsers: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  operationCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

const CollaborativeOperation = sequelize.define('CollaborativeOperation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  operationType: {
    type: DataTypes.ENUM('insert', 'delete', 'retain', 'format'),
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: DataTypes.TEXT,
  length: DataTypes.INTEGER,
  attributes: DataTypes.JSONB, // For formatting operations
  baseRevision: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  appliedRevision: DataTypes.INTEGER
});

const UserPresence = sequelize.define('UserPresence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  cursorPosition: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  selectionStart: DataTypes.INTEGER,
  selectionEnd: DataTypes.INTEGER,
  color: {
    type: DataTypes.STRING,
    defaultValue: '#000000'
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Collaborative editing relationships
CollaborativeSession.hasMany(CollaborativeOperation, { foreignKey: 'sessionId', as: 'operations' });
CollaborativeOperation.belongsTo(CollaborativeSession, { foreignKey: 'sessionId' });
CollaborativeSession.hasMany(UserPresence, { foreignKey: 'sessionId', as: 'presences' });
UserPresence.belongsTo(CollaborativeSession, { foreignKey: 'sessionId' });

// Phase 9: Additional meeting mode relationships
Meeting.hasMany(ExternalMeetingLink, { foreignKey: 'meetingId', as: 'externalLinks' });
ExternalMeetingLink.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingRecording, { foreignKey: 'meetingId', as: 'recordings' });
MeetingRecording.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(CalendarEvent, { foreignKey: 'meetingId', as: 'calendarEvents' });
CalendarEvent.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasOne(MeetingState, { foreignKey: 'meetingId', as: 'state' });
MeetingState.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(MeetingAuditLog, { foreignKey: 'meetingId', as: 'auditLogs' });
MeetingAuditLog.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Debate mode relationships
Meeting.hasMany(DebateEvidence, { foreignKey: 'meetingId', as: 'debateEvidence' });
DebateEvidence.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(DebateArgument, { foreignKey: 'meetingId', as: 'debateArguments' });
DebateArgument.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(DebateVote, { foreignKey: 'meetingId', as: 'debateVotes' });
DebateVote.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Round Table mode relationships
Meeting.hasMany(RoundTableTopic, { foreignKey: 'meetingId', as: 'roundTableTopics' });
RoundTableTopic.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(RoundTableTurn, { foreignKey: 'meetingId', as: 'roundTableTurns' });
RoundTableTurn.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Court mode relationships
Meeting.hasMany(CourtEvidence, { foreignKey: 'meetingId', as: 'courtEvidence' });
CourtEvidence.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(CourtMotion, { foreignKey: 'meetingId', as: 'courtMotions' });
CourtMotion.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(CourtVerdict, { foreignKey: 'meetingId', as: 'courtVerdicts' });
CourtVerdict.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Workshop mode relationships
Meeting.hasMany(WorkshopIdea, { foreignKey: 'meetingId', as: 'workshopIdeas' });
WorkshopIdea.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Town Hall mode relationships
Meeting.hasMany(TownHallQuestion, { foreignKey: 'meetingId', as: 'townHallQuestions' });
TownHallQuestion.belongsTo(Meeting, { foreignKey: 'meetingId' });
Meeting.hasMany(TownHallPoll, { foreignKey: 'meetingId', as: 'townHallPolls' });
TownHallPoll.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Conference mode relationships
Meeting.hasMany(ConferenceSession, { foreignKey: 'meetingId', as: 'conferenceSessions' });
ConferenceSession.belongsTo(Meeting, { foreignKey: 'meetingId' });

// Quiz mode relationships
Meeting.hasMany(QuizQuestion, { foreignKey: 'meetingId', as: 'quizQuestions' });
QuizQuestion.belongsTo(Meeting, { foreignKey: 'meetingId' });
QuizQuestion.hasMany(QuizResponse, { foreignKey: 'questionId', as: 'responses' });
QuizResponse.belongsTo(QuizQuestion, { foreignKey: 'questionId' });

sequelize.sync();

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'collaboration-service' });
});

// Public: Get public documents
app.get('/public/docs', async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: { visibility: 'public' },
      order: [['updatedAt', 'DESC']],
      limit: 20
    });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Public: Get public wiki pages
app.get('/public/wiki', async (req, res) => {
  try {
    const pages = await Wiki.findAll({
      where: { visibility: 'public' },
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki pages' });
  }
});

// Public: Get single wiki page
app.get('/public/wiki/:slug', async (req, res) => {
  try {
    const page = await Wiki.findOne({
      where: { slug: req.params.slug, visibility: 'public' }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// ==================== PHASE 9: MEETING MODES (CORE) ====================

// Create meeting
app.post('/meetings', async (req, res) => {
  try {
    const hostId = req.header('x-user-id');
    if (!hostId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      mode = 'standard',
      scheduledAt,
      durationMinutes = 30,
      allowGuests = true,
      maxParticipants,
      settings
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const meeting = await Meeting.create({
      title,
      description,
      mode,
      scheduledAt,
      durationMinutes,
      hostId,
      accessCode: generateAccessCode(),
      allowGuests,
      maxParticipants,
      settings: settings || {}
    });

    await MeetingParticipant.create({
      meetingId: meeting.id,
      userId: hostId,
      role: 'host',
      isGuest: false
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// List meetings for user
app.get('/meetings', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetings = await Meeting.findAll({
      where: {
        [Op.or]: [
          { hostId: userId },
          { '$participants.userId$': userId }
        ]
      },
      include: [
        {
          model: MeetingParticipant,
          as: 'participants',
          required: false
        }
      ],
      distinct: true,
      order: [['scheduledAt', 'DESC']]
    });

    res.json(meetings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get meeting details (authenticated)
app.get('/meetings/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await Meeting.findByPk(req.params.id, {
      include: [{ model: MeetingParticipant, as: 'participants' }]
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.hostId === userId || meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// Join meeting (authenticated)
app.post('/meetings/:id/join', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const existing = await MeetingParticipant.findOne({
      where: { meetingId: meeting.id, userId }
    });

    if (existing) {
      return res.json(existing);
    }

    const participant = await MeetingParticipant.create({
      meetingId: meeting.id,
      userId,
      role: 'participant',
      isGuest: false
    });

    res.status(201).json(participant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Leave meeting (authenticated)
app.post('/meetings/:id/leave', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const participant = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    await participant.update({ leftAt: new Date() });

    res.json({ message: 'Left meeting' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to leave meeting' });
  }
});

// Public meeting info (requires access code)
app.get('/meetings/public/:id', async (req, res) => {
  try {
    const { accessCode } = req.query;
    const meeting = await Meeting.findByPk(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.allowGuests || meeting.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Invalid access code' });
    }

    res.json({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      mode: meeting.mode,
      scheduledAt: meeting.scheduledAt,
      durationMinutes: meeting.durationMinutes,
      status: meeting.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// Public join for unregistered participants
app.post('/meetings/public/join', async (req, res) => {
  try {
    const { meetingId, accessCode, email, name } = req.body;

    if (!meetingId || !accessCode || !email || !name) {
      return res.status(400).json({ error: 'meetingId, accessCode, email, and name are required' });
    }

    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.allowGuests || meeting.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Invalid access code' });
    }

    const existing = await MeetingParticipant.findOne({
      where: { meetingId: meeting.id, guestEmail: email }
    });

    if (existing) {
      return res.json(existing);
    }

    const participant = await MeetingParticipant.create({
      meetingId: meeting.id,
      guestEmail: email,
      guestName: name,
      role: 'guest',
      isGuest: true
    });

    res.status(201).json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        mode: meeting.mode,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status
      },
      participant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Public lobby for guests (read-only notes)
app.get('/meetings/public/:id/lobby', async (req, res) => {
  try {
    const { accessCode } = req.query;
    const meeting = await Meeting.findByPk(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.allowGuests || meeting.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Invalid access code' });
    }

    const notes = await MeetingNote.findAll({
      where: { meetingId: meeting.id, isPublic: true },
      order: [['createdAt', 'ASC']]
    });

    res.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        mode: meeting.mode,
        scheduledAt: meeting.scheduledAt,
        durationMinutes: meeting.durationMinutes,
        status: meeting.status
      },
      notes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load lobby' });
  }
});

// Agenda endpoints
app.get('/meetings/:id/agenda', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const agenda = await MeetingAgendaItem.findAll({
      where: { meetingId: req.params.id },
      order: [['orderIndex', 'ASC']]
    });

    res.json(agenda);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch agenda' });
  }
});

app.post('/meetings/:id/agenda', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, description, orderIndex, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const item = await MeetingAgendaItem.create({
      meetingId: req.params.id,
      title,
      description,
      orderIndex: orderIndex ?? 0,
      status: status || 'planned'
    });

    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create agenda item' });
  }
});

app.put('/meetings/:id/agenda/:itemId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const item = await MeetingAgendaItem.findByPk(req.params.itemId);

    if (!item || item.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }

    const { title, description, orderIndex, status } = req.body;
    await item.update({
      title: title ?? item.title,
      description: description ?? item.description,
      orderIndex: orderIndex ?? item.orderIndex,
      status: status ?? item.status
    });

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update agenda item' });
  }
});

app.delete('/meetings/:id/agenda/:itemId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const item = await MeetingAgendaItem.findByPk(req.params.itemId);

    if (!item || item.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }

    await item.destroy();
    res.json({ message: 'Agenda item deleted' });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete agenda item' });
  }
});

// Notes endpoints
app.get('/meetings/:id/notes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const notes = await MeetingNote.findAll({
      where: { meetingId: req.params.id },
      order: [['pinned', 'DESC'], ['createdAt', 'ASC']]
    });

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch notes' });
  }
});

app.post('/meetings/:id/notes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { content, isPublic = true, pinned = false } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await MeetingNote.create({
      meetingId: req.params.id,
      authorId: userId,
      content,
      isPublic,
      pinned
    });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create note' });
  }
});

app.put('/meetings/:id/notes/:noteId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const note = await MeetingNote.findByPk(req.params.noteId);

    if (!note || note.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const { content, isPublic, pinned } = req.body;
    await note.update({
      content: content ?? note.content,
      isPublic: isPublic ?? note.isPublic,
      pinned: pinned ?? note.pinned
    });

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update note' });
  }
});

app.delete('/meetings/:id/notes/:noteId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const note = await MeetingNote.findByPk(req.params.noteId);

    if (!note || note.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await note.destroy();
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete note' });
  }
});

// Action items
app.get('/meetings/:id/actions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const actions = await MeetingActionItem.findAll({
      where: { meetingId: req.params.id },
      order: [['createdAt', 'ASC']]
    });

    res.json(actions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch action items' });
  }
});

app.post('/meetings/:id/actions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, description, assigneeId, dueDate, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const action = await MeetingActionItem.create({
      meetingId: req.params.id,
      title,
      description,
      assigneeId,
      dueDate,
      status: status || 'open'
    });

    res.status(201).json(action);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create action item' });
  }
});

app.put('/meetings/:id/actions/:actionId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const action = await MeetingActionItem.findByPk(req.params.actionId);

    if (!action || action.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    const { title, description, assigneeId, dueDate, status } = req.body;
    await action.update({
      title: title ?? action.title,
      description: description ?? action.description,
      assigneeId: assigneeId ?? action.assigneeId,
      dueDate: dueDate ?? action.dueDate,
      status: status ?? action.status
    });

    res.json(action);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update action item' });
  }
});

app.delete('/meetings/:id/actions/:actionId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const action = await MeetingActionItem.findByPk(req.params.actionId);

    if (!action || action.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    await action.destroy();
    res.json({ message: 'Action item deleted' });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete action item' });
  }
});

// Decisions
app.get('/meetings/:id/decisions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const decisions = await MeetingDecision.findAll({
      where: { meetingId: req.params.id },
      order: [['decidedAt', 'DESC']]
    });

    res.json(decisions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch decisions' });
  }
});

app.post('/meetings/:id/decisions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, summary, decidedAt } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const decision = await MeetingDecision.create({
      meetingId: req.params.id,
      title,
      summary,
      decidedBy: userId,
      decidedAt: decidedAt ? new Date(decidedAt) : new Date()
    });

    res.status(201).json(decision);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create decision' });
  }
});

app.delete('/meetings/:id/decisions/:decisionId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const decision = await MeetingDecision.findByPk(req.params.decisionId);

    if (!decision || decision.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    await decision.destroy();
    res.json({ message: 'Decision deleted' });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete decision' });
  }
});

// ==================== PHASE 9: MEETING MODES - BACKEND ENDPOINTS ====================

// External Meeting Integration
app.post('/meetings/:id/external-link', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { platform, externalId, joinUrl, metadata } = req.body;

    const link = await ExternalMeetingLink.create({
      meetingId: req.params.id,
      platform,
      externalId,
      joinUrl,
      metadata
    });

    res.status(201).json(link);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create external link' });
  }
});

app.get('/meetings/:id/external-links', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const links = await ExternalMeetingLink.findAll({
      where: { meetingId: req.params.id },
      order: [['syncedAt', 'DESC']]
    });

    res.json(links);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get external links' });
  }
});

// Recording Management
app.post('/meetings/:id/recordings', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { recordingUrl, recordingType, startedAt, endedAt, duration, consent, policy } = req.body;

    const recording = await MeetingRecording.create({
      meetingId: req.params.id,
      recordingUrl,
      recordingType,
      startedAt,
      endedAt,
      duration,
      recordedBy: userId,
      consent,
      policy
    });

    res.status(201).json(recording);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create recording' });
  }
});

app.get('/meetings/:id/recordings', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const recordings = await MeetingRecording.findAll({
      where: { meetingId: req.params.id },
      order: [['startedAt', 'DESC']]
    });

    res.json(recordings);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get recordings' });
  }
});

// Calendar Integration
app.post('/meetings/:id/calendar-sync', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { provider, externalEventId } = req.body;

    const calendarEvent = await CalendarEvent.create({
      meetingId: req.params.id,
      provider,
      externalEventId,
      userId
    });

    res.status(201).json(calendarEvent);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to sync calendar' });
  }
});

// Meeting State Management
app.get('/meetings/:id/state', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    let state = await MeetingState.findOne({
      where: { meetingId: req.params.id }
    });

    if (!state) {
      state = await MeetingState.create({
        meetingId: req.params.id
      });
    }

    res.json(state);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get meeting state' });
  }
});

app.put('/meetings/:id/state', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { currentRound, currentSpeaker, timerStartedAt, timerDuration, timerRemaining, isPaused, stateData } = req.body;

    let state = await MeetingState.findOne({
      where: { meetingId: req.params.id }
    });

    if (!state) {
      state = await MeetingState.create({
        meetingId: req.params.id,
        currentRound,
        currentSpeaker,
        timerStartedAt,
        timerDuration,
        timerRemaining,
        isPaused,
        stateData
      });
    } else {
      await state.update({
        currentRound,
        currentSpeaker,
        timerStartedAt,
        timerDuration,
        timerRemaining,
        isPaused,
        stateData,
        lastUpdated: new Date()
      });
    }

    // Log the state change
    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'state_update',
      category: 'meeting_control',
      details: { newState: stateData }
    });

    res.json(state);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update meeting state' });
  }
});

// Audit Logs
app.get('/meetings/:id/audit-logs', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const logs = await MeetingAuditLog.findAll({
      where: { meetingId: req.params.id },
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get audit logs' });
  }
});

// ==================== DEBATE MODE ====================

app.post('/meetings/:id/debate/evidence', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { side, title, content, sourceUrl, sourceType, credibilityScore } = req.body;

    const evidence = await DebateEvidence.create({
      meetingId: req.params.id,
      participantId: userId,
      side,
      title,
      content,
      sourceUrl,
      sourceType,
      credibilityScore
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'submit_evidence',
      category: 'evidence_submission',
      details: { evidenceId: evidence.id, side, title }
    });

    res.status(201).json(evidence);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit evidence' });
  }
});

app.get('/meetings/:id/debate/evidence', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { side } = req.query;
    const where = { meetingId: req.params.id };
    if (side) where.side = side;

    const evidence = await DebateEvidence.findAll({
      where,
      order: [['submittedAt', 'ASC']]
    });

    res.json(evidence);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get evidence' });
  }
});

app.post('/meetings/:id/debate/arguments', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { side, roundNumber, argumentType, content, evidenceIds } = req.body;

    const argument = await DebateArgument.create({
      meetingId: req.params.id,
      participantId: userId,
      side,
      roundNumber,
      argumentType,
      content,
      evidenceIds
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'submit_argument',
      category: 'participant_action',
      details: { argumentId: argument.id, side, roundNumber, argumentType }
    });

    res.status(201).json(argument);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit argument' });
  }
});

app.get('/meetings/:id/debate/arguments', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const arguments = await DebateArgument.findAll({
      where: { meetingId: req.params.id },
      order: [['roundNumber', 'ASC'], ['timestamp', 'ASC']]
    });

    res.json(arguments);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get arguments' });
  }
});

app.post('/meetings/:id/debate/vote', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { winningSide, reasoning } = req.body;

    const vote = await DebateVote.create({
      meetingId: req.params.id,
      voterId: userId,
      winningSide,
      reasoning
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'cast_vote',
      category: 'vote',
      details: { voteId: vote.id, winningSide }
    });

    res.status(201).json(vote);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit vote' });
  }
});

app.get('/meetings/:id/debate/votes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const votes = await DebateVote.findAll({
      where: { meetingId: req.params.id },
      order: [['votedAt', 'ASC']]
    });

    // Calculate results
    const results = {
      pro: votes.filter(v => v.winningSide === 'pro').length,
      con: votes.filter(v => v.winningSide === 'con').length,
      tie: votes.filter(v => v.winningSide === 'tie').length,
      total: votes.length
    };

    res.json({ votes, results });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get votes' });
  }
});

// ==================== ROUND TABLE MODE ====================

app.post('/meetings/:id/roundtable/topics', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, description, orderIndex } = req.body;

    const topic = await RoundTableTopic.create({
      meetingId: req.params.id,
      title,
      description,
      orderIndex
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create topic' });
  }
});

app.get('/meetings/:id/roundtable/topics', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const topics = await RoundTableTopic.findAll({
      where: { meetingId: req.params.id },
      order: [['orderIndex', 'ASC']]
    });

    res.json(topics);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get topics' });
  }
});

app.put('/meetings/:id/roundtable/topics/:topicId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { status, consensusLevel } = req.body;
    const topic = await RoundTableTopic.findByPk(req.params.topicId);

    if (!topic || topic.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await topic.update({ status, consensusLevel });
    res.json(topic);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update topic' });
  }
});

app.post('/meetings/:id/roundtable/turns', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { participantId, roundNumber, orderIndex, topicId, allocatedSeconds, content } = req.body;

    const turn = await RoundTableTurn.create({
      meetingId: req.params.id,
      participantId,
      roundNumber,
      orderIndex,
      topicId,
      allocatedSeconds,
      startedAt: new Date(),
      content
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'start_turn',
      category: 'participant_action',
      details: { turnId: turn.id, participantId, roundNumber }
    });

    res.status(201).json(turn);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create turn' });
  }
});

app.put('/meetings/:id/roundtable/turns/:turnId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { endedAt, usedSeconds, content } = req.body;
    const turn = await RoundTableTurn.findByPk(req.params.turnId);

    if (!turn || turn.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Turn not found' });
    }

    await turn.update({ endedAt, usedSeconds, content });
    res.json(turn);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update turn' });
  }
});

app.get('/meetings/:id/roundtable/turns', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const turns = await RoundTableTurn.findAll({
      where: { meetingId: req.params.id },
      order: [['roundNumber', 'ASC'], ['orderIndex', 'ASC']]
    });

    res.json(turns);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get turns' });
  }
});

// ==================== VIRTUAL COURT MODE ====================

app.post('/meetings/:id/court/evidence', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { exhibitNumber, title, description, fileUrl, fileType, chainOfCustody } = req.body;

    const evidence = await CourtEvidence.create({
      meetingId: req.params.id,
      submittedBy: userId,
      exhibitNumber,
      title,
      description,
      fileUrl,
      fileType,
      chainOfCustody: chainOfCustody || [{ userId, action: 'submitted', timestamp: new Date() }]
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'submit_court_evidence',
      category: 'evidence_submission',
      details: { evidenceId: evidence.id, exhibitNumber, title }
    });

    res.status(201).json(evidence);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit evidence' });
  }
});

app.get('/meetings/:id/court/evidence', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const evidence = await CourtEvidence.findAll({
      where: { meetingId: req.params.id },
      order: [['submittedAt', 'ASC']]
    });

    res.json(evidence);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get evidence' });
  }
});

app.put('/meetings/:id/court/evidence/:evidenceId/admissibility', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { admissibilityStatus } = req.body;
    const evidence = await CourtEvidence.findByPk(req.params.evidenceId);

    if (!evidence || evidence.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    await evidence.update({ admissibilityStatus });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'rule_on_evidence',
      category: 'ruling',
      details: { evidenceId: evidence.id, admissibilityStatus }
    });

    res.json(evidence);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update evidence' });
  }
});

app.post('/meetings/:id/court/motions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { motionType, title, description } = req.body;

    const motion = await CourtMotion.create({
      meetingId: req.params.id,
      filedBy: userId,
      motionType,
      title,
      description
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'file_motion',
      category: 'participant_action',
      details: { motionId: motion.id, motionType, title }
    });

    res.status(201).json(motion);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to file motion' });
  }
});

app.get('/meetings/:id/court/motions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const motions = await CourtMotion.findAll({
      where: { meetingId: req.params.id },
      order: [['filedAt', 'ASC']]
    });

    res.json(motions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get motions' });
  }
});

app.put('/meetings/:id/court/motions/:motionId/ruling', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { ruling, rulingReason } = req.body;
    const motion = await CourtMotion.findByPk(req.params.motionId);

    if (!motion || motion.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Motion not found' });
    }

    await motion.update({
      ruling,
      rulingReason,
      ruledBy: userId,
      ruledAt: new Date()
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'rule_on_motion',
      category: 'ruling',
      details: { motionId: motion.id, ruling, rulingReason }
    });

    res.json(motion);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to rule on motion' });
  }
});

app.post('/meetings/:id/court/verdict', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { decision, reasoning, evidenceConsidered } = req.body;

    const verdict = await CourtVerdict.create({
      meetingId: req.params.id,
      judgeId: userId,
      decision,
      reasoning,
      evidenceConsidered
    });

    await MeetingAuditLog.create({
      meetingId: req.params.id,
      userId,
      action: 'render_verdict',
      category: 'ruling',
      details: { verdictId: verdict.id, decision }
    });

    res.status(201).json(verdict);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to render verdict' });
  }
});

app.get('/meetings/:id/court/verdict', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const verdict = await CourtVerdict.findOne({
      where: { meetingId: req.params.id },
      order: [['renderedAt', 'DESC']]
    });

    res.json(verdict);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get verdict' });
  }
});

// ==================== WORKSHOP MODE ====================

app.post('/meetings/:id/workshop/ideas', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, description, category } = req.body;

    const idea = await WorkshopIdea.create({
      meetingId: req.params.id,
      authorId: userId,
      title,
      description,
      category
    });

    res.status(201).json(idea);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create idea' });
  }
});

app.get('/meetings/:id/workshop/ideas', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const ideas = await WorkshopIdea.findAll({
      where: { meetingId: req.params.id },
      order: [['priorityScore', 'DESC'], ['votes', 'DESC']]
    });

    res.json(ideas);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get ideas' });
  }
});

app.post('/meetings/:id/workshop/ideas/:ideaId/vote', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const idea = await WorkshopIdea.findByPk(req.params.ideaId);

    if (!idea || idea.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    await idea.update({ votes: idea.votes + 1 });
    res.json(idea);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to vote on idea' });
  }
});

app.put('/meetings/:id/workshop/ideas/:ideaId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { status, priorityScore } = req.body;
    const idea = await WorkshopIdea.findByPk(req.params.ideaId);

    if (!idea || idea.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    await idea.update({ status, priorityScore });
    res.json(idea);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update idea' });
  }
});

// ==================== TOWN HALL MODE ====================

app.post('/meetings/:id/townhall/questions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { question } = req.body;

    const q = await TownHallQuestion.create({
      meetingId: req.params.id,
      askerId: userId,
      question
    });

    res.status(201).json(q);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit question' });
  }
});

app.get('/meetings/:id/townhall/questions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const questions = await TownHallQuestion.findAll({
      where: { meetingId: req.params.id },
      order: [['upvotes', 'DESC'], ['submittedAt', 'ASC']]
    });

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get questions' });
  }
});

app.post('/meetings/:id/townhall/questions/:questionId/upvote', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const question = await TownHallQuestion.findByPk(req.params.questionId);

    if (!question || question.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update({ upvotes: question.upvotes + 1 });
    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to upvote question' });
  }
});

app.put('/meetings/:id/townhall/questions/:questionId/answer', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { answer } = req.body;
    const question = await TownHallQuestion.findByPk(req.params.questionId);

    if (!question || question.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update({
      answered: true,
      answer,
      answeredBy: userId,
      answeredAt: new Date()
    });

    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to answer question' });
  }
});

app.post('/meetings/:id/townhall/polls', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { question, options } = req.body;

    const poll = await TownHallPoll.create({
      meetingId: req.params.id,
      createdBy: userId,
      question,
      options: options.map((opt, idx) => ({ id: idx, text: opt, votes: 0 }))
    });

    res.status(201).json(poll);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create poll' });
  }
});

app.get('/meetings/:id/townhall/polls', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const polls = await TownHallPoll.findAll({
      where: { meetingId: req.params.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(polls);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get polls' });
  }
});

app.post('/meetings/:id/townhall/polls/:pollId/vote', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { optionId } = req.body;
    const poll = await TownHallPoll.findByPk(req.params.pollId);

    if (!poll || poll.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const options = poll.options;
    const option = options.find(o => o.id === optionId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    option.votes += 1;
    await poll.update({
      options,
      totalVotes: poll.totalVotes + 1
    });

    res.json(poll);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to vote on poll' });
  }
});

// ==================== VIRTUAL CONFERENCE MODE ====================

app.post('/meetings/:id/conference/sessions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { title, description, track, speakerIds, startTime, endTime, roomId, capacity, resources } = req.body;

    const session = await ConferenceSession.create({
      meetingId: req.params.id,
      title,
      description,
      track,
      speakerIds,
      startTime,
      endTime,
      roomId,
      capacity,
      resources
    });

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create session' });
  }
});

app.get('/meetings/:id/conference/sessions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { track } = req.query;
    const where = { meetingId: req.params.id };
    if (track) where.track = track;

    const sessions = await ConferenceSession.findAll({
      where,
      order: [['startTime', 'ASC']]
    });

    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get sessions' });
  }
});

app.put('/meetings/:id/conference/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { attendeeCount, resources } = req.body;
    const session = await ConferenceSession.findByPk(req.params.sessionId);

    if (!session || session.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await session.update({ attendeeCount, resources });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update session' });
  }
});

// ==================== QUIZ MODE ====================

app.post('/meetings/:id/quiz/questions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { question, options, correctAnswer, points, timeLimit, orderIndex, category } = req.body;

    const quizQuestion = await QuizQuestion.create({
      meetingId: req.params.id,
      question,
      options,
      correctAnswer,
      points,
      timeLimit,
      orderIndex,
      category
    });

    res.status(201).json(quizQuestion);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create quiz question' });
  }
});

app.get('/meetings/:id/quiz/questions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const questions = await QuizQuestion.findAll({
      where: { meetingId: req.params.id },
      order: [['orderIndex', 'ASC']]
    });

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get quiz questions' });
  }
});

app.post('/meetings/:id/quiz/responses', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const { questionId, answer, teamId, timeToAnswer } = req.body;

    const question = await QuizQuestion.findByPk(questionId);
    if (!question || question.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isCorrect = answer === question.correctAnswer;
    const pointsEarned = isCorrect ? question.points : 0;

    const response = await QuizResponse.create({
      questionId,
      participantId: userId,
      teamId,
      answer,
      isCorrect,
      pointsEarned,
      timeToAnswer
    });

    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit response' });
  }
});

app.get('/meetings/:id/quiz/leaderboard', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);
    const questions = await QuizQuestion.findAll({
      where: { meetingId: req.params.id },
      include: [{
        model: QuizResponse,
        as: 'responses'
      }]
    });

    // Calculate participant scores
    const scores = {};
    questions.forEach(q => {
      q.responses.forEach(r => {
        if (!scores[r.participantId]) {
          scores[r.participantId] = { participantId: r.participantId, totalPoints: 0, correctAnswers: 0 };
        }
        scores[r.participantId].totalPoints += r.pointsEarned;
        if (r.isCorrect) scores[r.participantId].correctAnswers += 1;
      });
    });

    const leaderboard = Object.values(scores).sort((a, b) => b.totalPoints - a.totalPoints);
    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get leaderboard' });
  }
});

// ==================== PHASE 10: GOVERNANCE, SAFETY, AND CIVIC TOOLS ====================

// ==================== 10.1 TRUST AND SAFETY ====================

// Role Permissions - Create or Update
app.post('/meetings/:id/role-permissions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await requireMeetingAccess(req.params.id, userId);
    
    // Only host or moderator can set permissions
    const participant = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });
    
    if (!participant || !['host', 'moderator'].includes(participant.role)) {
      return res.status(403).json({ error: 'Only hosts and moderators can manage permissions' });
    }

    const { role, permissions, restrictions } = req.body;

    const [rolePermission, created] = await MeetingRolePermission.findOrCreate({
      where: { meetingId: req.params.id, role },
      defaults: { permissions, restrictions }
    });

    if (!created) {
      await rolePermission.update({ permissions, restrictions });
    }

    // Log in audit trail
    await AuditTrailEntry.create({
      meetingId: req.params.id,
      sequenceNumber: await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1,
      action: 'update_role_permissions',
      userId,
      entityType: 'role_permission',
      entityId: rolePermission.id,
      details: { role, permissions, restrictions },
      currentHash: crypto.createHash('sha256')
        .update(JSON.stringify({ role, permissions, restrictions, timestamp: new Date() }))
        .digest('hex')
    });

    res.status(created ? 201 : 200).json(rolePermission);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to manage role permissions' });
  }
});

// Get Role Permissions
app.get('/meetings/:id/role-permissions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const permissions = await MeetingRolePermission.findAll({
      where: { meetingId: req.params.id }
    });

    res.json(permissions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get role permissions' });
  }
});

// Check Permission - Utility endpoint
app.post('/meetings/:id/check-permission', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { permission } = req.body;
    const participant = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    if (!participant) {
      return res.json({ allowed: false, reason: 'Not a participant' });
    }

    const rolePermission = await MeetingRolePermission.findOne({
      where: { meetingId: req.params.id, role: participant.role }
    });

    const allowed = rolePermission && rolePermission.permissions.includes(permission);
    res.json({ allowed, role: participant.role });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to check permission' });
  }
});

// Tamper-Evident Audit Trail - Get Full Chain
app.get('/meetings/:id/audit-trail', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const trail = await AuditTrailEntry.findAll({
      where: { meetingId: req.params.id },
      order: [['sequenceNumber', 'ASC']]
    });

    // Verify integrity
    let isValid = true;
    for (let i = 1; i < trail.length; i++) {
      if (trail[i].previousHash !== trail[i - 1].currentHash) {
        isValid = false;
        break;
      }
    }

    res.json({ trail, isValid, count: trail.length });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get audit trail' });
  }
});

// Verify Audit Trail Integrity
app.get('/meetings/:id/audit-trail/verify', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const trail = await AuditTrailEntry.findAll({
      where: { meetingId: req.params.id },
      order: [['sequenceNumber', 'ASC']]
    });

    const verification = {
      totalEntries: trail.length,
      isValid: true,
      brokenChains: []
    };

    for (let i = 1; i < trail.length; i++) {
      if (trail[i].previousHash !== trail[i - 1].currentHash) {
        verification.isValid = false;
        verification.brokenChains.push({
          sequenceNumber: trail[i].sequenceNumber,
          expected: trail[i - 1].currentHash,
          actual: trail[i].previousHash
        });
      }
    }

    res.json(verification);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to verify audit trail' });
  }
});

// Content Redaction - Create
app.post('/meetings/:id/redactions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await requireMeetingAccess(req.params.id, userId);

    // Check if user has permission to redact
    const participant = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    if (!participant || !['host', 'moderator'].includes(participant.role)) {
      return res.status(403).json({ error: 'Only hosts and moderators can redact content' });
    }

    const { contentType, contentId, reason, redactionType, originalContent, redactedContent, timeRanges } = req.body;

    const redaction = await ContentRedaction.create({
      meetingId: req.params.id,
      contentType,
      contentId,
      redactedBy: userId,
      reason,
      redactionType,
      originalContent,
      redactedContent,
      timeRanges
    });

    // Log in tamper-evident trail
    const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
    const previousEntry = await AuditTrailEntry.findOne({
      where: { meetingId: req.params.id },
      order: [['sequenceNumber', 'DESC']]
    });

    await AuditTrailEntry.create({
      meetingId: req.params.id,
      sequenceNumber,
      previousHash: previousEntry?.currentHash || null,
      action: 'content_redacted',
      userId,
      entityType: 'redaction',
      entityId: redaction.id,
      details: { contentType, contentId, reason, redactionType },
      currentHash: crypto.createHash('sha256')
        .update(JSON.stringify({ sequenceNumber, contentType, contentId, userId, timestamp: new Date() }))
        .digest('hex')
    });

    res.status(201).json(redaction);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create redaction' });
  }
});

// Get Redactions
app.get('/meetings/:id/redactions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { contentType, contentId } = req.query;
    const where = { meetingId: req.params.id };
    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;

    const redactions = await ContentRedaction.findAll({
      where,
      order: [['redactedAt', 'DESC']]
    });

    res.json(redactions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get redactions' });
  }
});

// Participant Consent - Grant/Update
app.post('/meetings/:id/consent', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { consentType, granted, expiresAt } = req.body;

    const [consent, created] = await ParticipantConsent.findOrCreate({
      where: {
        meetingId: req.params.id,
        participantId: userId,
        consentType
      },
      defaults: {
        granted,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.header('user-agent')
      }
    });

    if (!created) {
      await consent.update({
        granted,
        grantedAt: new Date(),
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.header('user-agent')
      });
    }

    // Log in audit trail
    const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
    const previousEntry = await AuditTrailEntry.findOne({
      where: { meetingId: req.params.id },
      order: [['sequenceNumber', 'DESC']]
    });

    await AuditTrailEntry.create({
      meetingId: req.params.id,
      sequenceNumber,
      previousHash: previousEntry?.currentHash || null,
      action: granted ? 'consent_granted' : 'consent_revoked',
      userId,
      entityType: 'consent',
      entityId: consent.id,
      details: { consentType, granted },
      currentHash: crypto.createHash('sha256')
        .update(JSON.stringify({ sequenceNumber, consentType, granted, userId, timestamp: new Date() }))
        .digest('hex')
    });

    res.status(created ? 201 : 200).json(consent);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to manage consent' });
  }
});

// Get Consents
app.get('/meetings/:id/consent', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    // Participants can only see their own consents unless they're host/moderator
    const participant = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    const where = { meetingId: req.params.id };
    if (participant && !['host', 'moderator'].includes(participant.role)) {
      where.participantId = userId;
    }

    const consents = await ParticipantConsent.findAll({
      where,
      order: [['grantedAt', 'DESC']]
    });

    res.json(consents);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get consents' });
  }
});

// ==================== 10.2 MODERATION AND RULE SYSTEMS ====================

// Meeting Ruleset - Create
app.post('/meetings/:id/rulesets', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await requireMeetingAccess(req.params.id, userId);

    // Only host can create rulesets
    if (meeting.hostId !== userId) {
      return res.status(403).json({ error: 'Only the host can create rulesets' });
    }

    const { name, description, rules, isActive } = req.body;

    const ruleset = await MeetingRuleset.create({
      meetingId: req.params.id,
      name,
      description,
      rules,
      isActive,
      createdBy: userId
    });

    res.status(201).json(ruleset);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create ruleset' });
  }
});

// Get Rulesets
app.get('/meetings/:id/rulesets', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const rulesets = await MeetingRuleset.findAll({
      where: { meetingId: req.params.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(rulesets);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get rulesets' });
  }
});

// Update Ruleset
app.put('/meetings/:id/rulesets/:rulesetId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meeting = await requireMeetingAccess(req.params.id, userId);

    if (meeting.hostId !== userId) {
      return res.status(403).json({ error: 'Only the host can update rulesets' });
    }

    const ruleset = await MeetingRuleset.findByPk(req.params.rulesetId);
    if (!ruleset || ruleset.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Ruleset not found' });
    }

    const { name, description, rules, isActive } = req.body;
    await ruleset.update({ name, description, rules, isActive });

    res.json(ruleset);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update ruleset' });
  }
});

// Moderation Action - Issue
app.post('/meetings/:id/moderation/actions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    // Check if user is moderator or host
    const moderator = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    if (!moderator || !['host', 'moderator'].includes(moderator.role)) {
      return res.status(403).json({ error: 'Only hosts and moderators can issue moderation actions' });
    }

    const { targetUserId, actionType, reason, duration, newRole } = req.body;

    // Get target's current role
    const target = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId: targetUserId }
    });

    if (!target) {
      return res.status(404).json({ error: 'Target participant not found' });
    }

    const action = await ModerationAction.create({
      meetingId: req.params.id,
      moderatorId: userId,
      targetUserId,
      actionType,
      reason,
      duration,
      previousRole: target.role,
      newRole,
      expiresAt: duration ? new Date(Date.now() + duration * 1000) : null
    });

    // Apply the action
    if (actionType === 'role_change' && newRole) {
      await target.update({ role: newRole });
    }

    // Log in audit trail
    const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
    const previousEntry = await AuditTrailEntry.findOne({
      where: { meetingId: req.params.id },
      order: [['sequenceNumber', 'DESC']]
    });

    await AuditTrailEntry.create({
      meetingId: req.params.id,
      sequenceNumber,
      previousHash: previousEntry?.currentHash || null,
      action: 'moderation_action',
      userId,
      entityType: 'moderation_action',
      entityId: action.id,
      details: { actionType, targetUserId, reason },
      currentHash: crypto.createHash('sha256')
        .update(JSON.stringify({ sequenceNumber, actionType, targetUserId, userId, timestamp: new Date() }))
        .digest('hex')
    });

    // Emit real-time event via Socket.IO if connected
    io.to(req.params.id).emit('moderation-action', action);

    res.status(201).json(action);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to issue moderation action' });
  }
});

// Get Moderation Actions
app.get('/meetings/:id/moderation/actions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const actions = await ModerationAction.findAll({
      where: { meetingId: req.params.id },
      order: [['issuedAt', 'DESC']]
    });

    res.json(actions);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get moderation actions' });
  }
});

// Dispute Flag - Create
app.post('/meetings/:id/disputes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { targetType, targetId, reason, description } = req.body;

    const dispute = await DisputeFlag.create({
      meetingId: req.params.id,
      reportedBy: userId,
      targetType,
      targetId,
      reason,
      description
    });

    // Notify moderators
    io.to(req.params.id).emit('dispute-flagged', dispute);

    res.status(201).json(dispute);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create dispute flag' });
  }
});

// Get Disputes
app.get('/meetings/:id/disputes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { status } = req.query;
    const where = { meetingId: req.params.id };
    if (status) where.status = status;

    const disputes = await DisputeFlag.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(disputes);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get disputes' });
  }
});

// Resolve Dispute
app.put('/meetings/:id/disputes/:disputeId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    // Check if user is moderator or host
    const moderator = await MeetingParticipant.findOne({
      where: { meetingId: req.params.id, userId }
    });

    if (!moderator || !['host', 'moderator'].includes(moderator.role)) {
      return res.status(403).json({ error: 'Only hosts and moderators can resolve disputes' });
    }

    const dispute = await DisputeFlag.findByPk(req.params.disputeId);
    if (!dispute || dispute.meetingId !== req.params.id) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const { status, resolution } = req.body;

    await dispute.update({
      status,
      resolution,
      reviewedBy: userId,
      resolvedAt: new Date()
    });

    res.json(dispute);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to resolve dispute' });
  }
});

// ==================== 10.3 CIVIC AND LEGAL TEMPLATES ====================

// Meeting Template - Create
app.post('/meeting-templates', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, category, description, mode, roleDefinitions, rulesetTemplate, agendaTemplate, documentTemplates, isPublic, organizationId } = req.body;

    const template = await MeetingTemplate.create({
      name,
      category,
      description,
      mode,
      roleDefinitions,
      rulesetTemplate,
      agendaTemplate,
      documentTemplates,
      isPublic,
      createdBy: userId,
      organizationId
    });

    res.status(201).json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meeting template' });
  }
});

// Get Meeting Templates
app.get('/meeting-templates', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, mode } = req.query;
    const where = {
      [Op.or]: [
        { isPublic: true },
        { createdBy: userId }
      ]
    };

    if (category) where.category = category;
    if (mode) where.mode = mode;

    const templates = await MeetingTemplate.findAll({
      where,
      order: [['usageCount', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get meeting templates' });
  }
});

// Get Single Template
app.get('/meeting-templates/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const template = await MeetingTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check access
    if (!template.isPublic && template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment usage count
    await template.increment('usageCount');

    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create Meeting from Template
app.post('/meetings/from-template/:templateId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const template = await MeetingTemplate.findByPk(req.params.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!template.isPublic && template.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, scheduledAt, durationMinutes } = req.body;

    // Create meeting
    const meeting = await Meeting.create({
      title,
      description: template.description,
      mode: template.mode,
      scheduledAt,
      durationMinutes,
      hostId: userId,
      accessCode: generateAccessCode(),
      settings: { templateId: template.id }
    });

    // Create host participant
    await MeetingParticipant.create({
      meetingId: meeting.id,
      userId,
      role: 'host'
    });

    // Apply role permissions from template
    for (const [role, perms] of Object.entries(template.roleDefinitions)) {
      await MeetingRolePermission.create({
        meetingId: meeting.id,
        role,
        permissions: perms.permissions || [],
        restrictions: perms.restrictions || {}
      });
    }

    // Apply ruleset if exists
    if (template.rulesetTemplate) {
      await MeetingRuleset.create({
        meetingId: meeting.id,
        name: `${template.name} Rules`,
        rules: template.rulesetTemplate,
        isActive: true,
        createdBy: userId
      });
    }

    // Create agenda items if exists
    if (template.agendaTemplate && Array.isArray(template.agendaTemplate)) {
      for (let i = 0; i < template.agendaTemplate.length; i++) {
        const item = template.agendaTemplate[i];
        await MeetingAgendaItem.create({
          meetingId: meeting.id,
          title: item.title,
          description: item.description,
          orderIndex: i
        });
      }
    }

    await template.increment('usageCount');

    res.status(201).json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meeting from template' });
  }
});

// Ruling Template - Create
app.post('/ruling-templates', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, templateType, category, structure, legalStandards, isStandard } = req.body;

    const template = await RulingTemplate.create({
      name,
      templateType,
      category,
      structure,
      legalStandards,
      isStandard,
      createdBy: userId
    });

    res.status(201).json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ruling template' });
  }
});

// Get Ruling Templates
app.get('/ruling-templates', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { templateType, category } = req.query;
    const where = {};
    if (templateType) where.templateType = templateType;
    if (category) where.category = category;

    const templates = await RulingTemplate.findAll({
      where,
      order: [['isStandard', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get ruling templates' });
  }
});

// Compliance Export - Request
app.post('/meetings/:id/compliance-export', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const { exportType, format, includeRedactions, includeAuditTrail } = req.body;

    const exportRecord = await ComplianceExport.create({
      meetingId: req.params.id,
      exportType: exportType || 'full',
      format: format || 'bundle',
      requestedBy: userId,
      includeRedactions: includeRedactions !== false,
      includeAuditTrail: includeAuditTrail !== false,
      status: 'pending'
    });

    // In a real implementation, this would trigger an async job
    // For now, simulate processing
    setTimeout(async () => {
      try {
        await exportRecord.update({
          status: 'completed',
          fileUrl: `/exports/${exportRecord.id}.${format === 'pdf' ? 'pdf' : 'zip'}`,
          fileSize: Math.floor(Math.random() * 10000000),
          completedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to complete export:', error);
      }
    }, 100);

    res.status(201).json(exportRecord);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to request compliance export' });
  }
});

// Get Compliance Exports
app.get('/meetings/:id/compliance-exports', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await requireMeetingAccess(req.params.id, userId);

    const exports = await ComplianceExport.findAll({
      where: { meetingId: req.params.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(exports);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get compliance exports' });
  }
});

// Get Single Export Status
app.get('/compliance-exports/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exportRecord = await ComplianceExport.findByPk(req.params.id);
    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    // Check access
    await requireMeetingAccess(exportRecord.meetingId, userId);

    res.json(exportRecord);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to get export' });
  }
});

// Create document
app.post('/documents', async (req, res) => {
  try {
    const { title, content, ownerId, type, visibility, collaborators, tags } = req.body;

    const doc = await Document.create({
      title,
      content,
      ownerId,
      type,
      visibility,
      collaborators,
      tags
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get user documents
app.get('/documents/:userId', async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: {
        [Op.or]: [
          { ownerId: req.params.userId },
          { collaborators: { [Op.contains]: [req.params.userId] } }
        ]
      },
      order: [['updatedAt', 'DESC']]
    });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Update document
app.put('/documents/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    // Phase 2: Save version history before updating
    const contentHash = crypto.createHash('md5').update(doc.content || '').digest('hex');
    await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: doc.version,
      title: doc.title,
      content: doc.content,
      changedBy: userId,
      changeDescription: req.body.changeDescription || 'Document updated',
      contentHash
    });

    // Update document - whitelist allowed fields
    const { title, content, visibility, collaborators, tags, changeDescription } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (collaborators !== undefined) updateData.collaborators = collaborators;
    if (tags !== undefined) updateData.tags = tags;

    await doc.update(updateData);
    await doc.increment('version');
    await doc.reload();

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Create wiki page
app.post('/wiki', async (req, res) => {
  try {
    const { title, slug, content, ownerId, parentId, visibility } = req.body;

    const page = await Wiki.create({
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      content,
      ownerId,
      parentId,
      visibility
    });

    res.status(201).json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page' });
  }
});

// Create task
app.post('/tasks', async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks
app.get('/tasks', async (req, res) => {
  try {
    const { projectId, assigneeId, status } = req.query;
    const where = {};

    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    const tasks = await Task.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update task (for board movement)
app.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update(req.body);
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ========== GITHUB-INSPIRED: ISSUES ==========

// Create issue
app.post('/issues', async (req, res) => {
  try {
    const { projectId, title, description, assigneeId, labels, milestone } = req.body;

    // Get authenticated user ID from header set by gateway
    const creatorId = req.header('x-user-id');
    if (!creatorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const issue = await Issue.create({
      projectId,
      title,
      description,
      creatorId,
      assigneeId,
      labels,
      milestone
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// Get issues
app.get('/issues', async (req, res) => {
  try {
    const { projectId, status, assigneeId, label } = req.query;
    const where = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (label) where.labels = { [Op.contains]: [label] };

    const issues = await Issue.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get single issue
app.get('/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id, {
      include: [{ model: IssueComment }],
      order: [[IssueComment, 'createdAt', 'ASC']]
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

// Update issue
app.put('/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await issue.update(req.body);
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Close issue
app.post('/issues/:id/close', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await issue.update({ status: 'closed' });
    res.json({ message: 'Issue closed', issue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to close issue' });
  }
});

// Add comment to issue
app.post('/issues/:issueId/comments', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const { issueId } = req.params;

    const comment = await IssueComment.create({
      issueId,
      userId,
      content
    });

    await Issue.increment('comments', { where: { id: issueId } });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ========== GITHUB-INSPIRED: PROJECTS ==========

// Create project
app.post('/projects', async (req, res) => {
  try {
    const { name, description, ownerId, visibility, members } = req.body;

    const project = await Project.create({
      name,
      description,
      ownerId,
      visibility,
      members
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get projects
app.get('/projects', async (req, res) => {
  try {
    const { ownerId, visibility } = req.query;
    const where = {};

    if (ownerId) where.ownerId = ownerId;
    if (visibility) where.visibility = visibility;

    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with issues and tasks
app.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: Issue },
        { model: Task }
      ],
      order: [
        [Issue, 'createdAt', 'DESC'],
        [Task, 'createdAt', 'DESC']
      ]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update project
app.put('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.update(req.body);
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ========== MILESTONE ENDPOINTS (GitHub-inspired) ==========

// Create a milestone
app.post('/milestones', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId, title, description, dueDate } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId and title are required' });
    }

    // Verify project exists and user has access
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const milestone = await Milestone.create({
      projectId,
      title,
      description,
      dueDate
    });

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// Get all milestones for a project
app.get('/projects/:projectId/milestones', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where = { projectId };
    if (status) {
      where.status = status;
    }

    const milestones = await Milestone.findAll({
      where,
      order: [['dueDate', 'ASC']],
      include: [{
        model: Issue,
        attributes: ['id', 'title', 'status']
      }]
    });

    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Get a single milestone with details
app.get('/milestones/:id', async (req, res) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: [{
        model: Issue,
        include: [{ model: IssueComment }]
      }]
    });

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
});

// Update a milestone
app.put('/milestones/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const milestone = await Milestone.findByPk(req.params.id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Verify user has access to the project
    const project = await Project.findByPk(milestone.projectId);
    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await milestone.update(req.body);
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Delete a milestone
app.delete('/milestones/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const milestone = await Milestone.findByPk(req.params.id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Verify user has access to the project
    const project = await Project.findByPk(milestone.projectId);
    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove milestone from issues
    await Issue.update(
      { milestoneId: null },
      { where: { milestoneId: milestone.id } }
    );

    await milestone.destroy();
    res.json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// Assign issue to milestone
app.post('/issues/:issueId/milestone', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { issueId } = req.params;
    const { milestoneId } = req.body;

    const issue = await Issue.findByPk(issueId);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Authorize user on the issue's project
    const project = await Project.findByPk(issue.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Handle removing old milestone
    if (issue.milestoneId) {
      const oldMilestone = await Milestone.findByPk(issue.milestoneId);
      if (oldMilestone) {
        await oldMilestone.decrement('totalIssues');
        if (issue.status === 'closed') {
          await oldMilestone.decrement('completedIssues');
        }
      }
    }

    // Verify and assign new milestone
    if (milestoneId) {
      const milestone = await Milestone.findByPk(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      if (milestone.projectId !== issue.projectId) {
        return res.status(400).json({ error: 'Milestone does not belong to the same project as the issue' });
      }

      await milestone.increment('totalIssues');
      if (issue.status === 'closed') {
        await milestone.increment('completedIssues');
      }
    }

    await issue.update({ milestoneId });
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign milestone' });
  }
});

// ========== PHASE 2: DOCUMENT VERSION HISTORY ==========

// Get document version history
app.get('/documents/:id/versions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.visibility === 'private' && doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to view this document' });
    }

    const versions = await DocumentVersion.findAll({
      where: { documentId: req.params.id },
      order: [['versionNumber', 'DESC']],
      attributes: ['id', 'versionNumber', 'title', 'changedBy', 'changeDescription', 'createdAt']
    });

    res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
  }
});

// Get specific document version
app.get('/documents/:id/versions/:versionNumber', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.visibility === 'private' && doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to view this document' });
    }

    const version = await DocumentVersion.findOne({
      where: {
        documentId: req.params.id,
        versionNumber: req.params.versionNumber
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document version' });
  }
});

// Restore document to a previous version
app.post('/documents/:id/versions/:versionNumber/restore', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission - only owner or collaborators
    if (doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    const version = await DocumentVersion.findOne({
      where: {
        documentId: req.params.id,
        versionNumber: req.params.versionNumber
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Save current version before restoring
    const contentHash = crypto.createHash('md5').update(doc.content || '').digest('hex');
    await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: doc.version,
      title: doc.title,
      content: doc.content,
      changedBy: userId,
      changeDescription: `Restored to version ${req.params.versionNumber}`,
      contentHash
    });

    // Restore from version
    await doc.update({
      title: version.title,
      content: version.content
    });
    await doc.increment('version');
    await doc.reload();

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore document version' });
  }
});

// ========== PHASE 2: WIKI ENHANCEMENTS ==========

// Update wiki page (with history tracking)
app.put('/wiki/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.visibility === 'private' && wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    // Phase 2: Save edit history before updating
    const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
    await WikiHistory.create({
      wikiId: wiki.id,
      title: wiki.title,
      content: wiki.content,
      editedBy: userId,
      editSummary: req.body.editSummary || 'Wiki page updated',
      contentHash
    });

    // Update wiki - whitelist allowed fields
    const { title, content, visibility, contributors, editSummary } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (contributors !== undefined) updateData.contributors = contributors;

    // Update slug if title changed
    if (title && title !== wiki.title) {
      updateData.slug = title.toLowerCase().replace(/\s+/g, '-');
    }

    await wiki.update(updateData);
    await wiki.reload();

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update wiki page' });
  }
});

// Get wiki page edit history
app.get('/wiki/:id/history', async (req, res) => {
  try {
    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Public wikis can be viewed by anyone, private need auth
    if (wiki.visibility === 'private') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to view this wiki page' });
      }
    }

    const history = await WikiHistory.findAll({
      where: { wikiId: req.params.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'editedBy', 'editSummary', 'createdAt']
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki history' });
  }
});

// Get specific wiki revision
app.get('/wiki/:id/history/:historyId', async (req, res) => {
  try {
    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission for private wikis
    if (wiki.visibility === 'private') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to view this wiki page' });
      }
    }

    const revision = await WikiHistory.findByPk(req.params.historyId);
    if (!revision || revision.wikiId !== req.params.id) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    res.json(revision);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki revision' });
  }
});

// Restore wiki to a previous revision
app.post('/wiki/:id/history/:historyId/restore', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    const revision = await WikiHistory.findByPk(req.params.historyId);
    if (!revision || revision.wikiId !== req.params.id) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    // Save current state before restoring
    const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
    await WikiHistory.create({
      wikiId: wiki.id,
      title: wiki.title,
      content: wiki.content,
      editedBy: userId,
      editSummary: `Restored to revision from ${revision.createdAt}`,
      contentHash
    });

    // Restore from revision
    await wiki.update({
      title: revision.title,
      content: revision.content
    });
    await wiki.reload();

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore wiki revision' });
  }
});

// Add wiki categories/tags
app.post('/wiki/:id/categories', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories must be an array' });
    }

    // Add categories field to wiki if not exists
    await wiki.update({
      categories: categories
    });

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add categories' });
  }
});

// Get wikis by category
app.get('/wiki/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    // Only return public wikis for category browsing
    const wikis = await Wiki.findAll({
      where: {
        visibility: 'public',
        categories: {
          [Op.contains]: [category]
        }
      },
      attributes: ['id', 'title', 'slug', 'ownerId', 'categories', 'createdAt', 'updatedAt']
    });

    res.json(wikis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wikis by category' });
  }
});

// ==================== WIKI DIFF COMPARISON ====================
const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

// Wiki Diff Model
const WikiDiff = sequelize.define('WikiDiff', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wikiId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fromVersionId: DataTypes.UUID,
  toVersionId: DataTypes.UUID,
  diff: DataTypes.TEXT, // Serialized diff format
  stats: DataTypes.JSONB // { additions, deletions, changes }
});

// Get diff between two wiki versions
app.get('/wikis/:wikiId/diff', async (req, res) => {
  try {
    const { wikiId } = req.params;
    const { from, to } = req.query;

    const wiki = await Wiki.findByPk(wikiId);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki not found' });
    }

    // Get version contents
    let fromContent = '';
    let toContent = '';

    if (from) {
      const fromHistory = await WikiHistory.findByPk(from);
      fromContent = fromHistory?.content || '';
    } else {
      fromContent = wiki.content || '';
    }

    if (to) {
      const toHistory = await WikiHistory.findByPk(to);
      toContent = toHistory?.content || '';
    } else {
      toContent = wiki.content || '';
    }

    // Compute diff
    const diffs = dmp.diff_main(fromContent, toContent);
    dmp.diff_cleanupSemantic(diffs);

    // Calculate statistics
    let additions = 0,
      deletions = 0;
    diffs.forEach(([type, text]) => {
      if (type === 1) additions += text.length;
      if (type === -1) deletions += text.length;
    });

    res.json({
      wikiId,
      diffs,
      stats: {
        additions,
        deletions,
        changes: additions + deletions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute diff' });
  }
});

// Get patch format of diff (for applying changes)
app.get('/wikis/:wikiId/patch', async (req, res) => {
  try {
    const { wikiId } = req.params;
    const { from, to } = req.query;

    const wiki = await Wiki.findByPk(wikiId);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki not found' });
    }

    let fromContent = wiki.content || '';
    if (from) {
      const history = await WikiHistory.findByPk(from);
      fromContent = history?.content || '';
    }

    const toContent = wiki.content || '';

    // Compute diff and create patch
    const diffs = dmp.diff_main(fromContent, toContent);
    dmp.diff_cleanupSemantic(diffs);
    const patches = dmp.patch_make(fromContent, diffs);
    const patchText = dmp.patch_toText(patches);

    res.json({
      wikiId,
      patch: patchText,
      appliedTo: from ? 'specific_version' : 'current'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate patch' });
  }
});

// ==================== DOCUMENT FOLDER HIERARCHY ====================

// Update Document model with parent folder support
const DocumentFolder = sequelize.define('DocumentFolder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentId: DataTypes.UUID, // Reference to parent folder
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Create folder
app.post('/folders', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, parentId, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name required' });
    }

    const folder = await DocumentFolder.create({
      ownerId: userId,
      parentId: parentId || null,
      name,
      description,
      isPublic: isPublic || false
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folder contents (documents and subfolders)
app.get('/folders/:folderId/contents', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.header('x-user-id');

    const folder = await DocumentFolder.findByPk(folderId, {
      where: {
        [Op.or]: [
          { ownerId: userId },
          { isPublic: true }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get subfolders
    const subfolders = await DocumentFolder.findAll({
      where: { parentId: folderId }
    });

    // Get documents in folder
    const documents = await Document.findAll({
      where: { parentFolderId: folderId }
    });

    res.json({
      folder,
      subfolders,
      documents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folder contents' });
  }
});

// Get folder tree (recursive)
app.get('/folders/tree/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.header('x-user-id');

    async function buildFolderTree(parentId) {
      const folders = await DocumentFolder.findAll({
        where: { parentId }
      });

      const tree = [];
      for (const folder of folders) {
        tree.push({
          ...folder.toJSON(),
          children: await buildFolderTree(folder.id)
        });
      }
      return tree;
    }

    const treeData = await buildFolderTree(folderId);
    res.json({ tree: treeData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folder tree' });
  }
});

// Get folders (root level or by parent)
app.get('/folders', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    const { parentId } = req.query;

    const where = {
      [Op.or]: [
        { ownerId: userId },
        { isPublic: true }
      ]
    };

    // If parentId is provided, filter by it (null for root level)
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' || parentId === null ? null : parentId;
    }

    const folders = await DocumentFolder.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Update folder
app.put('/folders/:folderId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { folderId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'description', 'isPublic'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const folder = await DocumentFolder.findByPk(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Only owner can update
    if (folder.ownerId !== userId) {
      return res.status(403).json({ error: 'Only folder owner can update' });
    }

    await folder.update(updates);
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
app.delete('/folders/:folderId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { folderId } = req.params;

    const folder = await DocumentFolder.findByPk(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Only owner can delete
    if (folder.ownerId !== userId) {
      return res.status(403).json({ error: 'Only folder owner can delete' });
    }

    // Check if folder has contents
    const subfolders = await DocumentFolder.count({ where: { parentId: folderId } });
    const documents = await Document.count({ where: { parentFolderId: folderId } });

    if (subfolders > 0 || documents > 0) {
      return res.status(400).json({
        error: 'Cannot delete folder: folder must be empty before deletion',
        details: `This folder contains ${subfolders} subfolder(s) and ${documents} document(s)`,
        subfolders,
        documents,
        suggestion: 'Please remove all contents before deleting this folder'
      });
    }

    await folder.destroy();
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// ==================== NOTION DATABASE VIEWS ====================

// Database View Model
const DatabaseView = sequelize.define('DatabaseView', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentId: DataTypes.UUID, // Reference to parent document (database)
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  viewType: {
    type: DataTypes.ENUM('table', 'gallery', 'list', 'board'),
    defaultValue: 'table'
  },
  filters: DataTypes.JSONB, // Filter conditions
  sorts: DataTypes.JSONB, // Sort configurations
  properties: DataTypes.JSONB, // Visible properties/columns
  groupBy: DataTypes.STRING // Property to group by (for board/list views)
});

// Database Property Model (for typed properties)
const DatabaseProperty = sequelize.define('DatabaseProperty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  databaseId: DataTypes.UUID,
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url', 'email'),
    defaultValue: 'text'
  },
  options: DataTypes.JSONB // For select/multiselect types
});

// Create a database view
app.post('/databases/:dbId/views', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dbId } = req.params;
    const { name, viewType, filters, sorts, properties, groupBy } = req.body;

    // Verify database (document) exists and user has access
    const doc = await Document.findOne({
      where: { id: dbId, ownerId: userId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const view = await DatabaseView.create({
      parentId: dbId,
      name: name || `${viewType} View`,
      viewType: viewType || 'table',
      filters: filters || {},
      sorts: sorts || {},
      properties: properties || {},
      groupBy: groupBy || null
    });

    res.status(201).json(view);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create database view' });
  }
});

// Get database views
app.get('/databases/:dbId/views', async (req, res) => {
  try {
    const { dbId } = req.params;

    const views = await DatabaseView.findAll({
      where: { parentId: dbId }
    });

    res.json(views);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

// Update database view
app.put('/databases/views/:viewId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { viewId } = req.params;
    const { name, viewType, filters, sorts, properties, groupBy } = req.body;

    const view = await DatabaseView.findByPk(viewId);
    if (!view) {
      return res.status(404).json({ error: 'View not found' });
    }

    // Verify ownership
    const doc = await Document.findOne({
      where: { id: view.parentId, ownerId: userId }
    });
    if (!doc) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await view.update({
      name: name || view.name,
      viewType: viewType || view.viewType,
      filters: filters !== undefined ? filters : view.filters,
      sorts: sorts !== undefined ? sorts : view.sorts,
      properties: properties !== undefined ? properties : view.properties,
      groupBy: groupBy !== undefined ? groupBy : view.groupBy
    });

    res.json(view);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update view' });
  }
});

// Create database property
app.post('/databases/:dbId/properties', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dbId } = req.params;
    const { name, type, options } = req.body;

    // Verify ownership
    const doc = await Document.findOne({
      where: { id: dbId, ownerId: userId }
    });
    if (!doc) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const property = await DatabaseProperty.create({
      databaseId: dbId,
      name,
      type: type || 'text',
      options: options || {}
    });

    res.status(201).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Get database properties
app.get('/databases/:dbId/properties', async (req, res) => {
  try {
    const { dbId } = req.params;

    const properties = await DatabaseProperty.findAll({
      where: { databaseId: dbId }
    });

    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// ==================== BASIC WEBRTC SIGNALING ====================

// WebRTC Call Model
const WebRTCCall = sequelize.define('WebRTCCall', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('audio', 'video'),
    defaultValue: 'video'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'missed', 'ended'),
    defaultValue: 'pending'
  },
  offer: DataTypes.TEXT, // WebRTC offer (JSON stringified)
  answer: DataTypes.TEXT, // WebRTC answer (JSON stringified)
  duration: DataTypes.INTEGER // Call duration in seconds
});

// Initiate WebRTC call
app.post('/calls/initiate', async (req, res) => {
  try {
    const callerId = req.header('x-user-id');
    if (!callerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId, type, offer } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID required' });
    }

    const call = await WebRTCCall.create({
      callerId,
      recipientId,
      type: type || 'video',
      offer: typeof offer === 'string' ? offer : JSON.stringify(offer),
      status: 'pending'
    });

    // Emit socket event to notify recipient
    // io.to(recipientId).emit('incomingCall', { call });

    res.status(201).json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Accept WebRTC call
app.post('/calls/:callId/accept', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { answer } = req.body;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.recipientId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await call.update({
      status: 'accepted',
      answer: typeof answer === 'string' ? answer : JSON.stringify(answer)
    });

    // Emit socket event to notify caller
    // io.to(call.callerId).emit('callAccepted', { call });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept call' });
  }
});

// Reject WebRTC call
app.post('/calls/:callId/reject', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.recipientId !== userId && call.callerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await call.update({ status: 'rejected' });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject call' });
  }
});

// End WebRTC call
app.post('/calls/:callId/end', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { duration } = req.body;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    await call.update({
      status: 'ended',
      duration: duration || 0
    });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call history
app.get('/calls/history', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const calls = await WebRTCCall.findAll({
      where: {
        [Op.or]: [{ callerId: userId }, { recipientId: userId }]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(calls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Get ICE candidates (placeholder for STUN/TURN servers)
app.get('/webrtc/ice-servers', (req, res) => {
  try {
    res.json({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
        {
          urls: [process.env.TURN_SERVER || 'turn:your-turn-server.com:3478'],
          username: process.env.TURN_USERNAME || 'user',
          credential: process.env.TURN_PASSWORD || 'pass'
        }
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
});

// ============================================================================
// Phase 6: Collaborative Editing API Endpoints (Originally deferred, now implemented)
// ============================================================================

// Create or join a collaborative session
app.post('/collaborative/sessions', async (req, res) => {
  try {
    const { documentId, documentType, userId } = req.body;

    if (!documentId || !userId) {
      return res.status(400).json({ error: 'documentId and userId are required' });
    }

    // Check if session already exists
    let session = await CollaborativeSession.findOne({ where: { documentId } });

    if (session) {
      // Add user to active users if not already present
      if (!session.activeUsers.includes(userId)) {
        session.activeUsers = [...session.activeUsers, userId];
        session.lastActivity = new Date();
        await session.save();
      }
    } else {
      // Create new session
      session = await CollaborativeSession.create({
        documentId,
        documentType: documentType || 'document',
        activeUsers: [userId]
      });
    }

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create/join session' });
  }
});

// Get collaborative session
app.get('/collaborative/sessions/:documentId', async (req, res) => {
  try {
    const session = await CollaborativeSession.findOne({
      where: { documentId: req.params.documentId },
      include: [
        { model: UserPresence, as: 'presences' },
        {
          model: CollaborativeOperation,
          as: 'operations',
          limit: 100,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Leave collaborative session
app.delete('/collaborative/sessions/:documentId/users/:userId', async (req, res) => {
  try {
    const { documentId, userId } = req.params;

    const session = await CollaborativeSession.findOne({ where: { documentId } });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.activeUsers = session.activeUsers.filter(id => id !== userId);
    await session.save();

    // Remove user presence
    await UserPresence.destroy({
      where: { sessionId: session.id, userId }
    });

    // If no active users, optionally delete the session
    if (session.activeUsers.length === 0) {
      await session.destroy();
    }

    res.json({ message: 'Left session successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

// Get operations for a session
app.get('/collaborative/sessions/:documentId/operations', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fromRevision, limit = 100 } = req.query;

    const session = await CollaborativeSession.findOne({ where: { documentId } });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const whereClause = { sessionId: session.id };
    if (fromRevision) {
      whereClause.baseRevision = { [Op.gte]: parseInt(fromRevision) };
    }

    const operations = await CollaborativeOperation.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({ operations, currentRevision: session.operationCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

// Get active users in a session
app.get('/collaborative/sessions/:documentId/users', async (req, res) => {
  try {
    const { documentId } = req.params;

    const session = await CollaborativeSession.findOne({
      where: { documentId },
      include: [{ model: UserPresence, as: 'presences' }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found', activeUsers: [] });
    }

    res.json({
      activeUsers: session.activeUsers,
      presences: session.presences
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

// Update user cursor position
app.put('/collaborative/sessions/:documentId/cursor', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, cursorPosition, selectionStart, selectionEnd, color } = req.body;

    const session = await CollaborativeSession.findOne({ where: { documentId } });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let presence = await UserPresence.findOne({
      where: { sessionId: session.id, userId }
    });

    if (presence) {
      presence.cursorPosition = cursorPosition;
      presence.selectionStart = selectionStart;
      presence.selectionEnd = selectionEnd;
      presence.lastSeen = new Date();
      if (color) presence.color = color;
      await presence.save();
    } else {
      presence = await UserPresence.create({
        sessionId: session.id,
        userId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        color: color || `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      });
    }

    res.json(presence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update cursor' });
  }
});

// ============================================================================
// WebSocket Handlers for Real-time Collaboration
// ============================================================================

// Store active connections by document ID
const documentSockets = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a collaborative document session
  socket.on('join-document', async (data) => {
    try {
      const { documentId, userId, userName } = data;

      if (!documentId || !userId) {
        socket.emit('error', { message: 'documentId and userId are required' });
        return;
      }

      // Join the room for this document
      socket.join(documentId);

      // Store socket connection
      if (!documentSockets.has(documentId)) {
        documentSockets.set(documentId, new Set());
      }
      documentSockets.get(documentId).add(socket.id);

      // Update session in database
      let session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        session = await CollaborativeSession.create({
          documentId,
          activeUsers: [userId]
        });
      } else if (!session.activeUsers.includes(userId)) {
        session.activeUsers = [...session.activeUsers, userId];
        await session.save();
      }

      // Create user presence
      const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
      await UserPresence.create({
        sessionId: session.id,
        userId,
        color,
        cursorPosition: 0
      });

      // Notify other users
      socket.to(documentId).emit('user-joined', {
        userId,
        userName,
        color,
        timestamp: new Date()
      });

      // Send current session state to the new user
      const presences = await UserPresence.findAll({
        where: { sessionId: session.id }
      });

      socket.emit('session-joined', {
        sessionId: session.id,
        activeUsers: session.activeUsers,
        presences,
        currentRevision: session.operationCount
      });

      console.log(`User ${userId} joined document ${documentId}`);
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Handle operational transformation operations
  socket.on('operation', async (data) => {
    try {
      const { documentId, userId, operation, baseRevision } = data;

      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Simple conflict resolution: apply operation and increment revision
      const appliedRevision = session.operationCount + 1;

      // Store the operation
      await CollaborativeOperation.create({
        sessionId: session.id,
        userId,
        operationType: operation.type,
        position: operation.position,
        content: operation.content,
        length: operation.length,
        attributes: operation.attributes,
        baseRevision,
        appliedRevision
      });

      // Update session
      session.operationCount = appliedRevision;
      session.lastActivity = new Date();
      await session.save();

      // Broadcast operation to all other users in the room
      socket.to(documentId).emit('operation', {
        userId,
        operation,
        revision: appliedRevision,
        timestamp: new Date()
      });

      // Acknowledge to sender
      socket.emit('operation-ack', {
        revision: appliedRevision,
        baseRevision
      });
    } catch (error) {
      console.error('Error processing operation:', error);
      socket.emit('error', { message: 'Failed to process operation' });
    }
  });

  // Handle cursor position updates
  socket.on('cursor-update', async (data) => {
    try {
      const { documentId, userId, cursorPosition, selectionStart, selectionEnd } = data;

      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        return;
      }

      // Update presence
      await UserPresence.update(
        {
          cursorPosition,
          selectionStart,
          selectionEnd,
          lastSeen: new Date()
        },
        {
          where: { sessionId: session.id, userId }
        }
      );

      // Broadcast cursor update to other users
      socket.to(documentId).emit('cursor-update', {
        userId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  });

  // Handle user leaving document
  socket.on('leave-document', async (data) => {
    try {
      const { documentId, userId } = data;

      // Leave the room
      socket.leave(documentId);

      // Remove from socket map
      if (documentSockets.has(documentId)) {
        documentSockets.get(documentId).delete(socket.id);
        if (documentSockets.get(documentId).size === 0) {
          documentSockets.delete(documentId);
        }
      }

      // Update session
      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (session) {
        session.activeUsers = session.activeUsers.filter(id => id !== userId);
        await session.save();

        // Remove presence
        await UserPresence.destroy({
          where: { sessionId: session.id, userId }
        });

        // Notify other users
        socket.to(documentId).emit('user-left', {
          userId,
          timestamp: new Date()
        });

        // Clean up empty sessions
        if (session.activeUsers.length === 0) {
          await session.destroy();
        }
      }

      console.log(`User ${userId} left document ${documentId}`);
    } catch (error) {
      console.error('Error leaving document:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    // Clean up all document connections for this socket
    for (const [documentId, sockets] of documentSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          documentSockets.delete(documentId);
        }

        // Notify others in the room
        socket.to(documentId).emit('user-disconnected', {
          socketId: socket.id,
          timestamp: new Date()
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Collaboration service running on port ${PORT}`);
});
