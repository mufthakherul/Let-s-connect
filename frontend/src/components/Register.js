import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import api from '../utils/api';

function Register({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/user/register', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      navigate('/feed');
    } catch (err) {
      // Detect network / CORS errors (no response) and provide actionable message
      if (!err.response) {
        console.error('Registration network error:', err);
        setError(`Network error while contacting the backend — this is often caused by CORS or a blocked API port in the development environment.\n          - If you are using Codespaces: open the Ports view and make port 8000 public.\n - Or set REACT_APP_API_URL to the API gateway host.`);
      } else {
        setError(err.response?.data?.error || 'Registration failed');
      }
    }
  };

  const isCodespace = typeof window !== 'undefined' && window.location.origin.includes('.app.github.dev');

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Register
      </Typography>
      {isCodespace && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Running inside Codespaces? If registration fails with a CORS error make sure <strong>port 8000</strong> is exposed/public in the Ports view or set <code>REACT_APP_API_URL</code> to your API gateway host.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          margin="normal"
          required
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
        />
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          margin="normal"
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
          Register
        </Button>
      </form>
    </Box>
  );
}

export default Register;
