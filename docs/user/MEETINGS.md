# Meetings Guide

Conduct productive meetings with Milonexa's comprehensive video conferencing platform. This guide covers all meeting features and best practices.

## Table of Contents

1. [Creating a Meeting](#creating-a-meeting)
2. [Meeting Modes](#meeting-modes)
3. [Meeting Settings](#meeting-settings)
4. [Guest Access](#guest-access)
5. [Joining a Meeting](#joining-a-meeting)
6. [Meeting Controls](#meeting-controls)
7. [Agenda and Notes](#agenda-and-notes)
8. [Recordings](#recordings)
9. [Calendar Integration](#calendar-integration)
10. [Participant Management](#participant-management)

---

## Creating a Meeting

### Basic Information

Create a new meeting with essential details:

**Endpoint**: `POST /api/collaboration/meetings`

**Request Body**:
```json
{
  "title": "Q1 Product Planning",
  "description": "Discussing Q1 roadmap and feature priorities",
  "mode": "brainstorm",
  "scheduledTime": "2024-01-20T10:00:00Z",
  "duration": 60,
  "maxParticipants": 50,
  "allowGuests": true,
  "requireApprovalToJoin": false,
  "allowRecording": true
}
```

**Response**:
```json
{
  "id": "meeting_abc123",
  "title": "Q1 Product Planning",
  "mode": "brainstorm",
  "scheduledTime": "2024-01-20T10:00:00Z",
  "duration": 60,
  "maxParticipants": 50,
  "hostId": "user_xyz789",
  "accessCode": "MEETING-ABC-123",
  "meetingLink": "https://milonexa.com/meetings/meeting_abc123",
  "roomId": "room_def456",
  "status": "scheduled",
  "createdAt": "2024-01-15T15:30:00Z"
}
```

### Meeting Title and Description

**Title**:
- 1-200 characters
- Should clearly describe purpose
- Used for notifications and calendar
- Examples: "Weekly Team Standup", "Client Q&A Session"

**Description**:
- 0-5000 characters
- Optional detailed meeting information
- Shared with all participants
- Can include agenda outline

---

## Meeting Modes

Milonexa supports 10 specialized meeting modes optimized for different scenarios:

### Standard Meeting

Default video conference for general use.

**Best for**: Regular team meetings, check-ins, discussions

**Features**:
- Unlimited raised hands
- Screen sharing from all participants
- Chat and reactions
- Recording available
- Breakout rooms available

**Configuration**:
```json
{
  "mode": "standard",
  "maxParticipants": 500,
  "allowScreenShare": true,
  "allowChat": true
}
```

### Round Table

Equal participant participation without hierarchy.

**Best for**: Collaborative discussions, brainstorming, peer feedback

**Features**:
- All participants have equal speaking time
- Rotating speaker queue
- Equal camera/mic privileges
- No presenter controls
- Fair distribution of speaking time

**Configuration**:
```json
{
  "mode": "round_table",
  "maxParticipants": 20,
  "timePerSpeaker": 300, // 5 minutes
  "autoRotate": true
}
```

### Town Hall

One primary speaker with audience Q&A.

**Best for**: Large broadcasts, announcements, executive updates

**Features**:
- Host has full control
- Attendees muted by default
- Q&A queue for questions
- Live chat moderation
- Recording enabled by default

**Configuration**:
```json
{
  "mode": "town_hall",
  "maxParticipants": 5000,
  "speaker": "user_speaker123",
  "qaEnabled": true,
  "chatModerated": true
}
```

### Workshop

Hands-on sessions with shared workspaces.

**Best for**: Training, skill-building, tutorials

**Features**:
- Shared digital whiteboard
- Code/document sharing
- Breakout rooms for groups
- Live code execution
- Collaborative editing tools

**Configuration**:
```json
{
  "mode": "workshop",
  "maxParticipants": 100,
  "breakoutRooms": 5,
  "sharedTools": ["whiteboard", "codeEditor", "documentEditor"],
  "recordingIncludesSharing": true
}
```

### Debate

Structured debate with timed turns.

**Best for**: Formal discussions, decision-making, structured debates

**Features**:
- Two or more sides
- Timed speaking slots
- Structured turn order
- Moderated Q&A
- Vote tracking

**Configuration**:
```json
{
  "mode": "debate",
  "maxParticipants": 100,
  "sides": 2,
  "timePerTurn": 300, // 5 minutes per speaker
  "includeModerator": true,
  "enableVoting": true
}
```

### Brainstorm

Idea collection with virtual sticky notes.

**Best for**: Creative sessions, innovation, idea generation

**Features**:
- Digital sticky note wall
- Anonymous ideas (optional)
- Category organization
- Voting/rating ideas
- Idea export to documents

**Configuration**:
```json
{
  "mode": "brainstorm",
  "maxParticipants": 50,
  "anonymousIdeas": false,
  "votingEnabled": true,
  "timeLimit": 1800 // 30 minutes
}
```

### Retrospective

Team retrospective with action items.

**Best for**: Sprint retros, project post-mortems, team feedback

**Features**:
- What Went Well / Improve / Action Items sections
- Voting on improvements
- Action item assignment
- Owner tracking
- Follow-up reminders

**Configuration**:
```json
{
  "mode": "retrospective",
  "maxParticipants": 50,
  "sections": ["wellWent", "improve", "actionItems"],
  "votingEnabled": true,
  "actionItemTracking": true
}
```

### Standup

Quick daily standup with status updates.

**Best for**: Daily standups, quick updates, status reports

**Features**:
- Time-limited updates per person
- Automatic turn passing
- Status template (Yesterday/Today/Blockers)
- Quick issues escalation
- Historical tracking

**Configuration**:
```json
{
  "mode": "standup",
  "maxParticipants": 30,
  "timePerParticipant": 300, // 5 minutes
  "autoRotate": true,
  "statusTemplate": true
}
```

### Interview

Interviewer/interviewee format meeting.

**Best for**: Job interviews, user interviews, research interviews

**Features**:
- Designated interviewer/candidate
- Question templates
- Recording for review
- Feedback forms post-interview
- Interview notes synchronized

**Configuration**:
```json
{
  "mode": "interview",
  "maxParticipants": 5,
  "interviewer": "user_interviewer123",
  "interviewee": "user_candidate456",
  "questionTemplate": true,
  "feedbackForm": true
}
```

### Presentation

Presenter with slide sharing and audience.

**Best for**: Product demos, slide presentations, training

**Features**:
- Presenter controls slides
- Audience follows automatically
- Speaker notes visible to presenter only
- Q&A during/after presentation
- Slide annotations

**Configuration**:
```json
{
  "mode": "presentation",
  "maxParticipants": 1000,
  "presenter": "user_presenter789",
  "slideAutoAdvance": false,
  "qaEnabled": true,
  "allowAnnotations": true
}
```

---

## Meeting Settings

### Participant Limits

Control meeting capacity:

**Endpoint**: `PATCH /api/collaboration/meetings/:meetingId/settings`

**Request Body**:
```json
{
  "maxParticipants": 100,
  "minParticipants": 2,
  "waitlistEnabled": true
}
```

**Participant Ranges by Mode**:
- Standard: 1-500 participants
- Round Table: 2-20 participants
- Town Hall: 10-5000 participants
- Workshop: 5-100 participants
- Debate: 3-100 participants
- Brainstorm: 3-50 participants
- Retrospective: 3-50 participants
- Standup: 3-30 participants
- Interview: 2-5 participants
- Presentation: 1-1000 participants

### Recording Settings

Control and configure recording:

**Request Body**:
```json
{
  "allowRecording": true,
  "autoRecord": false,
  "recordingFormat": "mp4",
  "recordingQuality": "1080p",
  "recordingStorage": "cloud",
  "notifyOnRecord": true
}
```

**Recording Options**:
- **Auto Record**: Automatically start recording
- **Format**: MP4 (default), WebM, MOV
- **Quality**: 720p, 1080p, 2K, 4K
- **Storage**: Cloud, local, external

### Guest Settings

**Request Body**:
```json
{
  "allowGuests": true,
  "requireApprovalToJoin": false,
  "guestMicrophoneDefault": "muted",
  "guestCameraDefault": "off",
  "guestChatPermission": "read-write"
}
```

### Meeting Lobby

Control entry experience:

**Request Body**:
```json
{
  "enableLobby": true,
  "lobbyMessage": "Welcome to our meeting! Please wait for host approval.",
  "autoAdmitAfter": 300 // 5 minutes
}
```

---

## Guest Access

### Sharing Meeting Links

Share meeting links with non-registered users:

**Public Link**: `https://milonexa.com/meetings/meeting_abc123`

Features:
- No account required to view preview
- Click to join in browser
- Guest name entry
- Optional email verification

### Guest Join Process

1. Click meeting link
2. Enter name
3. Allow camera/microphone (if required)
4. Join or wait in lobby
5. Participate in meeting

### Guest Meeting Link

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/guest-link`

**Response**:
```json
{
  "guestLink": "https://milonexa.com/meetings/guest/meeting_abc123",
  "accessCode": "GUEST-ABC-123",
  "expiresAt": "2024-01-21T10:00:00Z"
}
```

### Access Code Entry

Guests can enter access code to join:

**Process**:
1. Visit `/meetings/guest/:meetingId`
2. Enter access code
3. Verify identity if required
4. Join meeting

**Endpoint**: `POST /api/collaboration/meetings/guest/join`

**Request Body**:
```json
{
  "meetingId": "meeting_abc123",
  "accessCode": "GUEST-ABC-123",
  "guestName": "John Smith",
  "guestEmail": "john@example.com"
}
```

---

## Joining a Meeting

### Join Methods

**From Link**:
- Click meeting link from calendar invite
- Click link from email notification
- Visit direct meeting URL

**From App**:
- Select meeting from calendar
- Search meetings by title
- Browse upcoming meetings
- Join via meeting ID

**From Access Code**:
- Enter `/meetings/guest/:meetingId`
- Input unique access code
- Join as guest participant

### Pre-Join Experience

**Before Joining**:
- Test camera and microphone
- Select audio input device
- Preview video
- Check internet connection
- Read meeting notes/agenda

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/join`

**Request Body**:
```json
{
  "audioEnabled": true,
  "videoEnabled": true,
  "audioDevice": "Built-in Microphone",
  "videoDevice": "Built-in Camera"
}
```

---

## Meeting Controls

### Audio and Video Controls

**Toggle Microphone**:

**Endpoint**: `PATCH /api/collaboration/meetings/:meetingId/participants/:participantId/audio`

```json
{
  "enabled": false
}
```

**Toggle Camera**:

**Endpoint**: `PATCH /api/collaboration/meetings/:meetingId/participants/:participantId/video`

```json
{
  "enabled": false
}
```

### Screen Sharing

Share your screen or application window:

**Start Screen Share**:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/screen-share/start`

**Request Body**:
```json
{
  "shareType": "screen", // or "window" or "tab"
  "audioEnabled": true,
  "quality": "high"
}
```

**Stop Screen Share**:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/screen-share/stop`

**Screen Sharing Features**:
- Share entire screen
- Share specific window
- Share browser tab
- Audio from share
- Multiple simultaneous shares (mode-dependent)

### Raise Hand

Request to speak in large meetings:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/raise-hand`

**Response**:
```json
{
  "participantId": "user_xyz789",
  "raisedAt": "2024-01-20T10:15:00Z",
  "position": 3
}
```

Features:
- Queue position visible to all
- Host can lower hands
- Auto-lower after 5 minutes
- Notification to speaker

### Chat

Real-time messaging during meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/chat`

**Request Body**:
```json
{
  "message": "Great point about the roadmap!",
  "type": "public" // or "private" for private message
}
```

**Chat Features**:
- Public and private messages
- Emoji reactions
- File sharing in chat
- Message search
- Chat export

### Reactions

Non-verbal feedback during presentations:

**Available Reactions**:
- 👍 Thumbs Up
- 👏 Clapping
- ❤️ Love
- 😂 Laugh
- 🎉 Celebration
- 🤔 Thinking

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/reactions`

```json
{
  "emoji": "👍"
}
```

### Leave Meeting

Exit the meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/leave`

**Response**:
```json
{
  "status": "left",
  "duration": 3600,
  "leftAt": "2024-01-20T11:00:00Z"
}
```

---

## Agenda and Notes

### Meeting Agenda

Plan meeting topics and discussion items:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/agenda`

**Request Body**:
```json
{
  "items": [
    {
      "title": "Welcome and introductions",
      "duration": 5,
      "owner": "user_host123"
    },
    {
      "title": "Q1 roadmap discussion",
      "duration": 30,
      "owner": "user_pm456"
    },
    {
      "title": "Next steps and action items",
      "duration": 10,
      "owner": "user_host123"
    }
  ]
}
```

**Agenda Features**:
- Time allocations
- Item owners
- Discussion topics
- Pre-meeting planning
- Share with participants

### Real-Time Notes

Collaborative note-taking during meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/notes`

**Request Body**:
```json
{
  "content": "# Meeting Notes\n\n## Q1 Roadmap\n- Focus on mobile optimization\n- Improve API performance",
  "format": "markdown" // or "plaintext"
}
```

**Collaborative Features**:
- Multiple editors simultaneously
- Markdown or plain text
- Real-time sync
- Version history
- Export as PDF/Word

### Meeting Action Items

Track tasks assigned during meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/action-items`

**Request Body**:
```json
{
  "title": "Implement API rate limiting",
  "description": "Add rate limiting to API endpoints to prevent abuse",
  "assignee": "user_engineer789",
  "dueDate": "2024-01-27T17:00:00Z",
  "priority": "high"
}
```

**Response**:
```json
{
  "id": "action_ghi234",
  "meetingId": "meeting_abc123",
  "title": "Implement API rate limiting",
  "assignee": "user_engineer789",
  "dueDate": "2024-01-27T17:00:00Z",
  "status": "open",
  "createdAt": "2024-01-20T10:30:00Z"
}
```

### Tracking Action Items

Monitor completion of meeting tasks:

**Endpoint**: `PATCH /api/collaboration/meetings/action-items/:actionId`

**Request Body**:
```json
{
  "status": "completed",
  "completedAt": "2024-01-25T14:00:00Z"
}
```

---

## Recordings

### Starting Recording

Record meeting for later review:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/recording/start`

**Request Body**:
```json
{
  "includeChat": true,
  "includeSharedScreens": true,
  "quality": "1080p"
}
```

**Response**:
```json
{
  "recordingId": "rec_jkl567",
  "meetingId": "meeting_abc123",
  "startedAt": "2024-01-20T10:00:00Z",
  "status": "recording"
}
```

### Recording Status

Check recording in progress:

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/recording`

**Response**:
```json
{
  "recordingId": "rec_jkl567",
  "status": "recording",
  "duration": 1235, // seconds
  "size": 524288000, // bytes
  "participants": 12,
  "startedAt": "2024-01-20T10:00:00Z"
}
```

### Stopping Recording

End recording after meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/recording/stop`

**Response**:
```json
{
  "recordingId": "rec_jkl567",
  "status": "processing",
  "duration": 3600,
  "file": "recording.mp4",
  "stoppedAt": "2024-01-20T11:00:00Z"
}
```

### Accessing Recordings

View and download completed recordings:

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/recordings`

**Response**:
```json
{
  "recordings": [
    {
      "id": "rec_jkl567",
      "meetingId": "meeting_abc123",
      "name": "Q1 Product Planning - Jan 20 2024",
      "duration": 3600,
      "size": 524288000,
      "format": "mp4",
      "quality": "1080p",
      "url": "https://cdn.milonexa.com/recordings/rec_jkl567.mp4",
      "transcriptUrl": "https://cdn.milonexa.com/transcripts/rec_jkl567.vtt",
      "createdAt": "2024-01-20T11:05:00Z"
    }
  ]
}
```

### Recording Features

- **Auto Transcription**: AI-powered speech-to-text
- **Timestamps**: Find topics by timeline
- **Search**: Full-text search of transcripts
- **Chapters**: Auto-generated chapter markers
- **Export**: Download as MP4, WebM, or audio-only
- **Sharing**: Share recording link with others
- **Retention**: Configurable storage duration

### Transcript Access

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/recordings/:recordingId/transcript`

**Response**: VTT format transcript with timestamps

---

## Calendar Integration

### Adding to Google Calendar

Automatically add meetings to Google Calendar:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/calendar/google`

**Request Body**:
```json
{
  "calendarId": "primary",
  "sendNotifications": true,
  "attendees": [
    "user1@gmail.com",
    "user2@gmail.com"
  ]
}
```

**Features**:
- Automatic reminder creation
- Meeting link in calendar event
- Attendance tracking
- RSVP synchronization

### Adding to Outlook Calendar

Add meetings to Microsoft Outlook:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/calendar/outlook`

**Request Body**:
```json
{
  "sendInvites": true,
  "meetingNotes": "Q1 Product Planning\nReview roadmap items",
  "attendees": [
    "user1@outlook.com",
    "user2@outlook.com"
  ]
}
```

### iCalendar Export

Export meeting details in iCalendar format:

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/ical`

**Response**: .ics file download

**Content**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Milonexa//Meetings//EN
BEGIN:VEVENT
UID:meeting_abc123@milonexa.com
DTSTAMP:20240115T153000Z
DTSTART:20240120T100000Z
DTEND:20240120T110000Z
SUMMARY:Q1 Product Planning
DESCRIPTION:Discussing Q1 roadmap and feature priorities
LOCATION:https://milonexa.com/meetings/meeting_abc123
END:VEVENT
END:VCALENDAR
```

---

## Participant Management

### Inviting Participants

Add users to meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/invites`

**Request Body**:
```json
{
  "invitees": [
    {
      "userId": "user_abc123",
      "role": "participant" // or "host", "presenter"
    },
    {
      "email": "newuser@example.com",
      "role": "participant"
    }
  ],
  "message": "Looking forward to your input on the Q1 roadmap!"
}
```

### Muting Participants

Host can mute individual participants or all:

**Endpoint**: `PATCH /api/collaboration/meetings/:meetingId/participants/:participantId/audio`

```json
{
  "muted": true,
  "allowUnmute": true // User can unmute self
}
```

**Mute All**:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/mute-all`

```json
{
  "allowUnmute": true
}
```

### Removing Participants

Host can remove participants from meeting:

**Endpoint**: `POST /api/collaboration/meetings/:meetingId/participants/:participantId/remove`

**Response**:
```json
{
  "participantId": "user_xyz789",
  "status": "removed",
  "removedAt": "2024-01-20T10:15:00Z"
}
```

### Promoting to Co-Host

Grant co-hosting privileges:

**Endpoint**: `PATCH /api/collaboration/meetings/:meetingId/participants/:participantId/role`

**Request Body**:
```json
{
  "role": "co-host"
}
```

**Co-Host Permissions**:
- Mute/unmute others
- Remove participants
- Control recording
- Manage agenda
- End meeting for all

### Participant List

View all meeting participants:

**Endpoint**: `GET /api/collaboration/meetings/:meetingId/participants`

**Response**:
```json
{
  "participants": [
    {
      "id": "user_host123",
      "name": "Alice Johnson",
      "role": "host",
      "status": "active",
      "audioEnabled": true,
      "videoEnabled": true,
      "joinedAt": "2024-01-20T09:55:00Z"
    },
    {
      "id": "user_xyz789",
      "name": "Bob Smith",
      "role": "participant",
      "status": "active",
      "audioEnabled": false,
      "videoEnabled": true,
      "joinedAt": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 15,
  "active": 14
}
```

---

## Meeting Best Practices

1. **Schedule in Advance**: Send calendar invites with meeting link
2. **Set Agenda**: Share agenda topics before meeting
3. **Test Technology**: Verify audio/video before meeting
4. **Start On Time**: Respect participants' time
5. **Use Visuals**: Share screens and slides for clarity
6. **Document Notes**: Take notes during for action items
7. **Record When Needed**: Record important meetings for review
8. **Follow Up**: Share recording and action items after
9. **Set Ground Rules**: Agree on camera/mute expectations
10. **End Clearly**: Summarize outcomes and next steps

---

## Troubleshooting

**Can't join meeting?**
- Verify meeting link or access code
- Check internet connection
- Try different browser
- Disable VPN if applicable

**Audio/video not working?**
- Check device permissions
- Select correct audio/video device
- Test devices before joining
- Restart browser

**Screen sharing not working?**
- Ensure screen share is permitted
- Try sharing specific window instead
- Disable browser extensions
- Restart application

**Recording not starting?**
- Verify recording is enabled in settings
- Check available storage space
- Ensure host permissions active
- Try stopping and restarting

For additional support, contact support@milonexa.com.
