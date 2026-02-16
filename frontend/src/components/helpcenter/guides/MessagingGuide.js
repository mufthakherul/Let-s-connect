import React from 'react';
import { Container, Typography, Paper, Box, Alert, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Chat, Group, Videocam, Phone, AttachFile, EmojiEmotions, Block, Security } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function MessagingGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Messaging & Chat Guide
                </Typography>

                <Alert severity="info" sx={{ mb: 4 }}>
                    Stay connected with private conversations, group chats, voice/video calls, and real-time messaging features.
                </Alert>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        <Chat sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Starting Conversations
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Direct Messages (1-on-1)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            1. Click the <strong>Messages icon</strong> in the top navigation
                            <br />2. Click <strong>New Message</strong> or <strong>+ icon</strong>
                            <br />3. Search for a friend by name
                            <br />4. Select the person and start typing
                            <br />5. Press Enter to send
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Quick Message from Profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Visit any friend's profile
                            <br />• Click the <strong>Message</strong> button
                            <br />• Chat window opens automatically
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        <Group sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Group Chats
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Creating a Group Chat
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            1. Go to Messages → <strong>Create Group</strong>
                            <br />2. Name your group (e.g., "Project Team", "Weekend Plans")
                            <br />3. Select participants (min 2 people, max 250)
                            <br />4. Optional: Add a group photo
                            <br />5. Click <strong>Create</strong>
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Managing Group Chats
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • <strong>Add Members</strong>: Click group name → Add Members → Select friends
                            <br />• <strong>Remove Members</strong>: Group settings → Members → Remove (admin only)
                            <br />• <strong>Change Group Name</strong>: Click group name → Edit Name
                            <br />• <strong>Change Photo</strong>: Tap group photo → Edit Group Photo
                            <br />• <strong>Mute Notifications</strong>: Settings → Mute (15 min, 1 hr, 24 hr, always)
                            <br />• <strong>Leave Group</strong>: Group settings → Leave Group
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Group Admin Features
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Set member permissions (who can add/remove members)
                            <br />• Pin important messages
                            <br />• Approve new members (if approval required)
                            <br />• Delete messages from all participants
                            <br />• Designate other admins
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        Message Features & Rich Content
                    </Typography>

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <EmojiEmotions color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Emojis & Reactions"
                                secondary="Click emoji icon to insert emojis. React to messages by hovering and clicking a reaction. Available reactions: ❤️ 😂 😮 😢 😠 👍 👎"
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <AttachFile color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="File Attachments"
                                secondary="Attach documents, images, videos, audio files (max 100MB). Click paperclip icon → Select file → Send. Recipients can download or preview inline."
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <Chat color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Voice Messages"
                                secondary="Hold microphone icon to record voice message (max 5 min). Release to send, swipe left to cancel. Playback speed: 1x, 1.5x, 2x."
                            />
                        </ListItem>

                        <ListItem>
                            <ListItemIcon>
                                <Videocam color="primary" />
                            </ListItemIcon>
                            <ListItemText
                                primary="GIFs & Stickers"
                                secondary="Click GIF icon to browse trending GIFs or search. Sticker packs available in message settings. Create custom stickers from your photos."
                            />
                        </ListItem>
                    </List>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        <Phone sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Voice & Video Calls
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Starting Calls
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • <strong>Voice Call</strong>: Open chat → Click phone icon
                            <br />• <strong>Video Call</strong>: Open chat → Click video camera icon
                            <br />• <strong>Group Calls</strong>: Works for up to 50 participants
                            <br />• Calls support screen sharing, background blur, and virtual backgrounds
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            During Calls
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • <strong>Mute/Unmute</strong>: Click microphone icon or press Ctrl/Cmd + D
                            <br />• <strong>Video On/Off</strong>: Click camera icon or press Ctrl/Cmd + E
                            <br />• <strong>Share Screen</strong>: Click screen icon → Select window/screen
                            <br />• <strong>Add Participants</strong>: Click "+" icon to invite more people
                            <br />• <strong>Chat</strong>: Send text messages during call (sidebar)
                            <br />• <strong>Settings</strong>: Adjust audio/video quality, change camera/mic
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Call Settings
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Settings → Calls:
                            <br />• Test camera and microphone
                            <br />• Select default devices
                            <br />• Enable noise cancellation
                            <br />• Set call ringtone
                            <br />• Auto-answer calls (on/off)
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        Message Management
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Search Messages
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Click search icon in Messages
                            <br />• Type keywords, names, or dates
                            <br />• Filter by: Messages, Files, Links, Media
                            <br />• Jump to message in conversation
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Deleting Messages
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • <strong>Delete for You</strong>: Message disappears from your view only
                            <br />• <strong>Delete for Everyone</strong>: Removes for all participants (within 1 hour of sending)
                            <br />• Hover over message → Click menu (⋮) → Delete
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Archiving Conversations
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Swipe left on chat (mobile) or right-click (desktop)
                            <br />• Select <strong>Archive</strong>
                            <br />• View archived chats: Messages → Archived
                            <br />• Unarchive by opening chat or selecting Unarchive
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Pinning Important Chats
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Long-press chat (mobile) or right-click (desktop)
                            <br />• Select <strong>Pin</strong>
                            <br />• Pinned chats appear at top of messages list
                            <br />• Pin up to 5 conversations
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        <Security sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Privacy & Security
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            End-to-End Encryption
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • All direct messages are encrypted by default
                            <br />• Only you and recipient can read messages
                            <br />• Look for the lock icon in chat header
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Blocking Users
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Open chat → Menu (⋮) → <strong>Block</strong>
                            <br />• Blocked users can't message or call you
                            <br />• Manage blocked list: Settings → Privacy → Blocked Users
                            <br />• Unblock anytime from same menu
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Message Requests
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Messages from non-friends go to <strong>Message Requests</strong>
                            <br />• Review before accepting
                            <br />• Accept: Conversation moves to main inbox
                            <br />• Decline: Sender not notified, messages deleted
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Disappearing Messages
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Enable in chat settings: Menu → Disappearing Messages
                            <br />• Choose timer: 24 hours, 7 days, 90 days
                            <br />• Messages auto-delete after timer expires
                            <br />• Works for all future messages in that chat
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        Notifications
                    </Typography>

                    <Typography variant="body2" color="text.secondary" paragraph sx={{ ml: 2 }}>
                        • <strong>Sound & Popup</strong>: Enable/disable in Settings → Notifications → Messages
                        <br />• <strong>Mute Chats</strong>: Individual chat settings → Mute (temporary)
                        <br />• <strong>Preview</strong>: Show/hide message content in notifications
                        <br />• <strong>Desktop Notifications</strong>: Enable browser notifications for instant alerts
                        <br />• <strong>Read Receipts</strong>: Control if others see when you've read messages (Settings → Privacy)
                    </Typography>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        <Block sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Reporting Issues
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        If someone is harassing you or sending inappropriate content:
                        <br />• Open chat → Menu (⋮) → <strong>Report</strong>
                        <br />• Select reason: Spam, Harassment, Inappropriate Content
                        <br />• Our team reviews reports within 24 hours
                        <br />• Learn more in our <Link to="/helpcenter/faq">FAQ</Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
