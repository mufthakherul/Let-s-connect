import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, LinearProgress
} from '@mui/material';

function AlreadyMemberDialog({ open, onClose, onContinue }) {
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        if (!open) return;

        setCountdown(10);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onContinue();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [open, onContinue]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.3rem' }}>
                You're Already a Member 🎉
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Welcome back! You already have an account with us. Would you like to go back to your homepage?
                </Typography>
                <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Auto-redirecting in {countdown} seconds...
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={(10 - countdown) * 10}
                        sx={{ mt: 1 }}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Stay Here
                </Button>
                <Button
                    onClick={onContinue}
                    variant="contained"
                    autoFocus
                >
                    Redirect to Homepage
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AlreadyMemberDialog;
