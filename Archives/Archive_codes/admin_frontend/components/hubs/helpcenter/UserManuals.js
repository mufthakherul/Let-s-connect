import React, { useState } from 'react';
import {
    Container, Typography, Paper, Box, Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, Divider, Chip, Button
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function UserManuals() {
    const [expanded, setExpanded] = useState(false);

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const manuals = [
        {
            category: 'Getting Started',
            description: 'Create your account and learn the basics.',
            path: '/helpcenter/manuals/getting-started',
            topics: ['Account creation', 'Profile setup', 'Dashboard basics', 'Privacy controls']
        },
        {
            category: 'Profile Guide',
            description: 'Update your profile, skills, and visibility.',
            path: '/helpcenter/manuals/profile',
            topics: ['Profile details', 'Skills and highlights', 'Privacy settings', 'Public visibility']
        },
        {
            category: 'Search Guide',
            description: 'Find people, posts, and content quickly.',
            path: '/helpcenter/manuals/search',
            topics: ['Basic search', 'Filters', 'Saved searches', 'Tips']
        },
        {
            category: 'Advanced Search Guide',
            description: 'Use precise filters and advanced fields.',
            path: '/helpcenter/manuals/advanced-search',
            topics: ['Content type', 'Date range', 'Field filters', 'Saved queries']
        },
        {
            category: 'Social Features Guide',
            description: 'Create posts, connect with others, and manage communities.',
            path: '/helpcenter/manuals/social',
            topics: ['Posts and sharing', 'Reactions and comments', 'Groups and communities', 'Moderation']
        },
        {
            category: 'Groups Guide',
            description: 'Join communities and manage group settings.',
            path: '/helpcenter/manuals/groups',
            topics: ['Join groups', 'Create groups', 'Roles and rules', 'Moderation']
        },
        {
            category: 'Pages Guide',
            description: 'Create and manage pages for brands or communities.',
            path: '/helpcenter/manuals/pages',
            topics: ['Create a page', 'Publish posts', 'Roles and admins', 'Page insights']
        },
        {
            category: 'Bookmarks Guide',
            description: 'Save posts and organize collections.',
            path: '/helpcenter/manuals/bookmarks',
            topics: ['Save items', 'Collections', 'Organization', 'Cleanup']
        },
        {
            category: 'Messaging & Chat Guide',
            description: 'Direct messages, group chats, and media sharing.',
            path: '/helpcenter/manuals/messaging',
            topics: ['Start a chat', 'Group conversations', 'Media sharing', 'Notifications']
        },
        {
            category: 'Calls Guide',
            description: 'Start voice and video calls.',
            path: '/helpcenter/manuals/calls',
            topics: ['Start a call', 'In-call controls', 'Devices', 'Troubleshooting']
        },
        {
            category: 'Videos Guide',
            description: 'Upload, manage, and watch videos.',
            path: '/helpcenter/manuals/videos',
            topics: ['Upload', 'Manage library', 'Watch and engage', 'Quality tips']
        },
        {
            category: 'Live TV (IPTV) Guide',
            description: 'Browse channels and watch live TV.',
            path: '/helpcenter/manuals/live-tv',
            topics: ['Browse channels', 'Player controls', 'Favorites', 'Troubleshooting']
        },
        {
            category: 'Live Radio Guide',
            description: 'Find stations and build playlists.',
            path: '/helpcenter/manuals/live-radio',
            topics: ['Find stations', 'Favorites', 'Playlists', 'Troubleshooting']
        },
        {
            category: 'Meetings & Collaboration Guide',
            description: 'Schedule meetings and collaborate.',
            path: '/helpcenter/manuals/meetings',
            topics: ['Scheduling', 'Joining calls', 'Screen sharing', 'Notes']
        },
        {
            category: 'Docs and Wiki Guide',
            description: 'Create documents and maintain wikis.',
            path: '/helpcenter/manuals/docs',
            topics: ['Docs', 'Wiki pages', 'Permissions', 'Version history']
        },
        {
            category: 'Projects Guide',
            description: 'Plan work and track delivery.',
            path: '/helpcenter/manuals/projects',
            topics: ['Create projects', 'Tasks', 'Milestones', 'Reports']
        },
        {
            category: 'Shop Guide',
            description: 'Browse products and place orders.',
            path: '/helpcenter/manuals/shop',
            topics: ['Browse products', 'Checkout', 'Orders', 'Returns']
        },
        {
            category: 'Cart Guide',
            description: 'Manage cart items and discounts.',
            path: '/helpcenter/manuals/cart',
            topics: ['Add items', 'Quantities', 'Discounts', 'Checkout']
        },
        {
            category: 'Blog Guide',
            description: 'Read, write, and manage blog content.',
            path: '/helpcenter/manuals/blog',
            topics: ['Browse', 'Publish', 'Comments', 'Moderation']
        },
        {
            category: 'Folders Guide',
            description: 'Organize and share files.',
            path: '/helpcenter/manuals/folders',
            topics: ['Create folders', 'Upload files', 'Share access', 'Permissions']
        },
        {
            category: 'Wiki Diff Guide',
            description: 'Compare wiki changes and review edits.',
            path: '/helpcenter/manuals/wiki-diff',
            topics: ['Select versions', 'Review changes', 'Resolve edits', 'History']
        },
        {
            category: 'Database Views Guide',
            description: 'Build views, filters, and schemas.',
            path: '/helpcenter/manuals/databases',
            topics: ['Create view', 'Fields', 'Filters', 'Sorting']
        },
        {
            category: 'Email Settings Guide',
            description: 'Control email notification preferences.',
            path: '/helpcenter/manuals/email-settings',
            topics: ['Notification types', 'Digest frequency', 'Opt out', 'Troubleshooting']
        }
    ];

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    User Manuals
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    Detailed, feature-specific manuals. Select a category to open its full guide.
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`${manuals.length} Guides`} />
                    <Chip size="small" label={`${manuals.reduce((sum, m) => sum + m.topics.length, 0)} Topics`} color="primary" />
                </Box>

                <Divider sx={{ mb: 3 }} />

                {manuals.map((manual, index) => (
                    <Accordion
                        key={index}
                        expanded={expanded === `panel${index}`}
                        onChange={handleChange(`panel${index}`)}
                        sx={{ mb: 1 }}
                    >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h6" fontWeight={600}>
                                {manual.category}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {manual.description}
                            </Typography>

                            <List dense>
                                {manual.topics.map((topic, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemText primary={topic} />
                                    </ListItem>
                                ))}
                            </List>

                            <Box sx={{ mt: 2 }}>
                                <Button variant="contained" component={Link} to={manual.path}>
                                    Open guide
                                </Button>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}

                <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Need more help? Visit our <Link to="/helpcenter/faq">FAQ</Link> or{' '}
                        <Link to="/helpcenter/tickets">submit a support ticket</Link>.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
