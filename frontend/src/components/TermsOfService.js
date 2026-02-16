import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

export default function TermsOfService() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Terms of Service
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    These Terms govern your use of Let's Connect. By accessing or using the service you agree
                    to these Terms. If you do not agree, please do not use the service.
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Use of the service
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        You agree to use the platform lawfully and not to post prohibited content. Respect other
                        users and follow community guidelines.
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                        User content
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        You retain ownership of content you post. By posting you grant the platform a license to
                        display and distribute that content as required to operate the service.
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                        Termination & liability
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        We may suspend or terminate accounts that violate these Terms. The platform is provided
                        "as is"; see the full legal text for limitations and disclaimers.
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        This page contains a summary for convenience — consult a legal advisor for a full review.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
