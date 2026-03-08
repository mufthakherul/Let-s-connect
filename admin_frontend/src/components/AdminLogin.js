import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import api from '../utils/api';

const AdminLogin = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/admin/login', { username, password });
            const { token } = response.data;
            if (token) {
                // store token and propagate success
                localStorage.setItem('adminToken', token);
                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                onLogin && onLogin(token);
            } else {
                setError('Login failed');
            }
        } catch (err) {
            console.error('admin login error', err);
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Paper sx={{ p: 4, width: 360 }} elevation={3}>
                <Typography variant="h5" gutterBottom>Admin Sign In</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        required
                        fullWidth
                        label="Username"
                        margin="normal"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>Sign In</Button>
                </form>
            </Paper>
        </Box>
    );
};

export default AdminLogin;
