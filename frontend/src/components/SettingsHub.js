import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, List, ListItemButton, ListItemIcon, ListItemText,
    Divider, Paper, Switch, FormControlLabel, RadioGroup, Radio,
    FormLabel, FormGroup, Select, MenuItem, FormControl, InputLabel,
    TextField, Button, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, Alert, Chip, Tooltip, Accordion, AccordionSummary,
    AccordionDetails, useMediaQuery, useTheme, Card, CardContent
} from '@mui/material';
import {
    Person, VisibilityOff, Security, Palette,
    Notifications as NotificationsIcon, Language, Storage, Accessibility,
    ExpandMore, LaptopMac, PhoneAndroid, CheckCircle, Warning
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageShell from './common/PageShell';
import SettingsIcon from '@mui/icons-material/Settings';

const NAV_SECTIONS = [
    { id: 'profile', label: 'Profile', icon: <Person /> },
    { id: 'privacy', label: 'Privacy', icon: <VisibilityOff /> },
    { id: 'security', label: 'Account Security', icon: <Security /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette /> },
    { id: 'notifications', label: 'Notifications', icon: <NotificationsIcon /> },
    { id: 'locale', label: 'Language & Region', icon: <Language /> },
    { id: 'data', label: 'Data & Privacy', icon: <Storage /> },
    { id: 'accessibility', label: 'Accessibility', icon: <Accessibility /> },
];

const panelVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

const mockSessions = [
    { id: 1, device: 'laptop', label: 'Chrome on Windows · New York, US', current: true },
    { id: 2, device: 'phone', label: 'Safari on iPhone · London, UK', current: false },
    { id: 3, device: 'laptop', label: 'Firefox on macOS · Sydney, AU', current: false },
];

export default function SettingsHub({ user: userProp }) {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user: storeUser } = useAuthStore();
    const user = userProp ?? storeUser;

    // Active section
    const [activeSection, setActiveSection] = useState('profile');

    // Privacy
    const [seePosts, setSeePosts] = useState('everyone');
    const [seeFriends, setSeeFriends] = useState('friends');
    const [discoverable, setDiscoverable] = useState(true);
    const [indexable, setIndexable] = useState(true);

    // Security
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const twoFAEnabled = false;

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Appearance
    const [themePreference, setThemePreference] = useState('system');
    const [fontSize, setFontSize] = useState('normal');
    const [compactMode, setCompactMode] = useState(false);

    // Notifications
    const [notifFriendRequests, setNotifFriendRequests] = useState(true);
    const [notifMessages, setNotifMessages] = useState(true);
    const [notifGroups, setNotifGroups] = useState(true);
    const [notifPages, setNotifPages] = useState(true);
    const [notifStreaming, setNotifStreaming] = useState(true);
    const [notifSystem, setNotifSystem] = useState(true);
    const [emailDigest, setEmailDigest] = useState('weekly');

    // Locale
    const [language, setLanguage] = useState('en');
    const [timezone, setTimezone] = useState('UTC');
    const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

    // Accessibility
    const [highContrast, setHighContrast] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [screenReaderHints, setScreenReaderHints] = useState(false);
    const [largeTargets, setLargeTargets] = useState(false);

    // Init from localStorage on mount
    useEffect(() => {
        const safeRead = (key, parse = true) => {
            try {
                const raw = localStorage.getItem(key);
                return raw === null ? null : parse ? JSON.parse(raw) : raw;
            } catch (e) {
                console.warn(`[SettingsHub] Failed to read localStorage key "${key}":`, e);
                return null;
            }
        };

        const privacy = safeRead('lc_privacy_settings');
        if (privacy) {
            if (privacy.seePosts !== undefined) setSeePosts(privacy.seePosts);
            if (privacy.seeFriends !== undefined) setSeeFriends(privacy.seeFriends);
            if (privacy.discoverable !== undefined) setDiscoverable(privacy.discoverable);
            if (privacy.indexable !== undefined) setIndexable(privacy.indexable);
        }

        const storedTheme = safeRead('lc_theme_preference');
        if (storedTheme) setThemePreference(storedTheme);

        const storedFontSize = safeRead('lc_font_size', false);
        if (storedFontSize) setFontSize(storedFontSize);

        const storedCompact = safeRead('lc_compact_mode', false);
        if (storedCompact !== null) setCompactMode(storedCompact === 'true');

        const notifPrefs = safeRead('lc_notification_prefs');
        if (notifPrefs) {
            if (notifPrefs.friendRequests !== undefined) setNotifFriendRequests(notifPrefs.friendRequests);
            if (notifPrefs.messages !== undefined) setNotifMessages(notifPrefs.messages);
            if (notifPrefs.groups !== undefined) setNotifGroups(notifPrefs.groups);
            if (notifPrefs.pages !== undefined) setNotifPages(notifPrefs.pages);
            if (notifPrefs.streaming !== undefined) setNotifStreaming(notifPrefs.streaming);
            if (notifPrefs.system !== undefined) setNotifSystem(notifPrefs.system);
            if (notifPrefs.emailDigest !== undefined) setEmailDigest(notifPrefs.emailDigest);
        }

        const localePrefs = safeRead('lc_locale_prefs');
        if (localePrefs) {
            if (localePrefs.language !== undefined) setLanguage(localePrefs.language);
            if (localePrefs.timezone !== undefined) setTimezone(localePrefs.timezone);
            if (localePrefs.dateFormat !== undefined) setDateFormat(localePrefs.dateFormat);
        }

        const a11y = safeRead('lc_accessibility');
        if (a11y) {
            if (a11y.highContrast !== undefined) setHighContrast(a11y.highContrast);
            if (a11y.reducedMotion !== undefined) setReducedMotion(a11y.reducedMotion);
            if (a11y.screenReaderHints !== undefined) setScreenReaderHints(a11y.screenReaderHints);
            if (a11y.largeTargets !== undefined) setLargeTargets(a11y.largeTargets);
        }
    }, []);

    const handleSavePrivacy = useCallback(() => {
        localStorage.setItem('lc_privacy_settings', JSON.stringify({ seePosts, seeFriends, discoverable, indexable }));
        toast.success('Privacy settings saved');
    }, [seePosts, seeFriends, discoverable, indexable]);

    const handleChangePassword = useCallback(async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        setPasswordLoading(true);
        try {
            await api.post('/api/auth/change-password', { currentPassword, newPassword });
            toast.success('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    }, [currentPassword, newPassword, confirmPassword]);

    const handleSaveAppearance = useCallback(() => {
        localStorage.setItem('lc_theme_preference', JSON.stringify(themePreference));
        localStorage.setItem('lc_font_size', fontSize);
        localStorage.setItem('lc_compact_mode', String(compactMode));
        // Consumers of 'theme-change' should read event.detail.theme ('light'|'dark'|'system')
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: themePreference } }));
        toast.success('Appearance settings saved');
    }, [themePreference, fontSize, compactMode]);

    const handleSaveNotifications = useCallback(() => {
        localStorage.setItem('lc_notification_prefs', JSON.stringify({
            friendRequests: notifFriendRequests,
            messages: notifMessages,
            groups: notifGroups,
            pages: notifPages,
            streaming: notifStreaming,
            system: notifSystem,
            emailDigest,
        }));
        toast.success('Notification preferences saved');
    }, [notifFriendRequests, notifMessages, notifGroups, notifPages, notifStreaming, notifSystem, emailDigest]);

    const handleSaveLocale = useCallback(() => {
        localStorage.setItem('lc_locale_prefs', JSON.stringify({ language, timezone, dateFormat }));
        toast.success('Language & Region settings saved');
    }, [language, timezone, dateFormat]);

    const handleDownloadData = useCallback(() => {
        const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [user]);

    const handleDeleteAccount = useCallback(() => {
        toast.success('Account deletion scheduled. Check your email.');
        setDeleteDialogOpen(false);
        setDeleteStep(1);
        setDeleteConfirmText('');
    }, []);

    const handleSaveAccessibility = useCallback(() => {
        localStorage.setItem('lc_accessibility', JSON.stringify({ highContrast, reducedMotion, screenReaderHints, largeTargets }));
        toast.success('Accessibility settings saved');
    }, [highContrast, reducedMotion, screenReaderHints, largeTargets]);

    const renderPanel = (sectionId) => {
        switch (sectionId) {
            case 'profile':
                return (
                    <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="h6">Profile</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Manage your public profile, avatar, cover photo, bio and social links.
                            </Typography>
                            <Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Person />}
                                    onClick={() => navigate('/profile')}
                                >
                                    Edit Profile
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                );

            case 'privacy':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Privacy Settings</Typography>

                        <Box>
                            <FormLabel component="legend">Who can see my posts?</FormLabel>
                            <RadioGroup row value={seePosts} onChange={(e) => setSeePosts(e.target.value)}>
                                <FormControlLabel value="everyone" control={<Radio />} label="Everyone" />
                                <FormControlLabel value="friends" control={<Radio />} label="Friends" />
                                <FormControlLabel value="only_me" control={<Radio />} label="Only Me" />
                            </RadioGroup>
                        </Box>

                        <Box>
                            <FormLabel component="legend">Who can see my friend list?</FormLabel>
                            <RadioGroup row value={seeFriends} onChange={(e) => setSeeFriends(e.target.value)}>
                                <FormControlLabel value="everyone" control={<Radio />} label="Everyone" />
                                <FormControlLabel value="friends" control={<Radio />} label="Friends" />
                                <FormControlLabel value="only_me" control={<Radio />} label="Only Me" />
                            </RadioGroup>
                        </Box>

                        <FormControlLabel
                            control={<Switch checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} />}
                            label="Profile discoverability"
                        />
                        <FormControlLabel
                            control={<Switch checked={indexable} onChange={(e) => setIndexable(e.target.checked)} />}
                            label="Indexable by search engines"
                        />

                        <Box>
                            <Button variant="contained" onClick={handleSavePrivacy}>Save</Button>
                        </Box>
                    </Box>
                );

            case 'security':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Account Security</Typography>

                        <Typography variant="subtitle2">Change Password</Typography>
                        <TextField
                            fullWidth
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Box>
                            <Button
                                variant="contained"
                                onClick={handleChangePassword}
                                disabled={passwordLoading}
                            >
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </Box>

                        <Divider />

                        <Typography variant="subtitle2">Active Sessions</Typography>
                        {mockSessions.map((session) => (
                            <Box
                                key={session.id}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
                            >
                                <Chip
                                    icon={session.device === 'phone' ? <PhoneAndroid /> : <LaptopMac />}
                                    label={session.current ? 'This device' : session.device}
                                    size="small"
                                />
                                <Typography variant="body2" sx={{ flex: 1 }}>{session.label}</Typography>
                                {session.current && (
                                    <Chip label="Current" color="success" size="small" />
                                )}
                                <Button
                                    size="small"
                                    color="error"
                                    disabled={session.current}
                                    onClick={() => toast.success('Session revoked')}
                                >
                                    Revoke
                                </Button>
                            </Box>
                        ))}
                        <Box>
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={() => toast.success('Signed out of all other devices')}
                            >
                                Sign out all other sessions
                            </Button>
                        </Box>

                        <Divider />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>Two-Factor Authentication</Typography>
                            <Chip
                                label={twoFAEnabled ? 'Enabled' : 'Disabled'}
                                color={twoFAEnabled ? 'success' : 'default'}
                                icon={twoFAEnabled ? <CheckCircle /> : <Warning />}
                                size="small"
                            />
                            <Button size="small" variant="outlined" onClick={() => navigate('/auth')}>
                                Manage 2FA
                            </Button>
                        </Box>
                    </Box>
                );

            case 'appearance':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Appearance</Typography>

                        <Box>
                            <FormLabel component="legend">Theme</FormLabel>
                            <RadioGroup row value={themePreference} onChange={(e) => setThemePreference(e.target.value)}>
                                <FormControlLabel value="light" control={<Radio />} label="Light" />
                                <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                                <FormControlLabel value="system" control={<Radio />} label="System" />
                            </RadioGroup>
                        </Box>

                        <Box>
                            <FormLabel component="legend">Font Size</FormLabel>
                            <RadioGroup row value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                                <FormControlLabel value="normal" control={<Radio />} label="Normal" />
                                <FormControlLabel value="large" control={<Radio />} label="Large" />
                                <FormControlLabel value="extra-large" control={<Radio />} label="Extra-Large" />
                            </RadioGroup>
                        </Box>

                        <FormControlLabel
                            control={<Switch checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />}
                            label="Compact Mode"
                        />

                        <Box>
                            <Button variant="contained" onClick={handleSaveAppearance}>Save</Button>
                        </Box>
                    </Box>
                );

            case 'notifications':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Notification Preferences</Typography>

                        <FormControlLabel
                            control={<Switch checked={notifFriendRequests} onChange={(e) => setNotifFriendRequests(e.target.checked)} />}
                            label="Friend Requests"
                        />
                        <FormControlLabel
                            control={<Switch checked={notifMessages} onChange={(e) => setNotifMessages(e.target.checked)} />}
                            label="Messages"
                        />
                        <FormControlLabel
                            control={<Switch checked={notifGroups} onChange={(e) => setNotifGroups(e.target.checked)} />}
                            label="Group Activity"
                        />
                        <FormControlLabel
                            control={<Switch checked={notifPages} onChange={(e) => setNotifPages(e.target.checked)} />}
                            label="Page Activity"
                        />
                        <FormControlLabel
                            control={<Switch checked={notifStreaming} onChange={(e) => setNotifStreaming(e.target.checked)} />}
                            label="Streaming"
                        />
                        <FormControlLabel
                            control={<Switch checked={notifSystem} onChange={(e) => setNotifSystem(e.target.checked)} />}
                            label="System"
                        />

                        <Box>
                            <FormLabel component="legend">Email Digest</FormLabel>
                            <RadioGroup row value={emailDigest} onChange={(e) => setEmailDigest(e.target.value)}>
                                <FormControlLabel value="daily" control={<Radio />} label="Daily" />
                                <FormControlLabel value="weekly" control={<Radio />} label="Weekly" />
                                <FormControlLabel value="never" control={<Radio />} label="Never" />
                            </RadioGroup>
                        </Box>

                        <Box>
                            <Button variant="contained" onClick={handleSaveNotifications}>Save</Button>
                        </Box>
                    </Box>
                );

            case 'locale':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Language & Region</Typography>

                        <FormControl fullWidth>
                            <InputLabel>Language</InputLabel>
                            <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                                <MenuItem value="en">English</MenuItem>
                                <MenuItem value="es">Español</MenuItem>
                                <MenuItem value="fr">Français</MenuItem>
                                <MenuItem value="ar">العربية</MenuItem>
                                <MenuItem value="de">Deutsch</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Timezone</InputLabel>
                            <Select value={timezone} label="Timezone" onChange={(e) => setTimezone(e.target.value)}>
                                <MenuItem value="UTC">UTC</MenuItem>
                                <MenuItem value="America/New_York">America/New_York</MenuItem>
                                <MenuItem value="Europe/London">Europe/London</MenuItem>
                                <MenuItem value="Asia/Dubai">Asia/Dubai</MenuItem>
                                <MenuItem value="Asia/Singapore">Asia/Singapore</MenuItem>
                                <MenuItem value="Australia/Sydney">Australia/Sydney</MenuItem>
                            </Select>
                        </FormControl>

                        <Box>
                            <FormLabel component="legend">Date Format</FormLabel>
                            <RadioGroup row value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                                <FormControlLabel value="MM/DD/YYYY" control={<Radio />} label="MM/DD/YYYY" />
                                <FormControlLabel value="DD/MM/YYYY" control={<Radio />} label="DD/MM/YYYY" />
                                <FormControlLabel value="YYYY-MM-DD" control={<Radio />} label="YYYY-MM-DD" />
                            </RadioGroup>
                        </Box>

                        <Box>
                            <Button variant="contained" onClick={handleSaveLocale}>Save</Button>
                        </Box>
                    </Box>
                );

            case 'data':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Data & Privacy</Typography>

                        <Box>
                            <Button variant="outlined" onClick={handleDownloadData}>Download My Data</Button>
                        </Box>

                        <Divider />

                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'error.light',
                                borderRadius: 2,
                                bgcolor: (t) => `${t.palette.error.light}22`,
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning color="error" />
                                <Typography variant="subtitle1" color="error" fontWeight={700}>
                                    Danger Zone
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </Typography>
                            <Box>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => { setDeleteStep(1); setDeleteDialogOpen(true); }}
                                >
                                    Delete My Account
                                </Button>
                            </Box>
                        </Box>

                        <Dialog
                            open={deleteDialogOpen}
                            onClose={() => setDeleteDialogOpen(false)}
                            maxWidth="xs"
                            fullWidth
                        >
                            <DialogTitle>Delete Account</DialogTitle>
                            <DialogContent>
                                {deleteStep === 1 ? (
                                    <Alert severity="warning">
                                        <strong>Are you sure?</strong> This will permanently remove your account,
                                        posts, messages, and all associated data. This action cannot be reversed.
                                    </Alert>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                                        <Typography variant="body2">Type <strong>DELETE</strong> to confirm</Typography>
                                        <TextField
                                            fullWidth
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="DELETE"
                                        />
                                    </Box>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                {deleteStep === 1 ? (
                                    <Button color="error" onClick={() => setDeleteStep(2)}>Continue</Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        color="error"
                                        disabled={deleteConfirmText !== 'DELETE'}
                                        onClick={handleDeleteAccount}
                                    >
                                        Delete Account
                                    </Button>
                                )}
                            </DialogActions>
                        </Dialog>
                    </Box>
                );

            case 'accessibility':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Accessibility</Typography>

                        <FormControlLabel
                            sx={{ display: 'flex', mb: 0.5 }}
                            control={<Switch checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />}
                            label="High Contrast Mode"
                        />
                        <FormControlLabel
                            sx={{ display: 'flex', mb: 0.5 }}
                            control={<Switch checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />}
                            label="Reduced Motion"
                        />
                        <FormControlLabel
                            sx={{ display: 'flex', mb: 0.5 }}
                            control={<Switch checked={screenReaderHints} onChange={(e) => setScreenReaderHints(e.target.checked)} />}
                            label="Screen Reader Hints"
                        />
                        <FormControlLabel
                            sx={{ display: 'flex', mb: 0.5 }}
                            control={<Switch checked={largeTargets} onChange={(e) => setLargeTargets(e.target.checked)} />}
                            label="Large Click Targets"
                        />

                        <Box mt={2}>
                            <Button variant="contained" onClick={handleSaveAccessibility}>Save</Button>
                        </Box>
                    </Box>
                );

            default:
                return null;
        }
    };

    const desktopLayout = (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <Paper
                elevation={0}
                variant="outlined"
                sx={{ width: 240, borderRadius: 3, position: 'sticky', top: 80, flexShrink: 0 }}
            >
                <List disablePadding>
                    {NAV_SECTIONS.map((section, idx) => (
                        <React.Fragment key={section.id}>
                            {idx > 0 && <Divider />}
                            <ListItemButton
                                selected={activeSection === section.id}
                                onClick={() => setActiveSection(section.id)}
                                sx={{ borderRadius: idx === 0 ? '12px 12px 0 0' : idx === NAV_SECTIONS.length - 1 ? '0 0 12px 12px' : 0 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>{section.icon}</ListItemIcon>
                                <ListItemText primary={section.label} primaryTypographyProps={{ variant: 'body2' }} />
                            </ListItemButton>
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        variants={panelVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {renderPanel(activeSection)}
                    </motion.div>
                </AnimatePresence>
            </Box>
        </Box>
    );

    const mobileLayout = (
        <Box>
            {NAV_SECTIONS.map((section) => (
                <Accordion
                    key={section.id}
                    expanded={activeSection === section.id}
                    onChange={(_, expanded) => setActiveSection(expanded ? section.id : '')}
                >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {section.icon}
                            <Typography variant="body1">{section.label}</Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AnimatePresence mode="wait">
                            {activeSection === section.id && (
                                <motion.div
                                    key={section.id}
                                    variants={panelVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {renderPanel(section.id)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );

    return (
        <PageShell
            title="Settings"
            subtitle="Manage your profile, privacy, security, and preferences."
            icon={<SettingsIcon fontSize="large" />}
        >
            {isMobile ? mobileLayout : desktopLayout}
        </PageShell>
    );
}
