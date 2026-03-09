import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, InputAdornment, IconButton, LinearProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import api from '../utils/api';

function passwordStrength(password) {
    let score = 0;
    if (!password) return { score, label: 'Too short' };
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = ['Very weak', 'Weak', 'Okay', 'Good', 'Strong'];
    return { score, label: labels[Math.min(score, labels.length - 1)] };
}

export default function ResetPassword() {
    const theme = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const { token: paramToken } = useParams();
    const location = useLocation();
    const queryToken = new URLSearchParams(location.search).get('token');
    const token = paramToken || queryToken;
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => { setError(''); setSuccess(''); }, [password, confirm]);

    const { score, label } = passwordStrength(password);

    const container = prefersReducedMotion ? {} : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
    };

    const submit = async (e) => {
        e && e.preventDefault();
        setError('');
        if (!token) return setError('Reset token missing — request a new link.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        if (password !== confirm) return setError('Passwords do not match.');

        setLoading(true);
        try {
            // POST /user/reset-password { token, password }
            await api.post('/user/reset-password', { token, password });
            setSuccess('Password reset — you can now sign in with your new password.');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6, px: 2 }}>
                <motion.div initial="hidden" animate="visible" variants={container}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>Reset link required</Typography>
                        <Typography variant="body2" color="text.secondary">No reset token found in the URL. Request a new password reset link.</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" onClick={() => navigate('/reset-password')}>Request reset link</Button>
                        <Button variant="text" onClick={() => navigate('/login')}>Back to sign in</Button>
                    </Box>
                </motion.div>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6, px: 2 }}>
            <motion.div initial="hidden" animate="visible" variants={container}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>Choose a new password</Typography>
                    <Typography variant="body2" color="text.secondary">Token detected — enter a new password to restore access.</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Box component="form" onSubmit={submit}>
                    <TextField
                        fullWidth
                        label="New password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <LinearProgress variant="determinate" value={(score / 4) * 100} sx={{ height: 8, borderRadius: 2 }} />
                            <Typography variant="caption" color="text.secondary">Strength: {label}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 160 }}>
                            <TextField
                                fullWidth
                                label="Confirm password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                margin="normal"
                                required
                            />
                        </Box>
                    </Box>

                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
                        {loading ? 'Saving…' : 'Set new password'}
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button variant="text" onClick={() => navigate('/login')}>Back to sign in</Button>
                        <Button variant="text" onClick={() => navigate('/register')}>Create account</Button>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
}
