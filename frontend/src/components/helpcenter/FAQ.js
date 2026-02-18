import React, { useState } from 'react';
import {
    Container, Typography, Paper, Box, Accordion, AccordionSummary, AccordionDetails,
    TextField, InputAdornment, Chip
} from '@mui/material';
import { ExpandMore, Search } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function FAQ() {
    const [expanded, setExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const faqs = [
        {
            category: 'Account & Profile',
            questions: [
                {
                    q: 'How do I create an account?',
                    a: 'Click the "Get Started" or "Register" button on the homepage. Enter your email, choose a password, and follow the verification steps.'
                },
                {
                    q: 'Can I change my username?',
                    a: 'Yes, go to your Profile settings and update your display name. Note that your unique username handle may have restrictions.'
                },
                {
                    q: 'How do I reset my password?',
                    a: 'Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to your inbox.'
                }
            ]
        },
        {
            category: 'Privacy & Security',
            questions: [
                {
                    q: 'Who can see my posts?',
                    a: 'By default, posts are public. You can change the visibility to "Friends Only" or "Private" when creating a post.'
                },
                {
                    q: 'Can I post anonymously?',
                    a: 'Yes. Registered users may toggle "Post anonymously" when composing — anonymous posts/comments display a platform pseudonym (for example "Anonymous • Anon•A1b2") and are not linked to your public profile or visible post history. The public record contains no user-identifying fields. Because anonymous items are not associated with your profile you cannot edit or remove them from your account directly. To remove an anonymous post/comment, submit a deletion request (use the post menu → "Request deletion" or open a Help Center support ticket). The post menu option will prefill a Help Center request with limited challenge metadata (approximate time and device class) to help verify ownership. The platform will verify the challenge and, if validated, archive and remove the item from public view. Anonymous content remains subject to moderation and community rules.'
                },
                {
                    q: 'How is my data protected?',
                    a: 'We use encryption in transit (TLS), regular security audits, and role-based access controls. See our Privacy Policy for details.'
                },
                {
                    q: 'Can I delete my account?',
                    a: 'Yes, go to Settings → Account and select "Delete Account". This action is permanent and cannot be undone.'
                }
            ]
        },
        {
            category: 'Features & Usage',
            questions: [
                {
                    q: 'How do I join a meeting?',
                    a: 'Click on the meeting link or go to Meetings in the navigation, find your scheduled meeting, and click "Join".'
                },
                {
                    q: 'Can I upload videos?',
                    a: 'Yes, navigate to Videos and click "Upload". Supported formats include MP4, WebM, and MOV (max 500MB).'
                },
                {
                    q: 'How do I create a support ticket?',
                    a: 'Visit the Help Center and select "Support Ticket" to submit your issue. You\'ll receive a tracking number via email.'
                }
            ]
        },
        {
            category: 'Billing & Subscription',
            questions: [
                {
                    q: 'Is Let\'s Connect free?',
                    a: 'Yes, the core platform is free to use. Premium features may be added in the future with optional subscriptions.'
                },
                {
                    q: 'How do I cancel my subscription?',
                    a: 'If you have a paid plan, go to Settings → Billing and select "Cancel Subscription". You\'ll retain access until the end of the billing period.'
                }
            ]
        }
    ];

    const filteredFAQs = faqs.map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
            (faq) =>
                faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter((cat) => cat.questions.length > 0);

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Frequently Asked Questions
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    Quick answers to common questions. Can't find what you're looking for? Try our search.
                </Typography>

                <TextField
                    fullWidth
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 3 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        )
                    }}
                />

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    <Chip
                        size="small"
                        label={`${filteredFAQs.reduce((sum, cat) => sum + cat.questions.length, 0)} Questions`}
                        color="primary"
                    />
                </Box>

                {filteredFAQs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            No FAQs match your search. Try different keywords or{' '}
                            <Link to="/helpcenter/tickets">submit a support ticket</Link>.
                        </Typography>
                    </Box>
                ) : (
                    filteredFAQs.map((category, catIndex) => (
                        <Box key={catIndex} sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                                {category.category}
                            </Typography>
                            {category.questions.map((faq, idx) => (
                                <Accordion
                                    key={idx}
                                    expanded={expanded === `panel${catIndex}-${idx}`}
                                    onChange={handleChange(`panel${catIndex}-${idx}`)}
                                    sx={{ mb: 1 }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography fontWeight={500}>{faq.q}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">
                                            {faq.a}
                                        </Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    ))
                )}

                <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Still have questions? <Link to="/helpcenter/tickets">Contact support</Link> or check our{' '}
                        <Link to="/helpcenter/manuals">user manuals</Link>.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
