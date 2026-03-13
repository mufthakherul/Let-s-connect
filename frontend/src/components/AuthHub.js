/**
 * AuthHub.js — Unified Authentication Hub for Milonexa
 * Supersedes Login.js and Register.js with animated tab switching,
 * 3-step registration, forgot-password modal, and 2FA setup wizard.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  CheckCircle,
  Chat,
  Close,
  ContentCopy,
  Description,
  DevicesOther,
  Email as EmailIcon,
  GitHub,
  LockOutlined,
  PersonAdd,
  Radio,
  Shield,
  ShoppingCart,
  TravelExplore,
  Tv,
  VideoLibrary,
  Visibility,
  VisibilityOff,
  Warning,
  Groups,
} from '@mui/icons-material';

import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { designTokens, getGlassyStyle } from '../theme/designSystem';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function passwordStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: 'Too short' };
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Very weak', 'Weak', 'Okay', 'Good', 'Strong'];
  const colors = ['error', 'warning', 'warning', 'success', 'success'];
  return { score, label: labels[score], color: colors[score] };
}

function strengthBarColor(score, theme) {
  if (score <= 1) return theme.palette.error.main;
  if (score <= 2) return theme.palette.warning.main;
  return theme.palette.success.main;
}

const INTERESTS = [
  'Technology', 'Music', 'Art', 'Sports', 'Gaming',
  'Business', 'Science', 'Travel', 'Food', 'Fitness',
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const slideVariants = (direction) => ({
  initial: { opacity: 0, x: direction * 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -direction * 30, transition: { duration: 0.2, ease: 'easeIn' } },
});

const shakeVariants = {
  shake: { x: [0, -8, 8, -8, 8, -4, 4, 0], transition: { duration: 0.5 } },
};

const stepVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2, ease: 'easeIn' } },
};

const backStepVariants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 30, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrengthBar({ password, sx }) {
  const theme = useTheme();
  const { score, label } = passwordStrength(password);
  if (!password) return null;
  return (
    <Box sx={{ mt: 0.75, ...sx }}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          '& .MuiLinearProgress-bar': {
            bgcolor: strengthBarColor(score, theme),
            borderRadius: 3,
          },
        }}
      />
      <Typography variant="caption" sx={{ color: strengthBarColor(score, theme), fontWeight: 500 }}>
        Strength: {label}
      </Typography>
    </Box>
  );
}

function OAuthButtons() {
  const oauthRedirect = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <Box>
      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">or continue with</Typography>
      </Divider>
      <Grid container spacing={1}>
        {[
          {
            label: 'Google',
            provider: 'google',
            icon: (
              <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </Box>
            ),
          },
          {
            label: 'GitHub',
            provider: 'github',
            icon: <GitHub sx={{ fontSize: 18 }} />,
          },
          {
            label: 'Discord',
            provider: 'discord',
            icon: (
              <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </Box>
            ),
          },
          {
            label: 'Apple',
            provider: 'apple',
            icon: (
              <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </Box>
            ),
          },
        ].map(({ label, provider, icon }) => (
          <Grid item xs={6} key={provider}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={icon}
              onClick={() => oauthRedirect(provider)}
              aria-label={`Sign in with ${label}`}
              sx={{ textTransform: 'none', fontSize: '0.8rem', py: 0.75 }}
            >
              {label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password Modal
// ─────────────────────────────────────────────────────────────────────────────

function ForgotPasswordModal({ open, onClose }) {
  const [step, setStep] = useState(0); // 0 = email, 1 = otp + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleClose = () => {
    setStep(0); setEmail(''); setOtp(''); setNewPassword('');
    setConfirmPassword(''); setError(''); setSuccess(''); setCountdown(0);
    clearInterval(timerRef.current);
    onClose();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/user/forgot-password', { email });
      setDirection(1);
      setStep(1);
      startCountdown();
      toast.success('OTP sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(''); setLoading(true);
    try {
      await api.post('/user/forgot-password', { email });
      startCountdown();
      toast.success('OTP resent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/user/reset-password', { email, otp, newPassword });
      setSuccess('Password reset successful! You can now sign in.');
      toast.success('Password reset successfully');
      setTimeout(handleClose, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const currentVariants = direction > 0 ? stepVariants : backStepVariants;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="forgot-password-title"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle id="forgot-password-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {step === 0 ? 'Forgot Password' : 'Reset Password'}
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="Close dialog">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Step indicator */}
      <Box sx={{ px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              animate={{ flex: step === i ? 2 : 1 }}
              transition={{ duration: 0.3 }}
              style={{ height: 4, borderRadius: 2, backgroundColor: step >= i ? '#6366f1' : '#e2e8f0' }}
            />
          ))}
        </Box>
      </Box>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div key="step-email" variants={currentVariants} initial="initial" animate="animate" exit="exit">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your email address and we'll send you a one-time code.
              </Typography>
              <form onSubmit={handleSendOtp}>
                <TextField
                  fullWidth
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Sending…' : 'Send OTP'}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="step-reset" variants={currentVariants} initial="initial" animate="animate" exit="exit">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the 6-digit code sent to <strong>{email}</strong> and choose a new password.
              </Typography>
              <form onSubmit={handleReset}>
                <TextField
                  fullWidth
                  label="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  inputProps={{ inputMode: 'numeric', maxLength: 6, 'aria-label': 'One-time password' }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="New password"
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPwd((s) => !s)}
                          edge="end"
                          aria-label={showPwd ? 'Hide password' : 'Show password'}
                        >
                          {showPwd ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 1 }}
                />
                <PasswordStrengthBar password={newPassword} sx={{ mb: 1 }} />
                <TextField
                  fullWidth
                  label="Confirm new password"
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                  sx={{ mb: 1 }}
                >
                  {loading ? 'Resetting…' : 'Reset Password'}
                </Button>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<ArrowBack fontSize="small" />}
                    onClick={() => { setDirection(-1); setStep(0); }}
                  >
                    Change email
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleResend}
                    disabled={countdown > 0 || loading}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Button>
                </Box>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2FA Setup Wizard Modal
