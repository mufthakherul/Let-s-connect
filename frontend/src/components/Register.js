import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, InputAdornment, IconButton,
  LinearProgress, Checkbox, FormControlLabel, useMediaQuery, useTheme
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd, CheckCircle } from '@mui/icons-material';
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

function Register({ setUser }) {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false); // reCAPTCHA placeholder
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | error
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [formData.username, formData.email]);

  // Debounced username availability check (calls backend if available; falls back gracefully)
  useEffect(() => {
    const name = formData.username.trim();
    if (!name || name.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/user/check-username?username=${encodeURIComponent(name)}`);
        if (res?.data && typeof res.data.available === 'boolean') {
          setUsernameStatus(res.data.available ? 'available' : 'taken');
        } else {
          // Backend didn't provide availability — assume available to avoid blocking dev flows
          setUsernameStatus('available');
        }
      } catch (err) {
        // If backend doesn't implement the endpoint (404) or other error, don't block signup
        if (err?.response?.status === 404) setUsernameStatus('available');
        else setUsernameStatus('error');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const toggleShowPassword = () => setShowPassword((s) => !s);

  const { score, label } = passwordStrength(formData.password);

  const containerVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };

  const errorVariant = {
    shake: { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.45 } }
  };

  const validateClient = () => {
    if (!agree) return 'You must accept the Terms of Service to continue.';
    if (!captchaChecked) return 'Please confirm you are not a robot.'; // placeholder for reCAPTCHA
    if (usernameStatus === 'taken') return 'The chosen username is already taken.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setLoading(true);
    try {
      const send = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      };
      const response = await api.post('/user/register', send);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      // Keep user logged in but prompt for email verification
      setPendingVerificationEmail(send.email);
      setSuccessMessage('Account created — check your inbox for a verification link.');
    } catch (err) {
      if (!err.response) {
        console.error('Registration network error:', err);
        setError('Network error when contacting the backend — check your API settings or open port 8000 if using Codespaces.');
      } else {
        setError(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setLoading(true);
    try {
      await api.post('/user/resend-verification', { email: pendingVerificationEmail });
      setSuccessMessage('Verification email resent — check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6, px: 2 }}>
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <PersonAdd sx={{ fontSize: 46, color: theme.palette.primary.main }} />
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>Create your account</Typography>
          <Typography variant="body2" color="text.secondary">Fast setup — join the community</Typography>
        </Box>

        <motion.div animate={error ? 'shake' : ''} variants={error ? errorVariant : {}}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              required
              helperText={
                usernameStatus === 'checking'
                  ? 'Checking availability…'
                  : usernameStatus === 'available'
                    ? 'Username available'
                    : usernameStatus === 'taken'
                      ? 'Username already taken'
                      : usernameStatus === 'error'
                        ? 'Could not validate username (server unavailable)'
                        : 'Choose a public handle (letters, numbers, dashes).'
              }
              FormHelperTextProps={{
                sx: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }
              }}
              InputProps={{
                endAdornment: usernameStatus === 'available' ? (
                  <InputAdornment position="end"><CheckCircle color="success" fontSize="small" /></InputAdornment>
                ) : undefined
              }}
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              helperText="We will send a confirmation email."
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowPassword} edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}>
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
              <Box sx={{ minWidth: 140 }}>
                <TextField
                  fullWidth
                  label="Confirm password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Last name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                margin="normal"
              />
            </Box>

            <FormControlLabel
              control={<Checkbox checked={captchaChecked} onChange={(e) => setCaptchaChecked(e.target.checked)} />}
              label={(
                <Typography variant="body2">I'm not a robot — <em>reCAPTCHA placeholder</em></Typography>
              )}
              sx={{ mt: 1 }}
            />

            <FormControlLabel
              control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
              label={(
                <Typography variant="body2">I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></Typography>
              )}
              sx={{ mt: 1 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2, py: 1.25 }}
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>

            {usernameStatus === 'taken' && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>Please choose a different username.</Typography>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              Or sign up with
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => { window.location.href = '/login/oauth?provider=google'; }}>Google</Button>
              <Button fullWidth variant="outlined" onClick={() => { window.location.href = '/login/oauth?provider=github'; }}>GitHub</Button>
            </Box>

            {pendingVerificationEmail && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button fullWidth variant="outlined" onClick={handleResendVerification} disabled={loading}>Resend verification</Button>
                <Button fullWidth variant="contained" onClick={() => navigate('/feed')}>Continue</Button>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              Already have an account? <Button variant="text" onClick={() => navigate('/login')}>Sign in</Button>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              Forgot your password? <Button variant="text" onClick={() => navigate('/reset-password')}>Reset it</Button>
            </Typography>
          </form>
        </motion.div>
      </motion.div>
    </Box>
  );
}

export default Register;