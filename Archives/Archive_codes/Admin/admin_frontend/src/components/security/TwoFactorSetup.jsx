import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Stepper,
    Step,
    StepLabel,
    Alert,
    AlertTitle,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Switch,
    FormControlLabel,
    IconButton,
    Tooltip,
    Stack
} from '@mui/material';
import {
    Security,
    QrCode2,
    Check,
    ContentCopy,
    Warning,
    Smartphone,
    Key,
    Verified
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * TwoFactorSetup - Enhanced 2FA setup and management component
 * Features:
 * - Clear step-by-step setup process
 * - QR code display for authenticator apps
 * - Backup codes generation and management
 * - Enable/disable toggle with confirmation
 * - Session security status indicators
 */
const TwoFactorSetup = () => {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(0);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [sessionStatus, setSessionStatus] = useState({});

    useEffect(() => {
        fetchStatus();
        fetchSessionStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/user/admin/security/2fa/status');
            setEnabled(response.data.enabled || false);
        } catch (error) {
            console.error('Failed to fetch 2FA status:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionStatus = async () => {
        try {
            const response = await api.get('/user/admin/security/session');
            setSessionStatus(response.data || {});
        } catch (error) {
            console.error('Failed to fetch session status:', error);
        }
    };

    const handleStartSetup = async () => {
        try {
            const response = await api.post('/user/admin/security/2fa/setup');
            setQrCode(response.data.qrCode);
            setSecret(response.data.secret);
            setActiveStep(1);
            toast.success('2FA setup initiated');
        } catch (error) {
            console.error('Failed to start 2FA setup:', error);
            toast.error('Failed to start 2FA setup');
        }
    };

    const handleVerify = async () => {
        try {
            const response = await api.post('/user/admin/security/2fa/verify', {
                code: verificationCode
            });
            setBackupCodes(response.data.backupCodes || []);
            setEnabled(true);
            setActiveStep(2);
            toast.success('2FA enabled successfully');
        } catch (error) {
            console.error('Failed to verify 2FA code:', error);
            toast.error('Invalid verification code');
        }
    };

    const handleDisable = async () => {
        try {
            await api.post('/user/admin/security/2fa/disable');
            setEnabled(false);
            setActiveStep(0);
            setConfirmDialog(false);
            toast.success('2FA disabled');
        } catch (error) {
            console.error('Failed to disable 2FA:', error);
            toast.error('Failed to disable 2FA');
        }
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret);
        toast.success('Secret key copied to clipboard');
    };

    const handleCopyBackupCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Backup code copied');
    };

    const steps = ['Start Setup', 'Scan QR Code', 'Save Backup Codes'];

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <LinearProgress />
                    <Typography sx={{ mt: 2 }} color="text.secondary" align="center">
                        Loading security settings...
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box>
            {/* Session Security Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Security color="primary" />
                        <Typography variant="h6" fontWeight="600">
                            Session Security Status
                        </Typography>
                    </Box>
                    <Stack spacing={1.5}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                Two-Factor Authentication
                            </Typography>
                            <Chip
                                label={enabled ? 'Enabled' : 'Disabled'}
                                color={enabled ? 'success' : 'warning'}
                                size="small"
                                icon={enabled ? <Verified /> : <Warning />}
                            />
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                Session Valid Until
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                                {sessionStatus.expiresAt
                                    ? new Date(sessionStatus.expiresAt).toLocaleString()
                                    : 'N/A'}
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                IP Address
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace">
                                {sessionStatus.ipAddress || 'Unknown'}
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                User Agent
                            </Typography>
                            <Tooltip title={sessionStatus.userAgent || 'Unknown'}>
                                <Typography
                                    variant="body2"
                                    noWrap
                                    sx={{ maxWidth: 300 }}
                                    fontFamily="monospace"
                                    fontSize="0.75rem"
                                >
                                    {sessionStatus.userAgent || 'Unknown'}
                                </Typography>
                            </Tooltip>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* 2FA Management */}
            <Card component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <Key color="primary" />
                        <Typography variant="h6" fontWeight="600">
                            Two-Factor Authentication
                        </Typography>
                    </Box>

                    {!enabled ? (
                        <Box>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <AlertTitle>Strengthen Your Account Security</AlertTitle>
                                Two-factor authentication adds an extra layer of security to your admin account.
                                When enabled, you'll need both your password and a verification code from your
                                authenticator app to sign in.
                            </Alert>

                            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>

                            {activeStep === 0 && (
                                <Box textAlign="center">
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<Smartphone />}
                                        onClick={handleStartSetup}
                                    >
                                        Start 2FA Setup
                                    </Button>
                                    <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
                                        You'll need an authenticator app like Google Authenticator or Authy
                                    </Typography>
                                </Box>
                            )}

                            {activeStep === 1 && (
                                <Box>
                                    <Typography variant="body2" gutterBottom align="center" sx={{ mb: 2 }}>
                                        Scan this QR code with your authenticator app
                                    </Typography>
                                    {qrCode && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                mb: 3,
                                                p: 2,
                                                bgcolor: 'white',
                                                borderRadius: 2,
                                                border: '2px solid',
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <img src={qrCode} alt="QR Code" style={{ maxWidth: 200 }} />
                                        </Box>
                                    )}
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            <strong>Manual Entry:</strong> {secret}
                                        </Typography>
                                        <IconButton size="small" onClick={handleCopySecret}>
                                            <ContentCopy fontSize="small" />
                                        </IconButton>
                                    </Alert>
                                    <TextField
                                        fullWidth
                                        label="Verification Code"
                                        placeholder="Enter 6-digit code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        sx={{ mb: 2 }}
                                        inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                                        helperText="Enter the 6-digit code from your authenticator app"
                                    />
                                    <Box display="flex" gap={2}>
                                        <Button onClick={() => setActiveStep(0)}>Back</Button>
                                        <Button
                                            variant="contained"
                                            onClick={handleVerify}
                                            disabled={verificationCode.length !== 6}
                                        >
                                            Verify & Enable
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            {activeStep === 2 && (
                                <Box>
                                    <Alert severity="success" sx={{ mb: 3 }}>
                                        <AlertTitle>2FA Enabled Successfully!</AlertTitle>
                                        Save these backup codes in a secure location. You can use them to access your
                                        account if you lose access to your authenticator app.
                                    </Alert>
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: 'background.default',
                                            borderRadius: 2,
                                            mb: 2
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                                            Backup Codes (use once each)
                                        </Typography>
                                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                                            {backupCodes.map((code, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        p: 1,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        fontFamily: 'monospace'
                                                    }}
                                                >
                                                    <Typography variant="body2">{code}</Typography>
                                                    <IconButton size="small" onClick={() => handleCopyBackupCode(code)}>
                                                        <ContentCopy fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                    <Alert severity="warning">
                                        <strong>Important:</strong> These codes will not be shown again. Download or print
                                        them now.
                                    </Alert>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box>
                            <Alert severity="success" sx={{ mb: 3 }} icon={<Check />}>
                                <AlertTitle>2FA is Active</AlertTitle>
                                Your admin account is protected with two-factor authentication.
                            </Alert>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setConfirmDialog(true)}
                            >
                                Disable 2FA
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Disable Confirmation Dialog */}
            <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
                <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <AlertTitle>Security Warning</AlertTitle>
                        Disabling 2FA will reduce the security of your admin account. You'll only need your
                        password to sign in.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to disable two-factor authentication?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDisable}>
                        Disable 2FA
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TwoFactorSetup;
