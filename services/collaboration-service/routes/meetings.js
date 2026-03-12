'use strict';
const express = require('express');
const { Op } = require('sequelize');

function createMeetingsRouter(deps) {
  const { models, helpers } = deps;
  const {
    Meeting, MeetingParticipant, MeetingAgendaItem, MeetingNote,
    MeetingActionItem, MeetingDecision, ExternalMeetingLink, MeetingRecording,
    CalendarEvent, MeetingState, MeetingAuditLog
  } = models;
  const { generateAccessCode, requireMeetingAccess } = helpers;
  const router = express.Router();

  // Create meeting
  router.post('/meetings', async (req, res) => {
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
  router.get('/meetings', async (req, res) => {
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
  router.get('/meetings/:id', async (req, res) => {
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
  router.post('/meetings/:id/join', async (req, res) => {
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
  router.post('/meetings/:id/leave', async (req, res) => {
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
  router.get('/meetings/public/:id', async (req, res) => {
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
  router.post('/meetings/public/join', async (req, res) => {
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
  router.get('/meetings/public/:id/lobby', async (req, res) => {
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
  router.get('/meetings/:id/agenda', async (req, res) => {
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

  router.post('/meetings/:id/agenda', async (req, res) => {
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

  router.put('/meetings/:id/agenda/:itemId', async (req, res) => {
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

  router.delete('/meetings/:id/agenda/:itemId', async (req, res) => {
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
  router.get('/meetings/:id/notes', async (req, res) => {
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

  router.post('/meetings/:id/notes', async (req, res) => {
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

  router.put('/meetings/:id/notes/:noteId', async (req, res) => {
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

  router.delete('/meetings/:id/notes/:noteId', async (req, res) => {
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
  router.get('/meetings/:id/actions', async (req, res) => {
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

  router.post('/meetings/:id/actions', async (req, res) => {
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

  router.put('/meetings/:id/actions/:actionId', async (req, res) => {
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

  router.delete('/meetings/:id/actions/:actionId', async (req, res) => {
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
  router.get('/meetings/:id/decisions', async (req, res) => {
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

  router.post('/meetings/:id/decisions', async (req, res) => {
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

  router.delete('/meetings/:id/decisions/:decisionId', async (req, res) => {
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

  // External Meeting Integration
  router.post('/meetings/:id/external-link', async (req, res) => {
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

  router.get('/meetings/:id/external-links', async (req, res) => {
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
  router.post('/meetings/:id/recordings', async (req, res) => {
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

  router.get('/meetings/:id/recordings', async (req, res) => {
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
  router.post('/meetings/:id/calendar-sync', async (req, res) => {
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
  router.get('/meetings/:id/state', async (req, res) => {
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

  router.put('/meetings/:id/state', async (req, res) => {
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
  router.get('/meetings/:id/audit-logs', async (req, res) => {
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

  return router;
}

module.exports = createMeetingsRouter;
