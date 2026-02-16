import React from 'react';
import { Container, Typography, Paper, Box, Stepper, Step, StepLabel, StepContent, Alert, Divider } from '@mui/material';
import { CheckCircle, ArrowForward } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function GettingStartedGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Getting Started with Let's Connect
                </Typography>

                <Alert severity="info" sx={{ mb: 4 }}>
                    New to the platform? This guide will walk you through creating your account, setting up your profile, and understanding the basics.
                </Alert>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        1. Creating Your Account
                    </Typography>

                    <Stepper orientation="vertical" sx={{ mt: 2 }}>
                        <Step active expanded>
                            <StepLabel StepIconComponent={() => <CheckCircle color="success" />}>
                                Navigate to Registration
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Visit the homepage and click the <strong>"Get Started"</strong> or <strong>"Register"</strong> button in the navigation bar.
                                </Typography>
                            </StepContent>
                        </Step>

                        <Step active expanded>
                            <StepLabel StepIconComponent={() => <CheckCircle color="success" />}>
                                Fill in Your Details
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Enter your email address, choose a secure password (min 8 characters), and provide your first and last name.
                                </Typography>
                                <Alert severity="warning" sx={{ mt: 1 }}>
                                    Password must contain: uppercase, lowercase, number, and special character.
                                </Alert>
                            </StepContent>
                        </Step>

                        <Step active expanded>
                            <StepLabel StepIconComponent={() => <CheckCircle color="success" />}>
                                Verify Your Email
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Check your inbox for a verification email. Click the link to activate your account. (Check spam folder if not received within 5 minutes.)
                                </Typography>
                            </StepContent>
                        </Step>

                        <Step active expanded>
                            <StepLabel StepIconComponent={() => <CheckCircle color="success" />}>
                                Complete Onboarding
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Follow the onboarding wizard to set preferences: theme (light/dark), accessibility options, and initial interests.
                                </Typography>
                            </StepContent>
                        </Step>
                    </Stepper>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        2. Setting Up Your Profile
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        A complete profile helps others connect with you and improves your experience on the platform.
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Profile Photo
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Click your avatar in the top-right corner → <strong>View/Switch Profile</strong>
                            <br />• Click the camera icon on your profile picture
                            <br />• Upload an image (JPG, PNG, max 5MB)
                            <br />• Crop and adjust as needed, then save
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Bio & About Section
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Navigate to <strong>Profile</strong> → <strong>Edit Profile</strong>
                            <br />• Add a short bio (max 200 characters) that describes you
                            <br />• Fill in optional fields: location, website, birthday
                            <br />• Save changes
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Skills & Interests
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Scroll to the <strong>Skills</strong> section on your profile
                            <br />• Click <strong>Add Skill</strong> and enter relevant skills (e.g., JavaScript, Design, Marketing)
                            <br />• Add interests to help the algorithm suggest relevant content and connections
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        3. Navigating the Dashboard
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        Once logged in, you'll see the main dashboard with several key sections:
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Navigation Bar (Top)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • <strong>Search Icon</strong>: Find users, posts, videos, and content
                            <br />• <strong>Notifications</strong>: Bell icon shows activity and mentions
                            <br />• <strong>Messages</strong>: Quick access to chat conversations
                            <br />• <strong>Profile Menu</strong>: Avatar dropdown for settings and logout
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Left Sidebar (Desktop)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Quick links to Feed, Groups, Pages, Projects, Shop, Videos
                            <br />• Recent groups and bookmarked content
                            <br />• Accessibility and theme shortcuts
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Main Feed
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Central content area showing posts from friends and followed pages
                            <br />• Create new posts using the composer at the top
                            <br />• React, comment, and share posts inline
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Mobile Navigation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Tap the <strong>hamburger menu (☰)</strong> in the top-left to open the drawer
                            <br />• Access all features from the mobile drawer menu
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        4. Understanding Privacy Settings
                    </Typography>

                    <Typography variant="body1" color="text.secondary" paragraph>
                        Control who can see your content and activity:
                    </Typography>

                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Post Visibility
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            When creating a post, select visibility:
                            <br />• <strong>Public</strong>: Anyone can see (default)
                            <br />• <strong>Friends Only</strong>: Only your connections
                            <br />• <strong>Private</strong>: Only you can see
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Profile Privacy
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Go to <strong>Settings</strong> → <strong>Privacy</strong>:
                            <br />• Choose who can send you friend requests
                            <br />• Control who can see your friends list
                            <br />• Manage who can tag you in posts
                        </Typography>

                        <Typography variant="h6" gutterBottom fontWeight={500} sx={{ mt: 3 }}>
                            Activity Status
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            • Toggle <strong>Show Active Status</strong> to control whether others see when you're online
                            <br />• Manage in Settings → Privacy → Activity Status
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        <ArrowForward sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Next Steps
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        • Explore <Link to="/helpcenter/manuals/social">Social Features</Link> to start posting and connecting
                        <br />• Learn about <Link to="/helpcenter/manuals/messaging">Messaging & Chat</Link>
                        <br />• Visit <Link to="/helpcenter/faq">FAQ</Link> for quick answers
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
