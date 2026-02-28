import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, InputAdornment, IconButton,
  FormControlLabel, Checkbox, LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, Login as LoginIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { designTokens, getGlassyStyle } from '../theme/designSystem';
import { Paper, Container } from '@mui/material';

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

function Login({ setUser }) {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [email, setEmail] = useState(() => localStorage.getItem('rememberEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('rememberEmail')));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const navigate = useNavigate();
  // keep global auth store in sync so other components don't see a mismatch
  const setGlobalUser = useAuthStore((s) => s.setUser);
  const setGlobalToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    if (remember && email) localStorage.setItem('rememberEmail', email);
    if (!remember) localStorage.removeItem('rememberEmail');
  }, [remember, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/user/login', { email, password });
      const payload = response?.data?.data || response?.data || {};
      const token = payload?.token;
      const user = payload?.user;

      if (!token || !user) {
        throw new Error('Login response missing token or user');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update global auth store immediately
      try { setGlobalToken(token); setGlobalUser(user); } catch (e) { /* ignore */ }

      // brief grace period to avoid immediate 401->redirect races in other components
      try { window.__suppressAuthRedirectUntil = Date.now() + 8000; } catch (e) { /* ignore */ }

      if (remember) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      setUser(user);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
      // small shake handled by motion (see markup)
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => setShowPassword((s) => !s);

  const handleKeyCaps = (e) => {
    try { setCapsLock(e.getModifierState && e.getModifierState('CapsLock')); } catch (ex) { /* ignore */ }
  };

  const { score, label } = passwordStrength(password);

  const containerVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };

  const errorVariant = {
    shake: { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.45 } }
  };



  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 10, willChange: 'opacity, transform' }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            ...getGlassyStyle(theme.palette.mode),
            borderRadius: 4,
            boxShadow: designTokens.glassmorphism[theme.palette.mode].boxShadow,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}22, ${theme.palette.secondary.main}22)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}
            >
              <LockOutlined sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            </Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-0.025em' }}>Welcome Back</Typography>
            <Typography variant="body2" color="text.secondary">Enter your credentials to access your account</Typography>
          </Box>

          <motion.div animate={error ? 'shake' : ''} variants={error ? errorVariant : {}}>
            {error && <Alert severity="error" sx={{ mb: 2 }} aria-live="assertive">{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <motion.div whileTap={!prefersReducedMotion ? { scale: 0.995 } : {}}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LoginIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyCaps}
                  margin="normal"
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={togglePassword} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                {password && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress variant="determinate" value={(score / 4) * 100} sx={{ height: 8, borderRadius: 2 }} />
                      <Typography variant="caption" color="text.secondary">Strength: {label}</Typography>
                    </Box>
                  </Box>
                )}

                {capsLock && <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>Caps Lock is on</Typography>}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                  <FormControlLabel
                    control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                    label="Remember me"
                  />

                  <Button variant="text" onClick={() => navigate('/reset-password')}>
                    Forgot password?
                  </Button>
                </Box>

                <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, py: 1.25 }} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                  Or continue with
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => { window.location.href = '/login/oauth?provider=google'; }}
                    startIcon={<Box component="span" sx={{ fontWeight: 700 }}>G</Box>}
                  >
                    Google
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => { window.location.href = '/login/oauth?provider=github'; }}
                  >
                    GitHub
                  </Button>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                  Need an account? <Button variant="text" onClick={() => navigate('/register')}>Sign up</Button>
                </Typography>
              </motion.div>
            </form>
          </motion.div>
        </Paper>
      </motion.div>
    </Container>
  );
}

export default Login;
