import React from 'react';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

export default function SettingsHub() {
    return (
        <Box sx={{ mt: 4, px: 2, maxWidth: 980, mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Settings</Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} elevation={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <SettingsIcon sx={{ fontSize: 28 }} />
                            <Typography variant="h6">General</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">Account, privacy and security settings.</Typography>
                        <Button component={Link} to="/security" variant="outlined">Open</Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} elevation={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <PaletteIcon sx={{ fontSize: 28 }} />
                            <Typography variant="h6">Appearance</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">Theme, accent color and display preferences.</Typography>
                        <Button component={Link} to="/settings/theme" variant="outlined">Customize</Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} elevation={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AccessibilityNewIcon sx={{ fontSize: 28 }} />
                            <Typography variant="h6">Accessibility</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">Adjust font sizes, contrast and assistive features.</Typography>
                        <Button component={Link} to="/settings/accessibility" variant="outlined">Open</Button>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mt: 1 }} elevation={0}>
                        <Typography variant="body2" color="text.secondary">Other settings are available in their respective sections (notifications, email preferences, security). Use the search or quick access (Ctrl/Cmd+K) to find specific options.</Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
