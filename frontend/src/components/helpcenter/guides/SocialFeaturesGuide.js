import React from 'react';
import { Container, Typography, Paper, Box, Card, CardContent, Alert, Divider, Chip } from '@mui/material';
import { ThumbUp, Comment, Share, People, Bookmark, TrendingUp } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function SocialFeaturesGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Social Features Guide
                </Typography>

                <Alert severity="info" sx={{ mb: 4 }}>
                    Connect with friends, share content, and build your community. This guide covers posts, reactions, friend connections, and more.
                </Alert>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        <ThumbUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Creating Posts
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        Share your thoughts, photos, videos, and links with your network.
                    </Typography>

                    <Card sx={{ mt: 2, bgcolor: 'action.hover' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={500}>
                                Text Posts
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                1. Click <strong>"What's on your mind?"</strong> in the post composer
                                <br />2. Type your message (supports rich text formatting)
                                <br />3. Add hashtags with # to categorize your post
                                <br />4. Select visibility (Public, Friends, Private)
                                <br />5. Click <strong>Post</strong>
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Media Posts (Photos/Videos)
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                1. Click the <strong>Photo/Video icon</strong> in the composer
                                <br />2. Upload files (JPG, PNG, GIF, MP4, WebM)
                                <br />3. Add captions and tag friends
                                <br />4. Apply filters or crop images
                                <br />5. Review and post
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Link Sharing
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                1. Paste a URL into the post composer
                                <br />2. The platform will automatically fetch a preview (title, image, description)
                                <br />3. Edit the preview text if needed
                                <br />4. Add your commentary and post
                            </Typography>
                        </CardContent>
                    </Card>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500}>
                            Anonymous posting
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Toggle "Post anonymously" in the composer to publish without your profile being
                            associated publicly. Anonymous posts display a platform pseudonym (e.g. "Anonymous • Anon•A1b2")
                            and will not appear on your public profile or in your visible post history.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Pseudonyms are persistent within a community so your pseudonym remains the same inside
                            that community. Attachments and links are allowed but are scanned and moderated. Anonymous
                            posts remain subject to community rules and moderation.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            If you need anonymous content removed, use the post's menu and choose "Request deletion" or submit a Help Center support ticket. The "Request deletion" menu option will open the Help Center with prefilled challenge metadata (approximate post time and device class) to simplify verification. Because anonymous posts/comments are not linked to your public profile, you cannot edit or delete them from your account or post history — removal must be handled via the deletion-request process. The platform stores only a sealed, encrypted mapping for internal moderation; that mapping is inaccessible to users and is zeroized after the retention period (default: 1 year). The platform does not provide a routine unmasking mechanism.
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            <Comment sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Reactions & Comments
                        </Typography>

                        <Box sx={{ ml: 2 }}>
                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Reacting to Posts
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Click the <strong>thumbs-up icon</strong> for a quick Like
                                <br />• Long-press or hover for more reactions: Love ❤️, Laugh 😂, Wow 😮, Sad 😢, Angry 😠
                                <br />• Click again to remove your reaction
                                <br />• See who reacted by clicking the reaction count
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Commenting
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Click <strong>Comment</strong> below any post
                                <br />• Write your reply (supports @mentions)
                                <br />• Add emojis using the emoji picker
                                <br />• Reply to specific comments by clicking <strong>Reply</strong>
                                <br />• Edit your comments within 15 minutes (shows "edited" label)
                                <br />• Delete your comments anytime from the menu (⋮)
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Mentions & Tagging
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Type @ followed by a name to mention someone
                                <br />• Tagged users receive a notification
                                <br />• Control who can tag you in <strong>Settings → Privacy</strong>
                            </Typography>
                        </Box>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            <Share sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Sharing Content
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph sx={{ ml: 2 }}>
                            • Click <strong>Share</strong> under any post
                            <br />• Choose: Share Now (your profile), Share to Group, Send in Message
                            <br />• Add your own thoughts when sharing
                            <br />• Original post author gets notified when shared
                            <br />• Reshares count is displayed on the original post
                        </Typography>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            <People sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Friend Connections
                        </Typography>

                        <Box sx={{ ml: 2 }}>
                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Sending Friend Requests
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                1. Find users via Search or suggested friends
                                <br />2. Visit their profile
                                <br />3. Click <strong>Add Friend</strong>
                                <br />4. Optionally add a personal message
                                <br />5. Wait for them to accept
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Managing Friend Requests
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • View pending requests: Click <strong>Friends icon</strong> → <strong>Requests</strong>
                                <br />• Accept: Click <strong>Confirm</strong>
                                <br />• Decline: Click <strong>Delete</strong> (user won't be notified)
                                <br />• See mutual friends before accepting
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Unfriending
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Visit the friend's profile
                                <br />• Click <strong>Friends</strong> button → <strong>Unfriend</strong>
                                <br />• They won't be notified
                                <br />• You'll no longer see each other's content (unless public)
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Following vs Friends
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • <strong>Friends</strong>: Two-way connection, both see each other's content
                                <br />• <strong>Follow</strong>: One-way, you see their public posts without friend request
                                <br />• You can follow pages, groups, and public profiles without friending
                            </Typography>
                        </Box>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            <Bookmark sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Saving & Bookmarking
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph sx={{ ml: 2 }}>
                            • Click the <strong>bookmark icon</strong> on any post to save it
                            <br />• Access saved posts: Left sidebar → <strong>Saved</strong>
                            <br />• Organize saves into collections (e.g., "Inspiration", "Recipes", "Read Later")
                            <br />• Unsave by clicking the bookmark icon again
                        </Typography>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Discovering Content
                        </Typography>

                        <Box sx={{ ml: 2 }}>
                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Feeds & Filters
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • <strong>Home Feed</strong>: Algorithmic mix of friends and followed pages
                                <br />• <strong>Recent</strong>: Chronological timeline (most recent first)
                                <br />• <strong>Trending</strong>: Popular posts in your network
                                <br />• Switch views using tabs at the top of your feed
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Explore Page
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Navigate to <strong>Explore</strong> from the main menu
                                <br />• Browse trending topics, hashtags, and viral content
                                <br />• Filter by content type: Photos, Videos, Articles
                                <br />• Discover new users and pages to follow
                            </Typography>

                            <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                                Hashtags
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                • Click any hashtag to see all posts using it
                                <br />• Follow hashtags to see related content in your feed
                                <br />• Use specific hashtags like #TechNews or #Photography to find communities
                            </Typography>
                        </Box>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            Groups & Communities
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph sx={{ ml: 2 }}>
                            • <strong>Join Groups</strong>: Search for groups or browse suggestions
                            <br />• <strong>Group Types</strong>: Public (anyone can join), Private (request needed), Secret (invite-only)
                            <br />• <strong>Create Your Own</strong>: Click <strong>Create Group</strong>, set name, description, rules, and privacy
                            <br />• <strong>Group Posts</strong>: Content shared in groups is visible only to members
                            <br />• <strong>Group Roles</strong>: Admin (full control), Moderator (manage posts), Member (post and comment)
                        </Typography>
                    </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Tips for Better Engagement
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                            <Chip label="Post consistently" size="small" />
                            <Chip label="Use hashtags strategically" size="small" />
                            <Chip label="Respond to comments" size="small" />
                            <Chip label="Engage with others' content" size="small" />
                            <Chip label="Share quality content" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Need help with specific features? Check out <Link to="/helpcenter/faq">FAQ</Link> or <Link to="/helpcenter/tickets">Submit a Ticket</Link>
                        </Typography>
                    </Box>
                </Paper>
        </Container>
    );
}
