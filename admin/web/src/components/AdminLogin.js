import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import StealthAuthAnimation from './common/StealthAuthAnimation';

const normalize = (value) => String(value || '').trim().toLowerCase();

const getAdminBaseUrl = () => {
  const envBase = process.env.REACT_APP_ADMIN_API_URL;
  if (envBase) return envBase.replace(/\/+$/, '');

  if (typeof window === 'undefined') return 'http://localhost:9102';

  const origin = window.location.origin;
  if (origin.includes('.app.github.dev') && origin.includes('-3001')) {
    return `${origin.replace('-3001.app.github.dev', '-8000.app.github.dev')}/admin`;
  }

  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    try {
      const url = new URL(origin);
      url.port = '8000';
      return `${url.toString().replace(/\/$/, '')}/admin`;
    } catch (_) {
      return 'http://localhost:8000/admin';
    }
  }

  return `${origin.replace(/\/+$/, '')}/admin`;
};

const adminRequest = async (endpoint, options = {}) => {
  const url = `${getAdminBaseUrl()}${endpoint}`;
  const response = await fetch(url, options);
  let payload = {};
  try {
    payload = await response.json();
  } catch (_) {
    payload = {};
  }
  if (!response.ok) {
    const err = new Error(payload?.error || payload?.message || 'Authentication failed');
    err.status = response.status;
    throw err;
  }
  return payload;
};

const AdminLogin = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [phase, setPhase] = useState('credentials');
  const [counterpart, setCounterpart] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [collisionSeed, setCollisionSeed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  const previousIdentifier = useRef('');
  const retypeTrigger = useRef({ armed: false, char: '' });

  const counterpartPrompt = useMemo(() => (
    identifier.includes('@') ? 'username' : 'email'
  ), [identifier]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '';
    return () => { document.title = previousTitle; };
  }, []);

  const persistDraft = (key, value) => {
    try {
      localStorage.setItem(`admin-stealth-${key}`, value);
    } catch (_) {
      // ignore storage failures
    }
  };

  const completeLogin = (token, user) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    try { window.__suppressAuthRedirectUntil = Date.now() + 6000; } catch (_) { /* noop */ }
    if (typeof onLogin === 'function') onLogin(token, user);
  };

  const authenticate = async (idValue, passwordValue) => {
    if (submitting || !idValue || !passwordValue) return;
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        password: passwordValue,
        ...(idValue.includes('@') ? { email: normalize(idValue) } : { username: normalize(idValue) }),
      };
      const result = await adminRequest('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!result?.token || !result?.user) {
        throw new Error('Authentication failed');
      }

      setSession({ token: result.token, user: result.user });
      setPhase('counterpart');
      setCounterpart('');
    } catch (_) {
      setError('Unable to proceed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIdentifierChange = (event) => {
    const next = event.target.value;
    const prev = previousIdentifier.current;
    setCollisionSeed((v) => v + 1);

    if (prev.length === next.length + 1 && prev.startsWith(next)) {
      retypeTrigger.current = { armed: true, char: prev.slice(-1) };
    } else if (
      retypeTrigger.current.armed &&
      next.length === prev.length + 1 &&
      next.startsWith(prev) &&
      next.endsWith(retypeTrigger.current.char)
    ) {
      retypeTrigger.current = { armed: false, char: '' };
      authenticate(next, secret);
    } else if (next.length < prev.length - 1 || !next.startsWith(prev.slice(0, Math.max(prev.length - 1, 0)))) {
      retypeTrigger.current = { armed: false, char: '' };
    }

    previousIdentifier.current = next;
    setIdentifier(next);
    persistDraft('identifier', next);
  };

  const handleSecretChange = (event) => {
    const next = event.target.value;
    setCollisionSeed((v) => v + 1);
    setSecret(next);
    persistDraft('secret', next);
  };

  const handleCounterpartProceed = () => {
    if (!session?.user) return;
    const expected = counterpartPrompt === 'username' ? session.user.username : session.user.email;
    if (!expected || normalize(counterpart) !== normalize(expected)) {
      setCounterpart('');
      setCollisionSeed((v) => v + 1);
      return;
    }
    setPhase('verify');
  };

  const handleVerificationProceed = async () => {
    if (!session?.token) return;
    if (!/^\d{6,8}$/.test(verificationCode)) {
      setVerificationCode('');
      setCollisionSeed((v) => v + 1);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const verify = await adminRequest('/verify', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!verify?.valid) throw new Error('Verification failed');
      completeLogin(session.token, session.user);
    } catch (_) {
      setError('Unable to proceed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 10%, #0f172a 0%, #020617 45%, #000000 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 'min(680px, 96vw)',
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: 'rgba(4, 8, 20, 0.75)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          color: '#cbd5e1',
          backdropFilter: 'blur(8px)',
        }}
      >
        <StealthAuthAnimation identifier={identifier} secret={secret} collisionSeed={collisionSeed} />

        <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
          <TextField
            value={identifier}
            onChange={handleIdentifierChange}
            autoComplete="username"
            inputProps={{ 'aria-label': 'username or email' }}
            variant="outlined"
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'transparent',
                caretColor: '#e2e8f0',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: 'rgba(148,163,184,0.45)' },
              },
            }}
          />

          <TextField
            value={secret}
            onChange={handleSecretChange}
            autoComplete="current-password"
            type="password"
            inputProps={{ 'aria-label': 'password' }}
            variant="outlined"
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'transparent',
                caretColor: '#e2e8f0',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: 'rgba(148,163,184,0.45)' },
              },
            }}
          />
        </Box>

        {phase === 'counterpart' && (
          <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
            <TextField
              value={counterpart}
              onChange={(e) => setCounterpart(e.target.value)}
              inputProps={{ 'aria-label': counterpartPrompt }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#e2e8f0',
                  '& fieldset': { borderColor: 'rgba(148,163,184,0.45)' },
                },
              }}
            />
            <Button onClick={handleCounterpartProceed} variant="outlined" sx={{ borderColor: 'rgba(148,163,184,0.45)', color: '#cbd5e1' }}>
              Proceed
            </Button>
          </Box>
        )}

        {phase === 'verify' && (
          <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
            <TextField
              value={verificationCode}
              onChange={(e) => setVerificationCode(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
              inputProps={{ 'aria-label': 'verification code', inputMode: 'numeric' }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#e2e8f0',
                  '& fieldset': { borderColor: 'rgba(148,163,184,0.45)' },
                },
              }}
            />
            <Button
              onClick={handleVerificationProceed}
              disabled={submitting}
              variant="outlined"
              sx={{ borderColor: 'rgba(148,163,184,0.45)', color: '#cbd5e1' }}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            >
              Proceed
            </Button>
          </Box>
        )}

        {error ? (
          <Alert severity="warning" sx={{ mt: 2, backgroundColor: 'rgba(59,130,246,0.1)', color: '#bfdbfe' }}>
            {error}
          </Alert>
        ) : (
          <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'rgba(203,213,225,0.65)' }}>
            Continue typing. Trigger occurs on correction pattern.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default AdminLogin;
