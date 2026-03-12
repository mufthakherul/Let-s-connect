'use strict';
const { DataTypes } = require('sequelize');

function initModels(sequelize) {
  const Document = sequelize.define('Document', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: DataTypes.TEXT,
    ownerId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('doc', 'wiki', 'note', 'kanban'), defaultValue: 'doc' },
    visibility: { type: DataTypes.ENUM('public', 'private', 'shared'), defaultValue: 'private' },
    collaborators: DataTypes.ARRAY(DataTypes.UUID),
    tags: DataTypes.ARRAY(DataTypes.STRING),
    version: { type: DataTypes.INTEGER, defaultValue: 1 }
  });

  const Wiki = sequelize.define('Wiki', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    content: DataTypes.TEXT,
    ownerId: { type: DataTypes.UUID, allowNull: false },
    parentId: DataTypes.UUID,
    visibility: { type: DataTypes.ENUM('public', 'private'), defaultValue: 'public' },
    contributors: DataTypes.ARRAY(DataTypes.UUID),
    categories: DataTypes.ARRAY(DataTypes.STRING)
  });

  const Task = sequelize.define('Task', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    assigneeId: DataTypes.UUID,
    status: { type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'), defaultValue: 'todo' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
    dueDate: DataTypes.DATE,
    projectId: DataTypes.UUID
  });

  const Issue = sequelize.define('Issue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    projectId: DataTypes.UUID,
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    creatorId: { type: DataTypes.UUID, allowNull: false },
    assigneeId: DataTypes.UUID,
    milestoneId: DataTypes.UUID,
    status: { type: DataTypes.ENUM('open', 'in_progress', 'closed'), defaultValue: 'open' },
    labels: DataTypes.ARRAY(DataTypes.STRING),
    milestone: DataTypes.STRING,
    comments: { type: DataTypes.INTEGER, defaultValue: 0 }
  });

  const IssueComment = sequelize.define('IssueComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    issueId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false }
  });

  const Project = sequelize.define('Project', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    ownerId: { type: DataTypes.UUID, allowNull: false },
    visibility: { type: DataTypes.ENUM('public', 'private'), defaultValue: 'private' },
    members: DataTypes.ARRAY(DataTypes.UUID)
  });

  const Milestone = sequelize.define('Milestone', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    projectId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    dueDate: DataTypes.DATE,
    status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open' },
    completedIssues: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalIssues: { type: DataTypes.INTEGER, defaultValue: 0 }
  });

  const DocumentVersion = sequelize.define('DocumentVersion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false },
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    changedBy: { type: DataTypes.UUID, allowNull: false },
    changeDescription: DataTypes.TEXT,
    contentHash: DataTypes.STRING
  });

  const WikiHistory = sequelize.define('WikiHistory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    wikiId: { type: DataTypes.UUID, allowNull: false },
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    editedBy: { type: DataTypes.UUID, allowNull: false },
    editSummary: DataTypes.TEXT,
    contentHash: DataTypes.STRING
  });

  const Meeting = sequelize.define('Meeting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    mode: {
      type: DataTypes.ENUM('standard', 'debate', 'round_table', 'court', 'workshop', 'town_hall', 'conference', 'quiz', 'custom'),
      defaultValue: 'standard'
    },
    scheduledAt: DataTypes.DATE,
    durationMinutes: { type: DataTypes.INTEGER, defaultValue: 30 },
    status: { type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'), defaultValue: 'scheduled' },
    hostId: { type: DataTypes.UUID, allowNull: false },
    accessCode: { type: DataTypes.STRING, allowNull: false },
    allowGuests: { type: DataTypes.BOOLEAN, defaultValue: true },
    maxParticipants: DataTypes.INTEGER,
    settings: DataTypes.JSONB
  });

  const MeetingParticipant = sequelize.define('MeetingParticipant', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    userId: DataTypes.UUID,
    guestEmail: DataTypes.STRING,
    guestName: DataTypes.STRING,
    role: { type: DataTypes.ENUM('host', 'participant', 'moderator', 'guest'), defaultValue: 'participant' },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    leftAt: DataTypes.DATE,
    isGuest: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const MeetingAgendaItem = sequelize.define('MeetingAgendaItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('planned', 'in_progress', 'completed'), defaultValue: 'planned' }
  });

  const MeetingNote = sequelize.define('MeetingNote', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    authorId: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
    pinned: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const MeetingActionItem = sequelize.define('MeetingActionItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    assigneeId: DataTypes.UUID,
    dueDate: DataTypes.DATE,
    status: { type: DataTypes.ENUM('open', 'in_progress', 'done'), defaultValue: 'open' }
  });

  const MeetingDecision = sequelize.define('MeetingDecision', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    summary: DataTypes.TEXT,
    decidedBy: DataTypes.UUID,
    decidedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const ExternalMeetingLink = sequelize.define('ExternalMeetingLink', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    platform: { type: DataTypes.ENUM('google_meet', 'zoom', 'teams'), allowNull: false },
    externalId: DataTypes.STRING,
    joinUrl: DataTypes.STRING,
    metadata: DataTypes.JSONB,
    syncedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const MeetingRecording = sequelize.define('MeetingRecording', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    recordingUrl: DataTypes.STRING,
    recordingType: { type: DataTypes.ENUM('video', 'audio', 'transcript'), defaultValue: 'video' },
    startedAt: DataTypes.DATE,
    endedAt: DataTypes.DATE,
    duration: DataTypes.INTEGER,
    recordedBy: DataTypes.UUID,
    consent: DataTypes.JSONB,
    policy: DataTypes.JSONB
  });

  const CalendarEvent = sequelize.define('CalendarEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.ENUM('google', 'outlook'), allowNull: false },
    externalEventId: DataTypes.STRING,
    userId: { type: DataTypes.UUID, allowNull: false },
    syncedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const DebateEvidence = sequelize.define('DebateEvidence', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    participantId: { type: DataTypes.UUID, allowNull: false },
    side: { type: DataTypes.ENUM('pro', 'con'), allowNull: false },
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    sourceUrl: DataTypes.STRING,
    sourceType: { type: DataTypes.ENUM('article', 'study', 'expert', 'data', 'other'), defaultValue: 'other' },
    credibilityScore: DataTypes.FLOAT,
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const DebateArgument = sequelize.define('DebateArgument', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    participantId: { type: DataTypes.UUID, allowNull: false },
    side: { type: DataTypes.ENUM('pro', 'con'), allowNull: false },
    roundNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
    argumentType: { type: DataTypes.ENUM('opening', 'rebuttal', 'closing'), defaultValue: 'opening' },
    content: DataTypes.TEXT,
    evidenceIds: DataTypes.ARRAY(DataTypes.UUID),
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const DebateVote = sequelize.define('DebateVote', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    voterId: { type: DataTypes.UUID, allowNull: false },
    winningSide: { type: DataTypes.ENUM('pro', 'con', 'tie'), allowNull: false },
    reasoning: DataTypes.TEXT,
    votedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const RoundTableTurn = sequelize.define('RoundTableTurn', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    participantId: { type: DataTypes.UUID, allowNull: false },
    roundNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
    orderIndex: DataTypes.INTEGER,
    topicId: DataTypes.UUID,
    startedAt: DataTypes.DATE,
    endedAt: DataTypes.DATE,
    allocatedSeconds: { type: DataTypes.INTEGER, defaultValue: 120 },
    usedSeconds: DataTypes.INTEGER,
    content: DataTypes.TEXT
  });

  const RoundTableTopic = sequelize.define('RoundTableTopic', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    orderIndex: DataTypes.INTEGER,
    status: { type: DataTypes.ENUM('pending', 'active', 'completed'), defaultValue: 'pending' },
    consensusLevel: { type: DataTypes.FLOAT, defaultValue: 0 }
  });

  const CourtEvidence = sequelize.define('CourtEvidence', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    submittedBy: { type: DataTypes.UUID, allowNull: false },
    exhibitNumber: DataTypes.STRING,
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    fileUrl: DataTypes.STRING,
    fileType: DataTypes.STRING,
    chainOfCustody: DataTypes.JSONB,
    admissibilityStatus: { type: DataTypes.ENUM('pending', 'admitted', 'excluded'), defaultValue: 'pending' },
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const CourtMotion = sequelize.define('CourtMotion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    filedBy: { type: DataTypes.UUID, allowNull: false },
    motionType: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    ruling: { type: DataTypes.ENUM('granted', 'denied', 'deferred', 'pending'), defaultValue: 'pending' },
    rulingReason: DataTypes.TEXT,
    ruledBy: DataTypes.UUID,
    filedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ruledAt: DataTypes.DATE
  });

  const CourtVerdict = sequelize.define('CourtVerdict', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    judgeId: { type: DataTypes.UUID, allowNull: false },
    decision: DataTypes.TEXT,
    reasoning: DataTypes.TEXT,
    evidenceConsidered: DataTypes.ARRAY(DataTypes.UUID),
    renderedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const WorkshopIdea = sequelize.define('WorkshopIdea', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    authorId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    category: DataTypes.STRING,
    votes: { type: DataTypes.INTEGER, defaultValue: 0 },
    priorityScore: { type: DataTypes.FLOAT, defaultValue: 0 },
    status: { type: DataTypes.ENUM('proposed', 'discussing', 'accepted', 'rejected'), defaultValue: 'proposed' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const TownHallQuestion = sequelize.define('TownHallQuestion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    askerId: { type: DataTypes.UUID, allowNull: false },
    question: { type: DataTypes.TEXT, allowNull: false },
    upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
    answered: { type: DataTypes.BOOLEAN, defaultValue: false },
    answer: DataTypes.TEXT,
    answeredBy: DataTypes.UUID,
    answeredAt: DataTypes.DATE,
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const TownHallPoll = sequelize.define('TownHallPoll', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    question: { type: DataTypes.STRING, allowNull: false },
    options: DataTypes.JSONB,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    totalVotes: { type: DataTypes.INTEGER, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const ConferenceSession = sequelize.define('ConferenceSession', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    track: DataTypes.STRING,
    speakerIds: DataTypes.ARRAY(DataTypes.UUID),
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    roomId: DataTypes.STRING,
    capacity: DataTypes.INTEGER,
    attendeeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    resources: DataTypes.JSONB
  });

  const QuizQuestion = sequelize.define('QuizQuestion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    question: { type: DataTypes.TEXT, allowNull: false },
    options: DataTypes.JSONB,
    correctAnswer: DataTypes.STRING,
    points: { type: DataTypes.INTEGER, defaultValue: 10 },
    timeLimit: DataTypes.INTEGER,
    orderIndex: DataTypes.INTEGER,
    category: DataTypes.STRING
  });

  const QuizResponse = sequelize.define('QuizResponse', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    questionId: { type: DataTypes.UUID, allowNull: false },
    participantId: { type: DataTypes.UUID, allowNull: false },
    teamId: DataTypes.UUID,
    answer: DataTypes.STRING,
    isCorrect: DataTypes.BOOLEAN,
    pointsEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
    timeToAnswer: DataTypes.INTEGER,
    answeredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const MeetingState = sequelize.define('MeetingState', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false, unique: true },
    currentRound: { type: DataTypes.INTEGER, defaultValue: 0 },
    currentSpeaker: DataTypes.UUID,
    timerStartedAt: DataTypes.DATE,
    timerDuration: DataTypes.INTEGER,
    timerRemaining: DataTypes.INTEGER,
    isPaused: { type: DataTypes.BOOLEAN, defaultValue: false },
    stateData: DataTypes.JSONB,
    lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const MeetingAuditLog = sequelize.define('MeetingAuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM('meeting_control', 'participant_action', 'evidence_submission', 'ruling', 'vote', 'timer', 'role_change', 'other'),
      defaultValue: 'other'
    },
    details: DataTypes.JSONB,
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // ==================== PHASE 10 MODELS ====================

  const MeetingRolePermission = sequelize.define('MeetingRolePermission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    permissions: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    restrictions: DataTypes.JSONB
  });

  const AuditTrailEntry = sequelize.define('AuditTrailEntry', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    sequenceNumber: { type: DataTypes.INTEGER, allowNull: false },
    previousHash: DataTypes.STRING,
    currentHash: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    entityType: DataTypes.STRING,
    entityId: DataTypes.UUID,
    details: DataTypes.JSONB,
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const ContentRedaction = sequelize.define('ContentRedaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    contentType: { type: DataTypes.ENUM('transcript', 'recording', 'note', 'evidence', 'message'), allowNull: false },
    contentId: { type: DataTypes.UUID, allowNull: false },
    redactedBy: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    redactionType: { type: DataTypes.ENUM('full', 'partial', 'blur'), defaultValue: 'partial' },
    originalContent: DataTypes.TEXT,
    redactedContent: DataTypes.TEXT,
    timeRanges: DataTypes.JSONB,
    redactedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const ParticipantConsent = sequelize.define('ParticipantConsent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    participantId: { type: DataTypes.UUID, allowNull: false },
    consentType: { type: DataTypes.ENUM('recording', 'transcript', 'export', 'sharing', 'archival'), allowNull: false },
    granted: { type: DataTypes.BOOLEAN, allowNull: false },
    grantedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    expiresAt: DataTypes.DATE,
    ipAddress: DataTypes.STRING,
    userAgent: DataTypes.STRING
  });

  const MeetingRuleset = sequelize.define('MeetingRuleset', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    rules: { type: DataTypes.JSONB, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.UUID, allowNull: false }
  });

  const ModerationAction = sequelize.define('ModerationAction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    moderatorId: { type: DataTypes.UUID, allowNull: false },
    targetUserId: { type: DataTypes.UUID, allowNull: false },
    actionType: { type: DataTypes.ENUM('warning', 'mute', 'unmute', 'role_change', 'remove', 'timeout'), allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    duration: DataTypes.INTEGER,
    previousRole: DataTypes.STRING,
    newRole: DataTypes.STRING,
    issuedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    expiresAt: DataTypes.DATE
  });

  const DisputeFlag = sequelize.define('DisputeFlag', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    reportedBy: { type: DataTypes.UUID, allowNull: false },
    targetType: { type: DataTypes.ENUM('participant', 'content', 'evidence', 'ruling'), allowNull: false },
    targetId: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'), defaultValue: 'pending' },
    reviewedBy: DataTypes.UUID,
    resolution: DataTypes.TEXT,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    resolvedAt: DataTypes.DATE
  });

  const MeetingTemplate = sequelize.define('MeetingTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.ENUM('hearing', 'mediation', 'arbitration', 'town_hall', 'board_meeting', 'custom'), allowNull: false },
    description: DataTypes.TEXT,
    mode: { type: DataTypes.STRING, allowNull: false },
    roleDefinitions: { type: DataTypes.JSONB, allowNull: false },
    rulesetTemplate: DataTypes.JSONB,
    agendaTemplate: DataTypes.JSONB,
    documentTemplates: DataTypes.JSONB,
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdBy: DataTypes.UUID,
    organizationId: DataTypes.UUID,
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0 }
  });

  const RulingTemplate = sequelize.define('RulingTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    templateType: { type: DataTypes.ENUM('verdict', 'ruling', 'decision', 'order'), allowNull: false },
    category: DataTypes.STRING,
    structure: { type: DataTypes.JSONB, allowNull: false },
    legalStandards: DataTypes.JSONB,
    isStandard: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdBy: DataTypes.UUID
  });

  const ComplianceExport = sequelize.define('ComplianceExport', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    exportType: { type: DataTypes.ENUM('full', 'summary', 'evidence_only', 'transcript_only'), defaultValue: 'full' },
    format: { type: DataTypes.ENUM('pdf', 'json', 'bundle'), defaultValue: 'bundle' },
    requestedBy: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'), defaultValue: 'pending' },
    fileUrl: DataTypes.STRING,
    fileSize: DataTypes.INTEGER,
    metadata: DataTypes.JSONB,
    includeRedactions: { type: DataTypes.BOOLEAN, defaultValue: true },
    includeAuditTrail: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    completedAt: DataTypes.DATE
  });

  // ==================== PHASE 11 MODELS ====================

  const DecisionLog = sequelize.define('DecisionLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    rationale: DataTypes.TEXT,
    decidedBy: { type: DataTypes.UUID, allowNull: false },
    decision: { type: DataTypes.TEXT, allowNull: false },
    alternatives: DataTypes.JSONB,
    evidenceLinks: DataTypes.ARRAY(DataTypes.UUID),
    impactAssessment: DataTypes.JSONB,
    status: { type: DataTypes.ENUM('proposed', 'approved', 'implemented', 'rejected', 'reversed'), defaultValue: 'proposed' },
    implementationDate: DataTypes.DATE,
    reviewDate: DataTypes.DATE,
    tags: DataTypes.ARRAY(DataTypes.STRING)
  });

  const FollowUpTask = sequelize.define('FollowUpTask', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    decisionLogId: DataTypes.UUID,
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    assignedTo: { type: DataTypes.UUID, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'blocked', 'cancelled'), defaultValue: 'pending' },
    automationRules: DataTypes.JSONB,
    dependencies: DataTypes.ARRAY(DataTypes.UUID),
    completedAt: DataTypes.DATE,
    blockedReason: DataTypes.TEXT
  });

  const OutcomeTracker = sequelize.define('OutcomeTracker', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    decisionLogId: DataTypes.UUID,
    followUpTaskId: DataTypes.UUID,
    metric: { type: DataTypes.STRING, allowNull: false },
    targetValue: DataTypes.FLOAT,
    actualValue: DataTypes.FLOAT,
    unit: DataTypes.STRING,
    measurementDate: DataTypes.DATE,
    notes: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('on_track', 'at_risk', 'delayed', 'achieved', 'failed'), defaultValue: 'on_track' },
    accountability: DataTypes.JSONB
  });

  const KnowledgeEntity = sequelize.define('KnowledgeEntity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entityType: { type: DataTypes.ENUM('person', 'topic', 'decision', 'outcome', 'concept', 'project'), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    metadata: DataTypes.JSONB,
    mentionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    importance: { type: DataTypes.FLOAT, defaultValue: 0.5 },
    tags: DataTypes.ARRAY(DataTypes.STRING)
  });

  const KnowledgeRelation = sequelize.define('KnowledgeRelation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sourceEntityId: { type: DataTypes.UUID, allowNull: false },
    targetEntityId: { type: DataTypes.UUID, allowNull: false },
    relationType: { type: DataTypes.ENUM('mentions', 'leads_to', 'depends_on', 'related_to', 'contradicts', 'supports'), allowNull: false },
    meetingId: DataTypes.UUID,
    strength: { type: DataTypes.FLOAT, defaultValue: 1.0 },
    context: DataTypes.TEXT
  });

  const MeetingTopic = sequelize.define('MeetingTopic', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    topic: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    sentiment: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    discussionTime: { type: DataTypes.INTEGER, defaultValue: 0 },
    participants: DataTypes.ARRAY(DataTypes.UUID),
    keywords: DataTypes.ARRAY(DataTypes.STRING),
    relatedTopics: DataTypes.ARRAY(DataTypes.UUID)
  });

  const TranscriptHighlight = sequelize.define('TranscriptHighlight', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    speakerId: DataTypes.UUID,
    timestamp: { type: DataTypes.DATE, allowNull: false },
    duration: DataTypes.INTEGER,
    content: { type: DataTypes.TEXT, allowNull: false },
    highlightType: { type: DataTypes.ENUM('decision', 'action_item', 'key_point', 'question', 'agreement', 'disagreement'), allowNull: false },
    importance: { type: DataTypes.FLOAT, defaultValue: 0.5 },
    citations: DataTypes.ARRAY(DataTypes.UUID),
    searchVector: DataTypes.TEXT
  });

  const AISummary = sequelize.define('AISummary', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    agendaItemId: DataTypes.UUID,
    summaryType: { type: DataTypes.ENUM('agenda_section', 'full_meeting', 'debate', 'decision', 'action_items'), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    keyPoints: DataTypes.ARRAY(DataTypes.STRING),
    sentiment: DataTypes.JSONB,
    neutralityScore: DataTypes.FLOAT,
    confidence: { type: DataTypes.FLOAT, defaultValue: 0.8 },
    generatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    reviewStatus: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'edited'), defaultValue: 'pending' }
  });

  const AIActionItem = sequelize.define('AIActionItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    extractedFrom: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    suggestedAssignee: DataTypes.UUID,
    suggestedDueDate: DataTypes.DATE,
    confidence: { type: DataTypes.FLOAT, defaultValue: 0.8 },
    verificationStatus: { type: DataTypes.ENUM('pending', 'verified', 'rejected', 'modified'), defaultValue: 'pending' },
    verifiedBy: DataTypes.UUID,
    convertedToTask: { type: DataTypes.BOOLEAN, defaultValue: false },
    taskId: DataTypes.UUID
  });

  const MeetingBrief = sequelize.define('MeetingBrief', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    generatedFor: { type: DataTypes.UUID, allowNull: false },
    contextSummary: DataTypes.TEXT,
    relevantDecisions: DataTypes.ARRAY(DataTypes.UUID),
    relatedMeetings: DataTypes.ARRAY(DataTypes.UUID),
    backgroundTopics: DataTypes.JSONB,
    suggestedPreparation: DataTypes.ARRAY(DataTypes.STRING),
    participantProfiles: DataTypes.JSONB,
    generatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // ==================== PHASE 12 MODELS ====================

  const UserExperienceProfile = sequelize.define('UserExperienceProfile', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    experienceLevel: { type: DataTypes.ENUM('novice', 'intermediate', 'expert'), defaultValue: 'novice' },
    preferredComplexity: { type: DataTypes.ENUM('simple', 'balanced', 'advanced'), defaultValue: 'simple' },
    completedOnboarding: { type: DataTypes.BOOLEAN, defaultValue: false },
    onboardingProgress: DataTypes.JSONB,
    interfacePreferences: DataTypes.JSONB,
    roleSpecificSettings: DataTypes.JSONB,
    meetingTypePreferences: DataTypes.JSONB
  });

  const OnboardingStep = sequelize.define('OnboardingStep', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    stepType: { type: DataTypes.ENUM('role_selection', 'meeting_mode_intro', 'feature_tour', 'keyboard_shortcuts', 'accessibility_setup'), allowNull: false },
    context: { type: DataTypes.STRING, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    completedAt: DataTypes.DATE,
    skipped: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const LiveCaption = sequelize.define('LiveCaption', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    speakerId: DataTypes.UUID,
    speakerName: DataTypes.STRING,
    content: { type: DataTypes.TEXT, allowNull: false },
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    duration: DataTypes.INTEGER,
    confidence: DataTypes.FLOAT,
    language: { type: DataTypes.STRING, defaultValue: 'en' },
    isFinal: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const AccessibilitySettings = sequelize.define('AccessibilitySettings', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    screenReaderEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    highContrastMode: { type: DataTypes.BOOLEAN, defaultValue: false },
    dyslexiaFriendlyFont: { type: DataTypes.BOOLEAN, defaultValue: false },
    keyboardNavigationOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    captionsEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    captionSize: { type: DataTypes.ENUM('small', 'medium', 'large', 'extra-large'), defaultValue: 'medium' },
    reducedMotion: { type: DataTypes.BOOLEAN, defaultValue: false },
    colorBlindMode: { type: DataTypes.ENUM('none', 'protanopia', 'deuteranopia', 'tritanopia'), defaultValue: 'none' },
    fontSize: { type: DataTypes.INTEGER, defaultValue: 16 },
    customTheme: DataTypes.JSONB
  });

  const ThemeConfiguration = sequelize.define('ThemeConfiguration', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    themeType: { type: DataTypes.ENUM('standard', 'high-contrast', 'dark', 'dyslexia-friendly', 'custom'), allowNull: false },
    colors: { type: DataTypes.JSONB, allowNull: false },
    typography: DataTypes.JSONB,
    spacing: DataTypes.JSONB,
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdBy: DataTypes.UUID,
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const MeetingEdgeNode = sequelize.define('MeetingEdgeNode', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    region: { type: DataTypes.STRING, allowNull: false },
    endpoint: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, defaultValue: 100 },
    currentLoad: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('active', 'maintenance', 'offline'), defaultValue: 'active' },
    latencyMs: DataTypes.INTEGER,
    lastHealthCheck: DataTypes.DATE
  });

  const MeetingRoute = sequelize.define('MeetingRoute', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false },
    edgeNodeId: { type: DataTypes.UUID, allowNull: false },
    participantLocations: DataTypes.JSONB,
    routingStrategy: { type: DataTypes.ENUM('nearest', 'load-balanced', 'quality-optimized'), defaultValue: 'nearest' },
    assignedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  const MediaQualityProfile = sequelize.define('MediaQualityProfile', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    meetingId: DataTypes.UUID,
    bandwidth: { type: DataTypes.ENUM('low', 'medium', 'high', 'auto'), defaultValue: 'auto' },
    videoQuality: { type: DataTypes.ENUM('360p', '480p', '720p', '1080p', 'auto'), defaultValue: 'auto' },
    audioQuality: { type: DataTypes.ENUM('narrow', 'wide', 'fullband', 'auto'), defaultValue: 'auto' },
    adaptiveMode: { type: DataTypes.BOOLEAN, defaultValue: true },
    currentBandwidthKbps: DataTypes.INTEGER,
    packetLoss: DataTypes.FLOAT,
    jitter: DataTypes.INTEGER
  });

  const LargeMeetingConfig = sequelize.define('LargeMeetingConfig', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meetingId: { type: DataTypes.UUID, allowNull: false, unique: true },
    mode: { type: DataTypes.ENUM('stage', 'audience', 'hybrid'), defaultValue: 'hybrid' },
    maxStageParticipants: { type: DataTypes.INTEGER, defaultValue: 10 },
    audienceSize: DataTypes.INTEGER,
    stageParticipants: DataTypes.ARRAY(DataTypes.UUID),
    viewMode: { type: DataTypes.ENUM('speaker', 'gallery', 'presentation'), defaultValue: 'speaker' },
    enableQA: { type: DataTypes.BOOLEAN, defaultValue: true },
    moderationSettings: DataTypes.JSONB
  });

  const CollaborativeSession = sequelize.define('CollaborativeSession', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    documentId: { type: DataTypes.UUID, allowNull: false },
    documentType: { type: DataTypes.ENUM('document', 'wiki', 'spreadsheet'), defaultValue: 'document' },
    activeUsers: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
    lastActivity: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    operationCount: { type: DataTypes.INTEGER, defaultValue: 0 }
  });

  const CollaborativeOperation = sequelize.define('CollaborativeOperation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sessionId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    operationType: { type: DataTypes.ENUM('insert', 'delete', 'retain', 'format'), allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false },
    content: DataTypes.TEXT,
    length: DataTypes.INTEGER,
    attributes: DataTypes.JSONB,
    baseRevision: { type: DataTypes.INTEGER, allowNull: false },
    appliedRevision: DataTypes.INTEGER
  });

  const UserPresence = sequelize.define('UserPresence', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sessionId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    cursorPosition: { type: DataTypes.INTEGER, defaultValue: 0 },
    selectionStart: DataTypes.INTEGER,
    selectionEnd: DataTypes.INTEGER,
    color: { type: DataTypes.STRING, defaultValue: '#000000' },
    lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Late-added models (defined inline with routes in original)
  const WikiDiff = sequelize.define('WikiDiff', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    wikiId: { type: DataTypes.UUID, allowNull: false },
    fromVersionId: DataTypes.UUID,
    toVersionId: DataTypes.UUID,
    diff: DataTypes.TEXT,
    stats: DataTypes.JSONB
  });

  const DocumentFolder = sequelize.define('DocumentFolder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    parentId: DataTypes.UUID,
    ownerId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  const DatabaseView = sequelize.define('DatabaseView', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    parentId: DataTypes.UUID,
    name: { type: DataTypes.STRING, allowNull: false },
    viewType: { type: DataTypes.ENUM('table', 'gallery', 'list', 'board'), defaultValue: 'table' },
    filters: DataTypes.JSONB,
    sorts: DataTypes.JSONB,
    properties: DataTypes.JSONB,
    groupBy: DataTypes.STRING
  });

  const DatabaseProperty = sequelize.define('DatabaseProperty', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    databaseId: DataTypes.UUID,
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url', 'email'), defaultValue: 'text' },
    options: DataTypes.JSONB
  });

  const WebRTCCall = sequelize.define('WebRTCCall', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    callerId: { type: DataTypes.UUID, allowNull: false },
    recipientId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('audio', 'video'), defaultValue: 'video' },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'missed', 'ended'), defaultValue: 'pending' },
    offer: DataTypes.TEXT,
    answer: DataTypes.TEXT,
    duration: DataTypes.INTEGER
  });

  // ==================== ASSOCIATIONS ====================

  Issue.hasMany(IssueComment, { foreignKey: 'issueId' });
  IssueComment.belongsTo(Issue, { foreignKey: 'issueId' });
  Project.hasMany(Issue, { foreignKey: 'projectId' });
  Project.hasMany(Task, { foreignKey: 'projectId' });
  Project.hasMany(Milestone, { foreignKey: 'projectId' });
  Milestone.hasMany(Issue, { foreignKey: 'milestoneId' });
  Issue.belongsTo(Milestone, { foreignKey: 'milestoneId' });

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

  Meeting.hasMany(DecisionLog, { foreignKey: 'meetingId', as: 'decisionLogs' });
  DecisionLog.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(FollowUpTask, { foreignKey: 'meetingId', as: 'followUpTasks' });
  FollowUpTask.belongsTo(Meeting, { foreignKey: 'meetingId' });
  DecisionLog.hasMany(FollowUpTask, { foreignKey: 'decisionLogId', as: 'tasks' });
  FollowUpTask.belongsTo(DecisionLog, { foreignKey: 'decisionLogId' });
  Meeting.hasMany(OutcomeTracker, { foreignKey: 'meetingId', as: 'outcomes' });
  OutcomeTracker.belongsTo(Meeting, { foreignKey: 'meetingId' });
  DecisionLog.hasMany(OutcomeTracker, { foreignKey: 'decisionLogId', as: 'trackers' });
  OutcomeTracker.belongsTo(DecisionLog, { foreignKey: 'decisionLogId' });
  Meeting.hasMany(MeetingTopic, { foreignKey: 'meetingId', as: 'topics' });
  MeetingTopic.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(TranscriptHighlight, { foreignKey: 'meetingId', as: 'highlights' });
  TranscriptHighlight.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(AISummary, { foreignKey: 'meetingId', as: 'aiSummaries' });
  AISummary.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(AIActionItem, { foreignKey: 'meetingId', as: 'aiActionItems' });
  AIActionItem.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(MeetingBrief, { foreignKey: 'meetingId', as: 'briefs' });
  MeetingBrief.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(LiveCaption, { foreignKey: 'meetingId', as: 'captions' });
  LiveCaption.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(MeetingRoute, { foreignKey: 'meetingId', as: 'routes' });
  MeetingRoute.belongsTo(Meeting, { foreignKey: 'meetingId' });
  MeetingRoute.belongsTo(MeetingEdgeNode, { foreignKey: 'edgeNodeId', as: 'edgeNode' });
  Meeting.hasOne(LargeMeetingConfig, { foreignKey: 'meetingId', as: 'largeMeetingConfig' });
  LargeMeetingConfig.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Document.hasMany(DocumentVersion, { foreignKey: 'documentId', as: 'versions' });
  DocumentVersion.belongsTo(Document, { foreignKey: 'documentId' });
  Wiki.hasMany(WikiHistory, { foreignKey: 'wikiId', as: 'history' });
  WikiHistory.belongsTo(Wiki, { foreignKey: 'wikiId' });

  CollaborativeSession.hasMany(CollaborativeOperation, { foreignKey: 'sessionId', as: 'operations' });
  CollaborativeOperation.belongsTo(CollaborativeSession, { foreignKey: 'sessionId' });
  CollaborativeSession.hasMany(UserPresence, { foreignKey: 'sessionId', as: 'presences' });
  UserPresence.belongsTo(CollaborativeSession, { foreignKey: 'sessionId' });

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

  Meeting.hasMany(DebateEvidence, { foreignKey: 'meetingId', as: 'debateEvidence' });
  DebateEvidence.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(DebateArgument, { foreignKey: 'meetingId', as: 'debateArguments' });
  DebateArgument.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(DebateVote, { foreignKey: 'meetingId', as: 'debateVotes' });
  DebateVote.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(RoundTableTopic, { foreignKey: 'meetingId', as: 'roundTableTopics' });
  RoundTableTopic.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(RoundTableTurn, { foreignKey: 'meetingId', as: 'roundTableTurns' });
  RoundTableTurn.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(CourtEvidence, { foreignKey: 'meetingId', as: 'courtEvidence' });
  CourtEvidence.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(CourtMotion, { foreignKey: 'meetingId', as: 'courtMotions' });
  CourtMotion.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(CourtVerdict, { foreignKey: 'meetingId', as: 'courtVerdicts' });
  CourtVerdict.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(WorkshopIdea, { foreignKey: 'meetingId', as: 'workshopIdeas' });
  WorkshopIdea.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(TownHallQuestion, { foreignKey: 'meetingId', as: 'townHallQuestions' });
  TownHallQuestion.belongsTo(Meeting, { foreignKey: 'meetingId' });
  Meeting.hasMany(TownHallPoll, { foreignKey: 'meetingId', as: 'townHallPolls' });
  TownHallPoll.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(ConferenceSession, { foreignKey: 'meetingId', as: 'conferenceSessions' });
  ConferenceSession.belongsTo(Meeting, { foreignKey: 'meetingId' });

  Meeting.hasMany(QuizQuestion, { foreignKey: 'meetingId', as: 'quizQuestions' });
  QuizQuestion.belongsTo(Meeting, { foreignKey: 'meetingId' });
  QuizQuestion.hasMany(QuizResponse, { foreignKey: 'questionId', as: 'responses' });
  QuizResponse.belongsTo(QuizQuestion, { foreignKey: 'questionId' });

  return {
    Document, Wiki, Task, Issue, IssueComment, Project, Milestone,
    DocumentVersion, WikiHistory,
    Meeting, MeetingParticipant, MeetingAgendaItem, MeetingNote,
    MeetingActionItem, MeetingDecision, ExternalMeetingLink, MeetingRecording,
    CalendarEvent, MeetingState, MeetingAuditLog,
    DebateEvidence, DebateArgument, DebateVote,
    RoundTableTurn, RoundTableTopic,
    CourtEvidence, CourtMotion, CourtVerdict,
    WorkshopIdea, TownHallQuestion, TownHallPoll,
    ConferenceSession, QuizQuestion, QuizResponse,
    MeetingRolePermission, AuditTrailEntry, ContentRedaction, ParticipantConsent,
    MeetingRuleset, ModerationAction, DisputeFlag,
    MeetingTemplate, RulingTemplate, ComplianceExport,
    DecisionLog, FollowUpTask, OutcomeTracker,
    KnowledgeEntity, KnowledgeRelation, MeetingTopic, TranscriptHighlight,
    AISummary, AIActionItem, MeetingBrief,
    UserExperienceProfile, OnboardingStep, LiveCaption, AccessibilitySettings,
    ThemeConfiguration, MeetingEdgeNode, MeetingRoute, MediaQualityProfile,
    LargeMeetingConfig,
    CollaborativeSession, CollaborativeOperation, UserPresence,
    WikiDiff, DocumentFolder, DatabaseView, DatabaseProperty, WebRTCCall
  };
}

module.exports = initModels;
