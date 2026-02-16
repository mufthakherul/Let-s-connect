import React from 'react';
import { Container, Typography, Paper, Box, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { Link } from 'react-router-dom';
import {
    MenuBook as ManualIcon,
    QuestionAnswer as QAIcon,
    Feedback as FeedbackIcon,
    SupportAgent as TicketIcon
} from '@mui/icons-material';

export default function HelpCenter() {
    const sections = [
        {
            title: 'User Manuals',
            description: 'Step-by-step guides for all platform features',
            icon: <ManualIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
            link: '/helpcenter/manuals'
        },
        {
            title: 'Q&A / FAQ',
            description: 'Frequently asked questions and answers',
            icon: <QAIcon sx={{ fontSize: 48, color: 'success.main' }} />,
            link: '/helpcenter/faq'
        },
        {
            title: 'Feedback',
            description: 'Share your thoughts and suggestions with us',
            icon: <FeedbackIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
            link: '/helpcenter/feedback'
        },
        {
            title: 'Support Ticket',
            description: 'Get help from our support team',
            icon: <TicketIcon sx={{ fontSize: 48, color: 'error.main' }} />,
            link: '/helpcenter/tickets'
        }
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h3" gutterBottom fontWeight={700} textAlign="center">
                    Help Center
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph textAlign="center" sx={{ mb: 4 }}>
                    Find answers, get support, and learn how to make the most of Let's Connect
                </Typography>

                <Grid container spacing={3}>
                    {sections.map((section, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card
                                sx={{
                                    height: '100%',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4
                                    }
                                }}
                            >
                                <CardActionArea component={Link} to={section.link} sx={{ height: '100%' }}>
                                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                        <Box sx={{ mb: 2 }}>{section.icon}</Box>
                                        <Typography variant="h6" gutterBottom fontWeight={600}>
                                            {section.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {section.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{ mt: 6, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Can't find what you're looking for?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Contact our support team at <strong>support@letsconnect.com</strong> or submit a support ticket.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
