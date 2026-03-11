import React from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    Alert,
    AlertTitle,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Lock,
    ContactSupport,
    AdminPanelSettings,
    ExitToApp,
    Info,
    Security,
    VpnKey
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * PermissionDenied - Clear and actionable permission denial component
 * Features:
 * - Clear explanation of why access was denied
 * - Guidance on what permissions are required
 * - Contact information for escalation
 * - Session status information
 * - Safe navigation options
 */
const PermissionDenied = ({ 
    resource = 'this resource',
    requiredRole = 'admin',
    reason,
    canEscalate = true,
    onLogout
}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('token');
            navigate('/admin/login');
        }
    };

    const handleContactSupport = () => {
        // In production, this would open a support dialog or email
        window.open('mailto:admin-support@milonexa.com?subject=Permission Request', '_blank');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                py: 4
            }}
        >
            <Container maxWidth="sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            borderTop: 4,
                            borderColor: 'error.main'
                        }}
                    >
                        {/* Icon and Title */}
                        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: 'error.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 2
                                }}
                            >
                                <Lock sx={{ fontSize: 48, color: 'white' }} />
                            </Box>
                            <Typography variant="h4" fontWeight="700" gutterBottom align="center">
                                Access Denied
                            </Typography>
                            <Typography variant="body1" color="text.secondary" align="center">
                                You don't have permission to access {resource}
                            </Typography>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Detailed Explanation */}
                        <Alert severity="error" sx={{ mb: 3 }}>
                            <AlertTitle>Permission Required</AlertTitle>
                            {reason || (
                                <>
                                    This action requires the <strong>{requiredRole}</strong> role.
                                    Your current account doesn't have sufficient privileges.
                                </>
                            )}
                        </Alert>

                        {/* What You Can Do */}
                        <Box mb={3}>
                            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                                What you can do:
                            </Typography>
                            <List dense>
                                {canEscalate && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <ContactSupport color="primary" fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Request Access"
                                            secondary="Contact your administrator to request elevated permissions"
                                        />
                                    </ListItem>
                                )}
                                <ListItem>
                                    <ListItemIcon>
                                        <VpnKey color="primary" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Sign in with Different Account"
                                        secondary="If you have an account with proper permissions, try signing in again"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <Info color="primary" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Review Documentation"
                                        secondary="Check the admin documentation for role requirements"
                                    />
                                </ListItem>
                            </List>
                        </Box>

                        {/* Session Information */}
                        <Alert severity="info" sx={{ mb: 3 }} icon={<Security />}>
                            <Typography variant="caption" display="block" gutterBottom>
                                <strong>Session Information:</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                                Time: {new Date().toLocaleString()}
                            </Typography>
                            <Typography variant="caption" display="block">
                                Resource: {resource}
                            </Typography>
                            <Typography variant="caption" display="block">
                                Required Role: {requiredRole}
                            </Typography>
                        </Alert>

                        {/* Actions */}
                        <Box display="flex" gap={2} flexDirection="column">
                            {canEscalate && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    startIcon={<ContactSupport />}
                                    onClick={handleContactSupport}
                                >
                                    Request Access
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<ExitToApp />}
                                onClick={handleLogout}
                            >
                                Sign Out
                            </Button>
                            <Button
                                variant="text"
                                fullWidth
                                onClick={() => navigate(-1)}
                            >
                                Go Back
                            </Button>
                        </Box>

                        {/* Footer Note */}
                        <Box mt={3} p={2} bgcolor="background.default" borderRadius={1}>
                            <Typography variant="caption" color="text.secondary" align="center" display="block">
                                If you believe this is an error, please contact your system administrator
                                at <strong>admin-support@milonexa.com</strong>
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
};

export default PermissionDenied;
