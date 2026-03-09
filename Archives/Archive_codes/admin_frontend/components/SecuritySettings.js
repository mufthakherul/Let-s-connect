import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, Chip, List, ListItem, ListItemText, IconButton,
    Divider, Switch, FormControlLabel, CircularProgress, Card, CardContent
} from '@mui/material';
import {
    Security, Check, ContentCopy, Refresh, VpnKey
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';

const SecuritySettings = () => {
    const [loading, setLoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

    // Setup 2FA
    const [setupDialog, setSetupDialog] = useState(false);
    const [secret, setSecret] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [setupStep, setSetupStep] = useState(1);

    // Disable 2FA
    const [disableDialog, setDisableDialog] = useState(false);
    const [disableCode, setDisableCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');

    // Regenerate backup codes
    const [regenerateDialog, setRegenerateDialog] = useState(false);
    const [regeneratePassword, setRegeneratePassword] = useState('');
    const [newBackupCodes, setNewBackupCodes] = useState([]);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load 2FA status
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const response = await api.get('/user-service/2fa/status');
            setTwoFactorEnabled(response.data.enabled);
            setBackupCodesRemaining(response.data.backupCodesRemaining);
        } catch (error) {
            console.error('Failed to fetch 2FA status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Start 2FA setup
    const handleStartSetup = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.post('/user-service/2fa/setup');
            setSecret(response.data.secret);
            setQrCodeUrl(response.data.qrCode);
            setBackupCodes(response.data.backupCodes);
            setSetupDialog(true);
            setSetupStep(1);
        } catch (error) {
            setError('Failed to setup 2FA');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Enable 2FA
    const handleEnable2FA = async () => {
        try {
            setLoading(true);
            setError('');
            await api.post('/user-service/2fa/enable', { code: verificationCode });
            setSuccess('2FA enabled successfully!');
            setSetupDialog(false);
            setVerificationCode('');
            fetchStatus();
        } catch (error) {
            setError(error.response?.data?.error || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    // Disable 2FA
    const handleDisable2FA = async () => {
        try {
            setLoading(true);
            setError('');
            await api.post('/user-service/2fa/disable', {
                code: disableCode,
                password: disablePassword
            });
            setSuccess('2FA disabled successfully');
            setDisableDialog(false);
            setDisableCode('');
            setDisablePassword('');
            fetchStatus();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    // Regenerate backup codes
    const handleRegenerateBackupCodes = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.post('/user-service/2fa/regenerate-backup-codes', {
                password: regeneratePassword
            });
            setNewBackupCodes(response.data.backupCodes);
            setSuccess('Backup codes regenerated successfully');
            setRegeneratePassword('');
            fetchStatus();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to regenerate backup codes');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    const copyAllBackupCodes = () => {
        const codes = backupCodes.join('\n');
        copyToClipboard(codes);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                Security Settings
            </Typography>

            {success && (
                <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !setupDialog && !disableDialog && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6">Two-Factor Authentication (2FA)</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Add an extra layer of security to your account
                                </Typography>
                            </Box>
                            <Chip
                                label={twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                color={twoFactorEnabled ? 'success' : 'default'}
                                icon={twoFactorEnabled ? <Check /> : undefined}
                            />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {!twoFactorEnabled ? (
                            <Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Enable two-factor authentication to protect your account with an additional security code from your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<VpnKey />}
                                    onClick={handleStartSetup}
                                >
                                    Enable 2FA
                                </Button>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Two-factor authentication is currently enabled on your account.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => setDisableDialog(true)}
                                    >
                                        Disable 2FA
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Refresh />}
                                        onClick={() => setRegenerateDialog(true)}
                                    >
                                        Regenerate Backup Codes
                                    </Button>
                                </Box>
                                <Alert severity="info">
                                    Backup codes remaining: {backupCodesRemaining}
                                </Alert>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Setup 2FA Dialog */}
            <Dialog open={setupDialog} onClose={() => setSetupDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                <DialogContent>
                    {setupStep === 1 && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Step 1: Scan QR Code
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                                <QRCodeSVG value={qrCodeUrl} size={200} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Or enter this secret key manually:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    value={secret}
                                    InputProps={{ readOnly: true }}
                                    size="small"
                                />
                                <IconButton onClick={() => copyToClipboard(secret)}>
                                    <ContentCopy />
                                </IconButton>
                            </Box>
                            <Button
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3 }}
                                onClick={() => setSetupStep(2)}
                            >
                                Next: Save Backup Codes
                            </Button>
                        </Box>
                    )}

                    {setupStep === 2 && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Step 2: Save Backup Codes
                            </Typography>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                            </Alert>
                            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2, maxHeight: 200, overflow: 'auto' }}>
                                <List dense>
                                    {backupCodes.map((code, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={code}
                                                primaryTypographyProps={{ fontFamily: 'monospace' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<ContentCopy />}
                                onClick={copyAllBackupCodes}
                                sx={{ mb: 2 }}
                            >
                                Copy All Codes
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => setSetupStep(3)}
                            >
                                Next: Verify
                            </Button>
                        </Box>
                    )}

                    {setupStep === 3 && (
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Step 3: Verify Code
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Enter the 6-digit code from your authenticator app to verify the setup.
                            </Typography>
                            <TextField
                                fullWidth
                                label="Verification Code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="000000"
                                inputProps={{ maxLength: 6 }}
                            />
                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {error}
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSetupDialog(false)}>Cancel</Button>
                    {setupStep === 3 && (
                        <Button
                            variant="contained"
                            onClick={handleEnable2FA}
                            disabled={verificationCode.length !== 6 || loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Enable 2FA'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Disable 2FA Dialog */}
            <Dialog open={disableDialog} onClose={() => setDisableDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ my: 2 }}>
                        Disabling 2FA will make your account less secure. Are you sure you want to continue?
                    </Alert>
                    <TextField
                        fullWidth
                        label="Verification Code"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                        placeholder="000000"
                        inputProps={{ maxLength: 6 }}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisableDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDisable2FA}
                        disabled={!disableCode || !disablePassword || loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Disable 2FA'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Regenerate Backup Codes Dialog */}
            <Dialog open={regenerateDialog} onClose={() => setRegenerateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Regenerate Backup Codes</DialogTitle>
                <DialogContent>
                    {!newBackupCodes.length ? (
                        <Box sx={{ pt: 2 }}>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                This will invalidate your existing backup codes. New backup codes will be generated.
                            </Alert>
                            <TextField
                                fullWidth
                                type="password"
                                label="Password"
                                value={regeneratePassword}
                                onChange={(e) => setRegeneratePassword(e.target.value)}
                            />
                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {error}
                                </Alert>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ pt: 2 }}>
                            <Alert severity="success" sx={{ mb: 2 }}>
                                New backup codes generated successfully! Save these in a safe place.
                            </Alert>
                            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2, maxHeight: 200, overflow: 'auto' }}>
                                <List dense>
                                    {newBackupCodes.map((code, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={code}
                                                primaryTypographyProps={{ fontFamily: 'monospace' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<ContentCopy />}
                                onClick={() => copyToClipboard(newBackupCodes.join('\n'))}
                            >
                                Copy All Codes
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setRegenerateDialog(false);
                        setNewBackupCodes([]);
                    }}>
                        {newBackupCodes.length ? 'Done' : 'Cancel'}
                    </Button>
                    {!newBackupCodes.length && (
                        <Button
                            variant="contained"
                            onClick={handleRegenerateBackupCodes}
                            disabled={!regeneratePassword || loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Regenerate'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SecuritySettings;
