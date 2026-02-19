import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, InputAdornment, IconButton,
  FormControlLabel, Checkbox
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, Login as LoginIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useForm } from '../hooks/useForm';
import { useMutation } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useForm';

/**
 * Modernized Login component using new hooks and patterns
 * Improvements:
 * - useForm hook for form state management
 * - useMutation hook for login API call with proper state machine
 * - useLocalStorage hook for remember email
 * - Better error handling with typed errors
 * - Cleaner code structure
 */

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

// Form validation
function validateLogin(values) {
  const errors = {};
  
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Invalid email address';
  }
  
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  return errors;
}

function LoginModern({ setUser }) {
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const navigate = useNavigate();
  const setGlobalUser = useAuthStore((s) => s.setUser);
  const setGlobalToken = useAuthStore((s) => s.setToken);
  
  // Use modern hooks
  const [rememberEmail, setRememberEmail, removeRememberEmail] = useLocalStorage('rememberEmail', '');
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  
  // Form management with validation
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm(
    {
      email: rememberEmail || '',
      password: '',
      remember: Boolean(rememberEmail)
    },
    validateLogin
  );
  
  // Login mutation with proper state management
  const {
    mutate: login,
    isLoading,
    isError,
    error: loginError,
    isSuccess
  } = useMutation(
    async ({ email, password }) => {
      const response = await api.post('/user/login', { email, password });
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Store auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update global auth store
        try { 
          setGlobalToken(data.token); 
          setGlobalUser(data.user); 
        } catch (e) { 
          console.error('Auth store update failed:', e);
        }
        
        // Grace period for auth propagation
        try { 
          window.__suppressAuthRedirectUntil = Date.now() + 8000; 
        } catch (e) { /* ignore */ }
        
        // Handle remember email
        if (values.remember) {
          setRememberEmail(values.email);
        } else {
          removeRememberEmail();
        }
        
        // Update parent component
        setUser(data.user);
        
        // Navigate to feed
        navigate('/feed');
      },
      onError: (err) => {
        console.error('Login failed:', err);
      }
    }
  );
  
  const onSubmit = async () => {
    await login({ 
      email: values.email, 
      password: values.password 
    });
  };
  
  const togglePassword = () => setShowPassword((s) => !s);
  
  const handleKeyCaps = (e) => {
    try { 
      setCapsLock(e.getModifierState && e.getModifierState('CapsLock')); 
    } catch (ex) { 
      /* ignore */ 
    }
  };
  
  const { score, label } = passwordStrength(values.password);
  
  const containerVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };
  
  const errorVariant = {
    shake: { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.45 } }
  };
  
  const errorMessage = loginError?.response?.data?.error || 
                       loginError?.message || 
                       'Login failed. Please check your credentials.';

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockOutlined sx={{ fontSize: 44, color: theme.palette.primary.main }} />
          <Typography variant="h4" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue to Let's Connect
          </Typography>
        </Box>

        {isError && (
          <motion.div animate="shake" variants={errorVariant}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          </motion.div>
        )}

        {isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Login successful! Redirecting...
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            error={touched.email && Boolean(errors.email)}
            helperText={touched.email && errors.email}
            disabled={isLoading}
            sx={{ mb: 2 }}
            autoComplete="email"
            inputProps={{
              'aria-label': 'Email address',
              'aria-required': 'true',
              'aria-invalid': touched.email && Boolean(errors.email)
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            onKeyUp={handleKeyCaps}
            error={touched.password && Boolean(errors.password)}
            helperText={touched.password && errors.password}
            disabled={isLoading}
            sx={{ mb: 1 }}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={togglePassword}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            inputProps={{
              'aria-label': 'Password',
              'aria-required': 'true',
              'aria-invalid': touched.password && Boolean(errors.password)
            }}
          />

          {capsLock && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
              ⚠️ Caps Lock is on
            </Typography>
          )}

          {values.password && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Password strength: {label}
              </Typography>
              <Box sx={{ 
                width: '100%', 
                height: 4, 
                bgcolor: 'grey.300', 
                borderRadius: 1,
                mt: 0.5 
              }}>
                <Box sx={{ 
                  width: `${(score / 4) * 100}%`, 
                  height: '100%',
                  bgcolor: score <= 1 ? 'error.main' : score <= 2 ? 'warning.main' : 'success.main',
                  borderRadius: 1,
                  transition: 'width 0.3s'
                }} />
              </Box>
            </Box>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={values.remember}
                onChange={(e) => handleChange('remember', e.target.checked)}
                disabled={isLoading}
                color="primary"
              />
            }
            label="Remember me"
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading || Object.keys(errors).length > 0}
            startIcon={<LoginIcon />}
            sx={{ 
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Button 
              onClick={() => navigate('/register')}
              sx={{ textTransform: 'none' }}
              disabled={isLoading}
            >
              Sign up
            </Button>
          </Typography>
          <Button
            onClick={() => navigate('/reset-password')}
            sx={{ textTransform: 'none', mt: 1 }}
            disabled={isLoading}
          >
            Forgot password?
          </Button>
        </Box>
      </motion.div>
    </Box>
  );
}

export default LoginModern;