// ─────────────────────────────────────────────────────────────────────────────

function TwoFAWizard({ open, userId, onClose, onComplete }) {
  const [step, setStep] = useState(0); // 0=qr, 1=verify, 2=backupCodes
  const [qrUri, setQrUri] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && step === 0) setupTwoFA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setupTwoFA = async () => {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/user/2fa/setup', { userId });
      setQrUri(res.data?.data?.qrCodeUri || res.data?.qrCodeUri || '');
      setManualCode(res.data?.data?.manualEntryCode || res.data?.manualEntryCode || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/user/2fa/verify', { userId, code: totpCode });
      setBackupCodes(res.data?.data?.backupCodes || res.data?.backupCodes || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code, please try again');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied to clipboard'));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="2fa-wizard-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle id="2fa-wizard-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          <Shield sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
          Set Up Two-Factor Authentication
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Skip 2FA setup">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Step progress */}
      <Box sx={{ px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
          {['Scan QR', 'Verify', 'Backup Codes'].map((label, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
              <motion.div
                animate={{ height: step === i ? 6 : 4 }}
                transition={{ duration: 0.2 }}
                style={{
                  borderRadius: 3,
                  backgroundColor: step >= i ? '#6366f1' : '#e2e8f0',
                  marginBottom: 4,
                }}
              />
              <Typography variant="caption" color={step >= i ? 'primary' : 'text.secondary'} fontWeight={step === i ? 600 : 400}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div key="2fa-qr" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {qrUri && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, p: 2, bgcolor: 'white', borderRadius: 2, width: 'fit-content', mx: 'auto' }}>
                      <QRCodeSVG value={qrUri} size={200} level="M" />
                    </Box>
                  )}
                  {manualCode && (
                    <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Manual entry code</Typography>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600} letterSpacing={2}>
                          {manualCode}
                        </Typography>
                      </Box>
                      <Tooltip title="Copy code">
                        <IconButton size="small" onClick={() => copyToClipboard(manualCode)} aria-label="Copy manual entry code">
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => setStep(1)}>
                    I've scanned the code →
                  </Button>
                </>
              )}
              <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={onClose} size="small" color="inherit">
                Skip for now
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="2fa-verify" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enter the 6-digit code shown in your authenticator app to confirm setup.
              </Typography>
              <form onSubmit={handleVerify}>
                <TextField
                  fullWidth
                  label="TOTP code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  inputProps={{ inputMode: 'numeric', maxLength: 6, 'aria-label': 'Authenticator code' }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || totpCode.length !== 6}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                  sx={{ mb: 1 }}
                >
                  {loading ? 'Verifying…' : 'Verify & Enable'}
                </Button>
                <Button variant="text" size="small" startIcon={<ArrowBack />} onClick={() => setStep(0)}>
                  Back
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2fa-backup" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <Alert severity="success" sx={{ mb: 2 }}>
                Two-factor authentication is now enabled!
              </Alert>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Save your backup codes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Store these in a safe place. Each code can only be used once if you lose access to your authenticator.
              </Typography>
              {backupCodes.length > 0 && (
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mb: 2 }}>
                  <Grid container spacing={1}>
                    {backupCodes.map((code, i) => (
                      <Grid item xs={6} key={i}>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.85rem">{code}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    sx={{ mt: 1 }}
                  >
                    Copy all codes
                  </Button>
                </Box>
              )}
              <Button variant="contained" fullWidth onClick={onComplete}>
                Done — Go to my feed
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decorative left panel
// ─────────────────────────────────────────────────────────────────────────────

function BrandPanel({ mode }) {
  const [stats, setStats] = useState({ userCount: null, totalFeatures: null });
  const [features, setFeatures] = useState([]);

  const iconMap = {
    Groups: <Groups sx={{ fontSize: 20 }} />, // Social feed
    Chat: <Chat sx={{ fontSize: 20 }} />,
    VideoLibrary: <VideoLibrary sx={{ fontSize: 20 }} />,
    ShoppingCart: <ShoppingCart sx={{ fontSize: 20 }} />,
    Description: <Description sx={{ fontSize: 20 }} />,
    Tv: <Tv sx={{ fontSize: 20 }} />,
    Radio: <Radio sx={{ fontSize: 20 }} />,
    Default: <TravelExplore sx={{ fontSize: 20 }} />,
  };

  useEffect(() => {
    let mounted = true;

    api.get('/api/public/stats').then((res) => {
      if (!mounted) return;
      const data = res?.data?.data || {};
      setStats({
        userCount: typeof data.userCount === 'number' ? data.userCount : null,
        totalFeatures: typeof data.features === 'number'
          ? data.features
          : Array.isArray(data.features)
            ? data.features.length
            : null,
      });
    }).catch(() => {
      // silent fallback
    });

    api.get('/api/public/features').then((res) => {
      if (!mounted) return;
      const list = res?.data?.data?.features;
      if (Array.isArray(list)) setFeatures(list.slice(0, 3));
    }).catch(() => {
      // silent fallback
    });

    return () => {
      mounted = false;
    };
  }, []);

  const displayFeatures = features.length
    ? features
    : [
      { title: 'Connect with friends', description: 'Join a global community and build meaningful connections.', icon: 'Groups' },
      { title: 'Live chat & media', description: 'Chat, share, and stream content seamlessly across devices.', icon: 'Chat' },
      { title: 'Secure by design', description: 'Built with encryption, 2FA, and privacy-first defaults.', icon: 'Shield' },
    ];

  return (
    <Box
      sx={{
        background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        p: 4,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      {[
        { size: 200, top: -60, right: -60, opacity: 0.15 },
        { size: 150, bottom: 40, left: -40, opacity: 0.1 },
        { size: 80, top: '40%', right: 20, opacity: 0.12 },
      ].map((circle, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: circle.size,
            height: circle.size,
            borderRadius: '50%',
            border: '2px solid white',
            opacity: circle.opacity,
            top: circle.top,
            right: circle.right,
            bottom: circle.bottom,
            left: circle.left,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <Typography
          variant="h3"
          fontWeight={800}
          sx={{ mb: 1, letterSpacing: '-0.03em', textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}
        >
          Milonexa
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.85, mb: 4, lineHeight: 1.6 }}>
          Your social universe — connect, create, and collaborate.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {displayFeatures.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * (i + 1), ease: 'easeOut' }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {iconMap[f.icon] || iconMap.Default}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>{f.title}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.4 }}>
                    {f.description}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>

        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {stats.userCount != null
              ? `${stats.userCount.toLocaleString()} users are already on the platform`
              : 'Connecting communities of creators and collaborators.'}
          </Typography>
          {stats.totalFeatures != null && (
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.5 }}>
              {stats.totalFeatures} platform features available today
            </Typography>
          )}
        </Box>
      </motion.div>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Panel
// ─────────────────────────────────────────────────────────────────────────────

function LoginPanel({ onSwitchToRegister, setUser, onLoginSuccess }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const setGlobalUser = useAuthStore((s) => s.setUser);
  const setGlobalToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState(() => localStorage.getItem('rememberEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('rememberEmail')));
  const [capsLock, setCapsLock] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [shaking, setShaking] = useState(false);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const handleCapsCheck = (e) => {
    try { setCapsLock(e.getModifierState?.('CapsLock') ?? false); } catch (_) { /* noop */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);

    try {
      const body = { email, password, rememberMe: remember };
      if (requires2FA) body.twoFactorCode = twoFACode;

      const response = await api.post('/user/login', body);
      const payload = response?.data?.data || response?.data || {};

      // Server requests 2FA
      if (payload?.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      const { token, user, refreshToken } = payload;
      if (!token || !user) throw new Error('Login response missing token or user');

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      try { setGlobalToken(token); setGlobalUser(user); } catch (_) { /* noop */ }
      try { window.__suppressAuthRedirectUntil = Date.now() + 8000; } catch (_) { /* noop */ }

      if (remember) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');

      setUser(user);
      onLoginSuccess?.({ user });

      const dest = location.state?.from?.pathname || '/feed';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed. Please check your credentials.',
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const { score } = passwordStrength(password);

  return (
    <>
      <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Login form">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, letterSpacing: '-0.025em' }}>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to your Milonexa account
        </Typography>

        <AnimatePresence>
          {error && (
            <motion.div
              key="login-error"
              animate={shaking ? 'shake' : ''}
              variants={shakeVariants}
            >
              <Alert severity="error" sx={{ mb: 2 }} role="alert" aria-live="assertive">
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <TextField
          fullWidth
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          autoComplete="email"
          autoFocus
          inputProps={{ 'aria-label': 'Email address' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyUp={handleCapsCheck}
          margin="normal"
          required
          autoComplete="current-password"
          inputProps={{ 'aria-label': 'Password' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Password strength meter as UX hint */}
        <PasswordStrengthBar password={password} />

        {/* Caps lock warning */}
        <AnimatePresence>
          {capsLock && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Warning sx={{ fontSize: 14, color: 'warning.main' }} />
                <Typography variant="caption" color="warning.main">Caps Lock is on</Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                size="small"
                inputProps={{ 'aria-label': 'Remember me' }}
              />
            }
            label={<Typography variant="body2">Remember me</Typography>}
          />
          <Button
            variant="text"
            size="small"
            onClick={() => setForgotOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Forgot password?
          </Button>
        </Box>

        {/* 2FA code input — revealed when server requires it */}
        <AnimatePresence>
          {requires2FA && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                Two-factor authentication is required. Enter the code from your authenticator app.
              </Alert>
              <TextField
                fullWidth
                label="2FA verification code"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ inputMode: 'numeric', maxLength: 6, 'aria-label': 'Two-factor authentication code' }}
                autoFocus
                sx={{ mb: 1 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockOutlined />}
          sx={{ mt: 2, py: 1.25, fontWeight: 700 }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <OAuthButtons />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Don't have an account?{' '}
          <Button variant="text" size="small" onClick={onSwitchToRegister} sx={{ fontWeight: 600, p: 0, minWidth: 0 }}>
            Sign up free
          </Button>
        </Typography>
      </Box>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Register Panel — 3-step progressive form
// ─────────────────────────────────────────────────────────────────────────────

function RegisterPanel({ onSwitchToLogin, setUser }) {
  const navigate = useNavigate();
  const setGlobalUser = useAuthStore((s) => s.setUser);
  const setGlobalToken = useAuthStore((s) => s.setToken);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 fields
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameCheckRef = useRef(null);

  // Step 3 fields
  const [interests, setInterests] = useState([]);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [show2FA, setShow2FA] = useState(false);

  // Email availability check
  const [emailStatus, setEmailStatus] = useState('idle');
  const emailCheckRef = useRef(null);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  // Debounced username check
  useEffect(() => {
    const name = username.trim();
    if (!name || name.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    clearTimeout(usernameCheckRef.current);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/user/check-username?username=${encodeURIComponent(name)}`, { skipAuthRedirect: true });
        setUsernameStatus(res.data?.available === false ? 'taken' : 'available');
      } catch (err) {
        if (err?.response?.status === 404) setUsernameStatus('available');
        else setUsernameStatus('error');
      }
    }, 500);
    return () => clearTimeout(usernameCheckRef.current);
  }, [username]);

  // Debounced email check
  useEffect(() => {
    const addr = email.trim();
    if (!addr || !addr.includes('@')) { setEmailStatus('idle'); return; }
    setEmailStatus('checking');
    clearTimeout(emailCheckRef.current);
    emailCheckRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/user/check-email?email=${encodeURIComponent(addr)}`, { skipAuthRedirect: true });
        setEmailStatus(res.data?.available === false ? 'taken' : 'available');
      } catch (_) {
        setEmailStatus('idle');
      }
    }, 600);
    return () => clearTimeout(emailCheckRef.current);
  }, [email]);

  const goNext = () => { setDirection(1); setError(''); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setError(''); setStep((s) => s - 1); };

  const validateStep1 = () => {
    if (!email || !email.includes('@')) return 'Please enter a valid email address.';
    if (emailStatus === 'taken') return 'This email is already registered. Try signing in.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateStep2 = () => {
    if (!username.trim() || username.length < 3) return 'Username must be at least 3 characters.';
    if (usernameStatus === 'taken') return 'This username is already taken.';
    if (!firstName.trim()) return 'First name is required.';
    return null;
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) { setError(err); triggerShake(); return; }
    goNext();
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); triggerShake(); return; }
    goNext();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/user/register', {
        email, password, username, firstName, lastName,
      });
      const payload = res?.data?.data || res?.data || {};
      const { token, user, refreshToken } = payload;
      if (!token || !user) throw new Error('Registration response missing token or user');

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      try { setGlobalToken(token); setGlobalUser(user); } catch (_) { /* noop */ }
      try { window.__suppressAuthRedirectUntil = Date.now() + 8000; } catch (_) { /* noop */ }

      setUser(user);
      setRegisteredUser(user);
      toast.success('Account created successfully!');
      setShow2FA(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.',
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const { score, color } = passwordStrength(password);
  const passwordMatch = confirmPassword && password === confirmPassword;
  const passwordMismatch = confirmPassword && password !== confirmPassword;

  const currentVariants = direction > 0 ? stepVariants : backStepVariants;

  const stepLabels = ['Account', 'Profile', 'Interests'];

  return (
    <>
      <Box aria-label="Registration form">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, letterSpacing: '-0.025em' }}>
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Join Milonexa — step {step + 1} of 3
        </Typography>

        {/* Step progress */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {stepLabels.map((label, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
              <motion.div
                animate={{ backgroundColor: step >= i ? '#6366f1' : '#e2e8f0' }}
                transition={{ duration: 0.3 }}
                style={{ height: 4, borderRadius: 2, marginBottom: 4 }}
              />
              <Typography variant="caption" color={step >= i ? 'primary' : 'text.secondary'} fontWeight={step === i ? 700 : 400}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        <AnimatePresence>
          {error && (
            <motion.div
              key="reg-error"
              animate={shaking ? 'shake' : ''}
              variants={shakeVariants}
            >
              <Alert severity="error" sx={{ mb: 2 }} role="alert" aria-live="assertive">
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {/* ─── Step 0: Email + Password ─── */}
          {step === 0 && (
            <motion.div key="reg-step0" variants={currentVariants} initial="initial" animate="animate" exit="exit">
              <Box component="form" onSubmit={handleStep1Next} noValidate>
                <TextField
                  fullWidth
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoFocus
                  autoComplete="email"
                  inputProps={{ 'aria-label': 'Email address' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: emailStatus === 'checking' ? (
                      <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                    ) : emailStatus === 'available' ? (
                      <InputAdornment position="end"><CheckCircle color="success" fontSize="small" /></InputAdornment>
                    ) : null,
                  }}
                  helperText={
                    emailStatus === 'taken'
                      ? 'This email is already registered'
                      : 'We\'ll send you a confirmation email'
                  }
                  error={emailStatus === 'taken'}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="new-password"
                  inputProps={{ 'aria-label': 'Password' }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <PasswordStrengthBar password={password} sx={{ mt: 0.5 }} />

                <TextField
                  fullWidth
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="new-password"
                  inputProps={{ 'aria-label': 'Confirm password' }}
                  InputProps={{
                    endAdornment: confirmPassword ? (
                      <InputAdornment position="end">
                        {passwordMatch
                          ? <CheckCircle color="success" fontSize="small" />
                          : <Warning color="error" fontSize="small" />}
                      </InputAdornment>
                    ) : null,
                  }}
                  helperText={
                    passwordMismatch ? 'Passwords do not match' :
                      passwordMatch ? 'Passwords match' : ''
                  }
                  error={passwordMismatch}
                />

                <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2, py: 1.25, fontWeight: 700 }}>
                  Continue →
                </Button>

                <OAuthButtons />

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                  Already have an account?{' '}
                  <Button variant="text" size="small" onClick={onSwitchToLogin} sx={{ fontWeight: 600, p: 0, minWidth: 0 }}>
                    Sign in
                  </Button>
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* ─── Step 1: Username + Name ─── */}
          {step === 1 && (
            <motion.div key="reg-step1" variants={currentVariants} initial="initial" animate="animate" exit="exit">
              <Box component="form" onSubmit={handleStep2Next} noValidate>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  margin="normal"
                  required
                  autoFocus
                  autoComplete="username"
                  inputProps={{ 'aria-label': 'Username', minLength: 3 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {usernameStatus === 'checking' && <CircularProgress size={16} />}
                        {usernameStatus === 'available' && <CheckCircle color="success" fontSize="small" />}
                        {usernameStatus === 'taken' && <Warning color="error" fontSize="small" />}
                      </InputAdornment>
                    ),
                  }}
                  helperText={
                    usernameStatus === 'checking' ? 'Checking availability…' :
                      usernameStatus === 'available' ? '✓ Username is available' :
                        usernameStatus === 'taken' ? 'Username already taken — try another' :
                          'Letters, numbers, dashes and underscores only'
                  }
                  error={usernameStatus === 'taken'}
                />

                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      inputProps={{ 'aria-label': 'First name' }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      inputProps={{ 'aria-label': 'Last name' }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={goBack}
                    sx={{ flex: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
                    sx={{ flex: 2, fontWeight: 700 }}
                  >
                    Continue →
                  </Button>
                </Box>
              </Box>
            </motion.div>
          )}

          {/* ─── Step 2: Interests + Submit ─── */}
          {step === 2 && (
            <motion.div key="reg-step2" variants={currentVariants} initial="initial" animate="animate" exit="exit">
              <Box component="form" onSubmit={handleRegister} noValidate>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select your interests to personalise your feed (optional):
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }} role="group" aria-label="Select interests">
                  {INTERESTS.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      onClick={() => toggleInterest(interest)}
                      variant={interests.includes(interest) ? 'filled' : 'outlined'}
                      color={interests.includes(interest) ? 'primary' : 'default'}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: interests.includes(interest) ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                      aria-pressed={interests.includes(interest)}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={goBack}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PersonAdd />}
                    sx={{ flex: 2, fontWeight: 700 }}
                  >
                    {loading ? 'Creating account…' : 'Complete Registration'}
                  </Button>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* 2FA Setup Wizard — shown after successful registration */}
      <TwoFAWizard
        open={show2FA}
        userId={registeredUser?.id || registeredUser?._id}
        onClose={() => {
          setShow2FA(false);
          navigate('/feed', { replace: true });
        }}
        onComplete={() => {
          setShow2FA(false);
          navigate('/feed', { replace: true });
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthHub — main export
// ─────────────────────────────────────────────────────────────────────────────

function AuthHub({ setUser }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Allow pre-selecting tab via ?tab=register query param or #register hash
  const location = useLocation();
  const initialTab = (() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'register' || location.hash === '#register') return 1;
    return 0;
  })();

  const [tab, setTab] = useState(initialTab);
  const [tabDirection, setTabDirection] = useState(1);

  const handleTabChange = (_, newValue) => {
    setTabDirection(newValue > tab ? 1 : -1);
    setTab(newValue);
  };

  const switchToRegister = () => handleTabChange(null, 1);
  const switchToLogin = () => handleTabChange(null, 0);

  const glassy = getGlassyStyle(theme.palette.mode);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1a0a2e 100%)'
          : 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fff0f7 100%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Ambient blobs */}
      {!isMobile && (
        <>
          <Box sx={{ position: 'fixed', top: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
          <Box sx={{ position: 'fixed', bottom: '10%', right: '5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        </>
      )}

      <motion.div
        variants={prefersReducedMotion ? {} : cardVariants}
        initial="hidden"
        animate="visible"
        style={{ width: '100%', maxWidth: isMobile ? 480 : 960, position: 'relative', zIndex: 10 }}
      >
        <Paper
          elevation={0}
          sx={{
            ...glassy,
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            minHeight: isMobile ? 'unset' : 600,
          }}
        >
          {/* Left: brand decorative panel (desktop only) */}
          {!isMobile && (
            <Box sx={{ flex: '0 0 40%', maxWidth: '40%' }}>
              <BrandPanel mode={theme.palette.mode} />
            </Box>
          )}

          {/* Right: form area */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              p: { xs: 3, sm: 4 },
              minWidth: 0,
            }}
          >
            {/* Mobile brand header */}
            {isMobile && (
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ mb: 2, textAlign: 'center', background: 'linear-gradient(135deg, #4f46e5, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Milonexa
              </Typography>
            )}

            {/* Tab switcher */}
            <Tabs
              value={tab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 3,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
                '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
              }}
              aria-label="Authentication tabs"
            >
              <Tab label="Sign In" id="auth-tab-0" aria-controls="auth-panel-0" />
              <Tab label="Create Account" id="auth-tab-1" aria-controls="auth-panel-1" />
            </Tabs>

            {/* Tab panels with slide animation */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <AnimatePresence mode="wait" initial={false}>
                {tab === 0 ? (
                  <motion.div
                    key="login-panel"
                    {...slideVariants(tabDirection)}
                    role="tabpanel"
                    id="auth-panel-0"
                    aria-labelledby="auth-tab-0"
                  >
                    <LoginPanel
                      onSwitchToRegister={switchToRegister}
                      setUser={setUser}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="register-panel"
                    {...slideVariants(tabDirection)}
                    role="tabpanel"
                    id="auth-panel-1"
                    aria-labelledby="auth-tab-1"
                  >
                    <RegisterPanel
                      onSwitchToLogin={switchToLogin}
                      setUser={setUser}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}

export default AuthHub;
