import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Paper, Alert,
    Stepper, Step, StepLabel, InputAdornment, IconButton,
    CircularProgress, Link,
} from '@mui/material';
import {
    LockOutlined, Verified, Visibility, VisibilityOff,
    SecurityOutlined, Key,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

const STEPS = ['Credentials', 'Two-Factor'];

const fadeSlide = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -40 },
    transition: { duration: 0.25 },
};

const AdminLogin = ({ onLogin }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [qrRequired, setQrRequired] = useState(false);

    const storeToken = (token) => {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setSuccess(true);
        setTimeout(() => onLogin && onLogin(token), 600);
    };

    const handleCredentials = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/admin/login', { username, password });
            const { token, requiresTwoFactor, tempToken: tmp, qrSetupRequired } = response.data;
            if (requiresTwoFactor) {
                setTempToken(tmp || '');
                setQrRequired(!!qrSetupRequired);
                setActiveStep(1);
            } else if (token) {
                storeToken(token);
            } else {
                setError('Login failed: no token received');
            }
        } catch (err) {
            console.error('admin login error', err);
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FA = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const code = useBackup ? backupCode : otpCode;
            const response = await api.post('/admin/login/2fa', { tempToken, code });
            const { token } = response.data;
            if (token) {
                storeToken(token);
            } else {
                setError('2FA verification failed');
            }
        } catch (err) {
            console.error('2fa error', err);
            setError(err.response?.data?.error || '2FA verification failed');
        } finally {
            setLoading(false);
        }
    };

    const lockIcon = success
        ? <Verified sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
        : <LockOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />;

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Paper sx={{ p: 4, width: 400, borderRadius: 3 }} elevation={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                    <motion.div
                        key={success ? 'verified' : 'lock'}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {lockIcon}
                    </motion.div>
                    <Typography variant="h5" fontWeight={700}>Admin Sign In</Typography>
                    {activeStep === 1 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            <SecurityOutlined sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            Two-Factor Authentication
                        </Typography>
                    )}
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <AnimatePresence mode="wait">
                    {activeStep === 0 && (
                        <motion.div key="step1" {...fadeSlide}>
                            <form onSubmit={handleCredentials}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Username"
                                    margin="normal"
                                    value={username}
                                    autoComplete="username"
                                    onChange={(e) => setUsername(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    margin="normal"
                                    value={password}
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    edge="end"
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    sx={{ mt: 2 }}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                                >
                                    {loading ? 'Signing in…' : 'Sign In'}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {activeStep === 1 && (
                        <motion.div key="step2" {...fadeSlide}>
                            {qrRequired && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    2FA is required but not yet configured.{' '}
                                    <Link href={`${process.env.REACT_APP_API_URL || ''}/admin/2fa/setup`} target="_blank" rel="noopener">
                                        Set up 2FA now
                                    </Link>
                                </Alert>
                            )}
                            <form onSubmit={handle2FA}>
                                {!useBackup ? (
                                    <TextField
                                        required
                                        fullWidth
                                        label="6-digit TOTP code"
                                        margin="normal"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6 }}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SecurityOutlined fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                ) : (
                                    <TextField
                                        required
                                        fullWidth
                                        label="Backup code"
                                        margin="normal"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Key fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                    <Link
                                        component="button"
                                        type="button"
                                        variant="body2"
                                        onClick={() => { setUseBackup((v) => !v); setError(''); }}
                                    >
                                        {useBackup ? 'Use authenticator app instead' : 'Use backup code'}
                                    </Link>
                                </Box>

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    sx={{ mt: 2 }}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                                >
                                    {loading ? 'Verifying…' : 'Verify'}
                                </Button>
                                <Button
                                    fullWidth
                                    variant="text"
                                    size="small"
                                    sx={{ mt: 1 }}
                                    onClick={() => { setActiveStep(0); setError(''); setOtpCode(''); setBackupCode(''); }}
                                >
                                    ← Back
                                </Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Paper>
        </Box>
    );
};

export default AdminLogin;
