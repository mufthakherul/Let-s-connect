import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import CaptchaField from './common/CaptchaField';
import { MailOutline } from '@mui/icons-material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import api from '../utils/api';

export default function ResetRequest() {
    const theme = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error
    const [captcha, setCaptcha] = useState(null); // { type, response }
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const container = prefersReducedMotion ? {} : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
    };

    const handleSubmit = async (e) => {
        e && e.preventDefault();
        setError('');
        if (!captcha || !captcha.response) return setError('Please complete the verification challenge.');
        setLoading(true);
        setStatus('sending');
        try {
            // API: POST /user/forgot { email, captchaType, captchaResponse }
            await api.post('/user/forgot', { email, captchaType: captcha.type, captchaResponse: captcha.response });
            setStatus('sent');
        } catch (err) {
            // 404 or unimplemented endpoint: still show success UX (do not reveal account existence)
            if (!err.response || err.response.status === 404) {
                setStatus('sent');
            } else {
                setStatus('error');
                setError(err.response?.data?.error || 'Failed to send reset email');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6, px: 2 }}>
            <motion.div initial="hidden" animate="visible" variants={container}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <MailOutline sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>Reset your password</Typography>
                    <Typography variant="body2" color="text.secondary">Enter the email associated with your account and we’ll send instructions.</Typography>
                </Box>

                {status === 'sent' ? (
                    <Alert severity="success">If an account exists for <strong>{email}</strong>, you will receive reset instructions shortly. Check spam if you don't see it.</Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            margin="normal"
                            autoComplete="email"
                        />

                        <Box sx={{ mt: 1 }}>
                            <CaptchaField
                                label="Human verification"
                                variant="auto"
                                onSolve={(result) => setCaptcha(result)}
                                onClear={() => setCaptcha(null)}
                            />
                        </Box>

                        <Button type="submit" variant="contained" fullWidth disabled={loading || !email} sx={{ mt: 2 }}>
                            {loading ? 'Sending…' : 'Send reset link'}
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/login')}>Back to sign in</Button>
                            <Button fullWidth variant="text" onClick={() => navigate('/register')}>Create account</Button>
                        </Box>
                    </Box>
                )}
            </motion.div>
        </Box>
    );
}
