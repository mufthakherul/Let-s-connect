import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Paper,
    TextField,
    Typography,
    Stack,
    Divider,
    Alert,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { getApiUrl } from '../utils/api';

const Login = () => {
    const [loginMode, setLoginMode] = useState('email'); // 'email' or 'oauth'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl('/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const { token, user } = await response.json();
                localStorage.setItem('token', token);
                localStorage.setItem('userId', user.id);
                localStorage.setItem('user', JSON.stringify(user));
                window.location.href = '/dashboard';
            } else {
                const err = await response.json();
                setError(err.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            // Get authorization URL from backend
            const response = await fetch(getApiUrl('/auth/oauth/google/authorize'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const { authorizationUrl } = await response.json();
                // Redirect to Google login page
                window.location.href = authorizationUrl;
            } else {
                setError('Failed to initiate Google login');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = async () => {
        setLoading(true);
        try {
            // Get authorization URL from backend
            const response = await fetch(getApiUrl('/auth/oauth/github/authorize'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const { authorizationUrl } = await response.json();
                // Redirect to GitHub login page
                window.location.href = authorizationUrl;
            } else {
                setError('Failed to initiate GitHub login');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h3" gutterBottom sx={{ mb: 1 }}>
                    Let's Connect
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                    Sign in to your account
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}

                <Paper elevation={3} sx={{ width: '100%', p: 3 }}>
                    <Stack spacing={3}>
                        {/* OAuth Options */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center' }}>
                                Sign in with
                            </Typography>
                            <Stack spacing={2}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    size="large"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
                                    sx={{
                                        borderColor: '#DB4437',
                                        color: '#DB4437',
                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                    }}
                                >
                                    Google
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    size="large"
                                    onClick={handleGitHubLogin}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <GitHubIcon />}
                                    sx={{
                                        borderColor: '#000',
                                        color: '#000',
                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                    }}
                                >
                                    GitHub
                                </Button>
                            </Stack>
                        </Box>

                        <Divider sx={{ my: 2 }}>OR</Divider>

                        {/* Email/Password Login */}
                        <Box component="form" onSubmit={handleEmailLogin}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    InputProps={{
                                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                                    }}
                                    disabled={loading}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    InputProps={{
                                        startAdornment: <LockIcon sx={{ mr: 1, color: 'action.active' }} />
                                    }}
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={loading || !email || !password}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Sign In'}
                                </Button>
                            </Stack>
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2">
                                Don't have an account?{' '}
                                <a href="/register" style={{ color: '#1976d2', textDecoration: 'none' }}>
                                    Sign up
                                </a>
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Info Cards */}
                <Stack spacing={2} sx={{ mt: 4, width: '100%' }}>
                    <Card sx={{ backgroundColor: '#f5f5f5' }}>
                        <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                                🔒 Secure Login
                            </Typography>
                            <Typography variant="caption">
                                Your login is protected with industry-standard encryption and OAuth 2.0
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card sx={{ backgroundColor: '#f5f0ff' }}>
                        <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                                ⚡ One-Click Sign In
                            </Typography>
                            <Typography variant="caption">
                                Sign in instantly with your Google or GitHub account
                            </Typography>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
        </Container>
    );
};

export default Login;
