import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

export default function CookiePolicy() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Cookie Policy
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    We use cookies and similar technologies to provide core functionality, remember
                    preferences, and analyze usage to improve the product. Cookies do not expose your
                    private messages or sensitive data.
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Types of cookies
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        - Essential cookies: required for the site to function.
                        <br />- Preference & analytics cookies: help us improve the experience.
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                        Manage cookies
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        You can manage cookie preferences in your browser or in the site settings where available.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
