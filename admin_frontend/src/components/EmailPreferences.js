import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Switch,
    FormControlLabel,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getApiUrl } from '../utils/api';

const EmailPreferences = () => {
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        digestEmails: false,
        marketingEmails: false,
        weeklyDigest: false,
        dailyDigest: false
    });

    const [testEmail, setTestEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    useEffect(() => {
        // Load user preferences from localStorage or API
        const saved = localStorage.getItem('emailPreferences');
        if (saved) {
            setPreferences(JSON.parse(saved));
        }
    }, []);

    const handlePreferenceChange = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSavePreferences = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(getApiUrl(`/user/email-preferences/${userId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify(preferences)
            });

            if (response.ok) {
                localStorage.setItem('emailPreferences', JSON.stringify(preferences));
                setMessage({ type: 'success', text: 'Email preferences saved successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save preferences' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        setTestLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(getApiUrl(`/notifications/${userId}/email`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    title: 'Test Email from Let\'s Connect',
                    message: 'This is a test email to verify your email preferences are working correctly.',
                    actionUrl: window.location.origin + '/dashboard'
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `Test email sent to ${testEmail}!` });
                setTestEmail('');
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Failed to send test email' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Email Preferences
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Paper elevation={3} sx={{ p: 3 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Notification Settings
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={preferences.emailNotifications}
                                    onChange={() => handlePreferenceChange('emailNotifications')}
                                />
                            }
                            label="Enable Email Notifications"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1, ml: 4, color: 'gray' }}>
                            Receive email notifications for important account activities
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Digest Options
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={preferences.digestEmails}
                                    onChange={() => handlePreferenceChange('digestEmails')}
                                />
                            }
                            label="Enable Digest Emails"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1, ml: 4, color: 'gray' }}>
                            Receive a summary of your activity in one email
                        </Typography>

                        {preferences.digestEmails && (
                            <Box sx={{ ml: 4, mt: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.dailyDigest}
                                            onChange={() => handlePreferenceChange('dailyDigest')}
                                        />
                                    }
                                    label="Daily Digest (each morning)"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.weeklyDigest}
                                            onChange={() => handlePreferenceChange('weeklyDigest')}
                                        />
                                    }
                                    label="Weekly Digest (every Monday)"
                                />
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Marketing
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={preferences.marketingEmails}
                                    onChange={() => handlePreferenceChange('marketingEmails')}
                                />
                            }
                            label="Enable Marketing Emails"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1, ml: 4, color: 'gray' }}>
                            Receive updates about new features and special offers
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Test Email
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Enter email to test"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                type="email"
                            />
                            <Button
                                variant="contained"
                                onClick={handleSendTestEmail}
                                disabled={testLoading}
                                startIcon={testLoading ? <CircularProgress size={20} /> : <SendIcon />}
                            >
                                Send Test
                            </Button>
                        </Stack>
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'gray' }}>
                            Send a test email to verify your settings are working
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={handleSavePreferences}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                        >
                            {loading ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Container>
    );
};

export default EmailPreferences;
