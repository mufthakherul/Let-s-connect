import React from 'react';
import { Container, Typography, Paper, Box, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Privacy Policy
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    We respect your privacy. This page explains what information we collect, why we
                    collect it, and how you can control or delete your data. We aim to keep data handling
                    transparent and to minimize the amount of personal information we store.
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Data we collect
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Basic account information (name, email), user-generated content (posts, media), and
                        telemetry necessary to provide and improve the service. We do not sell your personal data.
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                        How we use data
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        To provide core features (social feed, messaging, media playback), to secure the
                        platform, and to comply with legal obligations. Data usage is limited to the purpose
                        stated and retained only as long as necessary.
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                        Your choices
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        You can view, edit or delete your profile and content from your account settings. For
                        specific data requests contact our support team.
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        For full legal text, please review the <MuiLink component={Link} to="/terms">Terms of Service</MuiLink>.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
