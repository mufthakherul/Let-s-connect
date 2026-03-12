'use strict';
const crypto = require('crypto');

function createHelpers(models) {
  const { Meeting, MeetingParticipant } = models;

  const generateAccessCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

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

  return { generateAccessCode, requireMeetingAccess };
}

module.exports = createHelpers;
