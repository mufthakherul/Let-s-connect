'use strict';

const express = require('express');

/**
 * Meeting modes routes: Debate, Round Table, Virtual Court,
 * Workshop, Town Hall, Virtual Conference, Quiz.
 * @param {object} deps - { models, redis }
 */
function createMeetingModesRouter({ models, redis, helpers }) {
  const {
    Meeting, MeetingParticipant,
    DebateEvidence, DebateArgument, DebateVote,
    RoundTableTopic, SpeakerTurn,
    CourtEvidence, CourtMotion, CourtVerdict,
    WorkshopIdea, WorkshopVote,
    TownHallQuestion, TownHallPoll,
    ConferenceBreakoutRoom, ConferenceExhibitorBooth,
    QuizQuestion, QuizSession, QuizResponse
  } = models;

  const router = express.Router();

  // requireMeetingAccess is provided via deps.helpers (createHelpers factory)
  const { requireMeetingAccess } = helpers;
  const getMeetingAccess = (meetingId, userId) => requireMeetingAccess(meetingId, userId);

  // ==================== DEBATE MODE ====================

  router.post('/:id/debate/evidence', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { content, evidenceType, source } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const evidence = await DebateEvidence.create({
        meetingId: meeting.id,
        submittedBy: userId,
        content,
        evidenceType: evidenceType || 'factual',
        source
      });

      res.json(evidence);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/debate/evidence', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const evidence = await DebateEvidence.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(evidence);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/debate/arguments', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { content, position, evidenceIds } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const argument = await DebateArgument.create({
        meetingId: meeting.id,
        userId,
        content,
        position: position || 'for',
        evidenceIds: evidenceIds || []
      });

      res.json(argument);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/debate/arguments', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const args = await DebateArgument.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(args);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/debate/vote', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { position } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const existing = await DebateVote.findOne({
        where: { meetingId: meeting.id, userId }
      });

      let vote;
      if (existing) {
        existing.position = position;
        await existing.save();
        vote = existing;
      } else {
        vote = await DebateVote.create({
          meetingId: meeting.id,
          userId,
          position
        });
      }

      res.json(vote);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/debate/votes', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const votes = await DebateVote.findAll({
        where: { meetingId: req.params.id }
      });

      const tally = votes.reduce((acc, v) => {
        acc[v.position] = (acc[v.position] || 0) + 1;
        return acc;
      }, {});

      res.json({ votes, tally });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== ROUND TABLE MODE ====================

  router.post('/:id/roundtable/topics', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { title, description, timeLimit } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const topic = await RoundTableTopic.create({
        meetingId: meeting.id,
        title,
        description,
        timeLimit: timeLimit || 300,
        addedBy: userId
      });

      res.json(topic);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/roundtable/topics', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const topics = await RoundTableTopic.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(topics);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/roundtable/topics/:topicId', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { status } = req.body;
      await getMeetingAccess(req.params.id, userId);

      const topic = await RoundTableTopic.findByPk(req.params.topicId);
      if (!topic) return res.status(404).json({ error: 'Topic not found' });

      topic.status = status;
      await topic.save();

      res.json(topic);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/roundtable/turns', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { speakerId, topicId, duration } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can manage speaker turns' });
      }

      const turn = await SpeakerTurn.create({
        meetingId: meeting.id,
        speakerId,
        topicId,
        duration: duration || 120,
        startTime: new Date()
      });

      res.json(turn);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/roundtable/turns/:turnId', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { status } = req.body;
      await getMeetingAccess(req.params.id, userId);

      const turn = await SpeakerTurn.findByPk(req.params.turnId);
      if (!turn) return res.status(404).json({ error: 'Turn not found' });

      turn.status = status;
      if (status === 'completed') turn.endTime = new Date();
      await turn.save();

      res.json(turn);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/roundtable/turns', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const turns = await SpeakerTurn.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(turns);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== VIRTUAL COURT MODE ====================

  router.post('/:id/court/evidence', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { title, description, evidenceType, submittedBy } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const evidence = await CourtEvidence.create({
        meetingId: meeting.id,
        title,
        description,
        evidenceType: evidenceType || 'documentary',
        submittedBy: submittedBy || userId,
        admissibility: 'pending'
      });

      res.json(evidence);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/court/evidence', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const evidence = await CourtEvidence.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(evidence);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/court/evidence/:evidenceId/admissibility', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { admissibility, reason } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only judge (host) can rule on admissibility' });
      }

      const evidence = await CourtEvidence.findByPk(req.params.evidenceId);
      if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

      evidence.admissibility = admissibility;
      evidence.admissibilityReason = reason;
      await evidence.save();

      res.json(evidence);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/court/motions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { title, description, motionType } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const motion = await CourtMotion.create({
        meetingId: meeting.id,
        filedBy: userId,
        title,
        description,
        motionType: motionType || 'procedural',
        status: 'pending'
      });

      res.json(motion);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/court/motions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const motions = await CourtMotion.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(motions);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/court/motions/:motionId/ruling', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { ruling, reason } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only judge (host) can rule on motions' });
      }

      const motion = await CourtMotion.findByPk(req.params.motionId);
      if (!motion) return res.status(404).json({ error: 'Motion not found' });

      motion.status = ruling;
      motion.rulingReason = reason;
      motion.ruledAt = new Date();
      await motion.save();

      res.json(motion);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/court/verdict', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { verdict, reasoning, sentence } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only judge (host) can issue verdict' });
      }

      const verdictRecord = await CourtVerdict.create({
        meetingId: meeting.id,
        issuedBy: userId,
        verdict,
        reasoning,
        sentence
      });

      meeting.status = 'concluded';
      await meeting.save();

      res.json(verdictRecord);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/court/verdict', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const verdict = await CourtVerdict.findOne({ where: { meetingId: req.params.id } });
      if (!verdict) return res.status(404).json({ error: 'No verdict issued yet' });

      res.json(verdict);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== WORKSHOP MODE ====================

  router.post('/:id/workshop/ideas', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { title, description, category } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const idea = await WorkshopIdea.create({
        meetingId: meeting.id,
        submittedBy: userId,
        title,
        description,
        category,
        votes: 0
      });

      res.json(idea);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/workshop/ideas', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const ideas = await WorkshopIdea.findAll({
        where: { meetingId: req.params.id },
        order: [['votes', 'DESC'], ['createdAt', 'ASC']]
      });

      res.json(ideas);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/workshop/ideas/:ideaId/vote', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const idea = await WorkshopIdea.findByPk(req.params.ideaId);
      if (!idea) return res.status(404).json({ error: 'Idea not found' });

      const vote = await WorkshopVote.findOne({
        where: { ideaId: idea.id, userId }
      });

      if (vote) {
        return res.status(409).json({ error: 'Already voted for this idea' });
      }

      await WorkshopVote.create({ ideaId: idea.id, userId });
      idea.votes = (idea.votes || 0) + 1;
      await idea.save();

      res.json(idea);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/workshop/ideas/:ideaId', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { status, priority } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can update idea status' });
      }

      const idea = await WorkshopIdea.findByPk(req.params.ideaId);
      if (!idea) return res.status(404).json({ error: 'Idea not found' });

      if (status !== undefined) idea.status = status;
      if (priority !== undefined) idea.priority = priority;
      await idea.save();

      res.json(idea);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== TOWN HALL MODE ====================

  router.post('/:id/townhall/questions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { question, anonymous } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const q = await TownHallQuestion.create({
        meetingId: meeting.id,
        askedBy: anonymous ? null : userId,
        anonymous: anonymous || false,
        question,
        upvotes: 0,
        status: 'pending'
      });

      res.json(q);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/townhall/questions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const questions = await TownHallQuestion.findAll({
        where: { meetingId: req.params.id },
        order: [['upvotes', 'DESC'], ['createdAt', 'ASC']]
      });

      res.json(questions);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/townhall/questions/:questionId/upvote', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const question = await TownHallQuestion.findByPk(req.params.questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      question.upvotes = (question.upvotes || 0) + 1;
      await question.save();

      res.json(question);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.put('/:id/townhall/questions/:questionId/answer', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { answer } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can answer questions' });
      }

      const question = await TownHallQuestion.findByPk(req.params.questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      question.answer = answer;
      question.answeredBy = userId;
      question.answeredAt = new Date();
      question.status = 'answered';
      await question.save();

      res.json(question);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/townhall/polls', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { question, options, duration } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can create polls' });
      }

      const poll = await TownHallPoll.create({
        meetingId: meeting.id,
        createdBy: userId,
        question,
        options: options || [],
        duration: duration || 60,
        status: 'active'
      });

      res.json(poll);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/townhall/polls', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const polls = await TownHallPoll.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'DESC']]
      });

      res.json(polls);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== VIRTUAL CONFERENCE MODE ====================

  router.post('/:id/conference/breakout-rooms', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { name, capacity, topic } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can create breakout rooms' });
      }

      const room = await ConferenceBreakoutRoom.create({
        meetingId: meeting.id,
        name,
        capacity: capacity || 10,
        topic,
        participants: []
      });

      res.json(room);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/conference/breakout-rooms', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const rooms = await ConferenceBreakoutRoom.findAll({
        where: { meetingId: req.params.id }
      });

      res.json(rooms);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/conference/exhibitors', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { name, description, boothUrl, contactEmail } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      const booth = await ConferenceExhibitorBooth.create({
        meetingId: meeting.id,
        exhibitorId: userId,
        name,
        description,
        boothUrl,
        contactEmail
      });

      res.json(booth);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/conference/exhibitors', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const booths = await ConferenceExhibitorBooth.findAll({
        where: { meetingId: req.params.id }
      });

      res.json(booths);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // ==================== QUIZ MODE ====================

  router.post('/:id/quiz/questions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { question, options, correctAnswer, points, timeLimit } = req.body;
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can add quiz questions' });
      }

      const q = await QuizQuestion.create({
        meetingId: meeting.id,
        question,
        options: options || [],
        correctAnswer,
        points: points || 10,
        timeLimit: timeLimit || 30
      });

      res.json(q);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/quiz/questions', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      await getMeetingAccess(req.params.id, userId);

      const questions = await QuizQuestion.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'ASC']]
      });

      res.json(questions);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/quiz/start', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const meeting = await getMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only host can start quiz' });
      }

      const session = await QuizSession.create({
        meetingId: meeting.id,
        startedBy: userId,
        status: 'active',
        startTime: new Date()
      });

      res.json(session);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/:id/quiz/answer', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { questionId, answer, sessionId } = req.body;
      await getMeetingAccess(req.params.id, userId);

      const question = await QuizQuestion.findByPk(questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });

      const isCorrect = question.correctAnswer === answer;
      const pointsEarned = isCorrect ? question.points : 0;

      const response = await QuizResponse.create({
        sessionId,
        questionId,
        userId,
        answer,
        isCorrect,
        pointsEarned
      });

      res.json({ ...response.toJSON(), isCorrect, pointsEarned });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.get('/:id/quiz/leaderboard', async (req, res) => {
    try {
      const userId = req.header("x-user-id");
      const { sessionId } = req.query;
      await getMeetingAccess(req.params.id, userId);

      const responses = await QuizResponse.findAll({
        where: { sessionId },
        attributes: ['userId', [require('sequelize').fn('SUM', require('sequelize').col('pointsEarned')), 'totalPoints']],
        group: ['userId'],
        order: [[require('sequelize').literal('totalPoints'), 'DESC']]
      });

      res.json(responses);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createMeetingModesRouter };
