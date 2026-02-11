import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Slider,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {
    Accessibility as AccessibilityIcon,
    Speed as SpeedIcon,
    Palette as PaletteIcon,
    School as SchoolIcon,
    ClosedCaption as CaptionIcon,
    Tune as TuneIcon,
} from '@mui/icons-material';
import api from '../../utils/api';

function ExperienceAccessibility({ meetingId, user }) {
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // State for each section
    const [experienceProfile, setExperienceProfile] = useState(null);
    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [accessibilitySettings, setAccessibilitySettings] = useState(null);
    const [themes, setThemes] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [mediaQuality, setMediaQuality] = useState(null);
    const [largeMeetingConfig, setLargeMeetingConfig] = useState(null);
    const [captions, setCaptions] = useState([]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            switch (activeTab) {
                case 0: // Experience Profile
                    const profileRes = await api.get('/collaboration/user/experience-profile');
                    setExperienceProfile(profileRes.data);
                    const stepsRes = await api.get('/collaboration/user/onboarding-steps');
                    setOnboardingSteps(stepsRes.data);
                    break;
                case 1: // Accessibility
                    const accessRes = await api.get('/collaboration/user/accessibility-settings');
                    setAccessibilitySettings(accessRes.data);
                    break;
                case 2: // Themes
                    const themesRes = await api.get('/collaboration/themes');
                    setThemes(themesRes.data);
                    break;
                case 3: // Media Quality
                    const qualityRes = await api.get('/collaboration/user/media-quality' + (meetingId ? `?meetingId=${meetingId}` : ''));
                    setMediaQuality(qualityRes.data);
                    break;
                case 4: // Captions
                    if (meetingId) {
                        const captionsRes = await api.get(`/collaboration/meetings/${meetingId}/captions`);
                        setCaptions(captionsRes.data);
                    }
                    break;
                case 5: // Large Meeting
                    if (meetingId) {
                        try {
                            const configRes = await api.get(`/collaboration/meetings/${meetingId}/large-meeting-config`);
                            setLargeMeetingConfig(configRes.data);
                        } catch (err) {
                            if (err.response?.status !== 404) {
                                throw err;
                            }
                        }
                    }
                    break;
                default:
                    break;
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExperienceProfile = async (updates) => {
        try {
            setError('');
            const res = await api.put('/collaboration/user/experience-profile', {
                ...experienceProfile,
                ...updates
            });
            setExperienceProfile(res.data);
            setSuccess('Experience profile updated');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile');
        }
    };

    const handleCompleteOnboardingStep = async (stepType, context) => {
        try {
            setError('');
            await api.post('/collaboration/user/onboarding-step', {
                stepType,
                context,
                completed: true
            });
            setSuccess('Onboarding step completed');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to complete step');
        }
    };

    const handleUpdateAccessibility = async (updates) => {
        try {
            setError('');
            const res = await api.put('/collaboration/user/accessibility-settings', {
                ...accessibilitySettings,
                ...updates
            });
            setAccessibilitySettings(res.data);
            setSuccess('Accessibility settings updated');
            
            // Apply settings immediately
            applyAccessibilitySettings(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update settings');
        }
    };

    const applyAccessibilitySettings = (settings) => {
        const root = document.documentElement;
        
        // Apply font size
        if (settings.fontSize) {
            root.style.fontSize = `${settings.fontSize}px`;
        }
        
        // Apply high contrast mode
        if (settings.highContrastMode) {
            root.setAttribute('data-theme', 'high-contrast');
        } else {
            root.removeAttribute('data-theme');
        }
        
        // Apply dyslexia-friendly font
        if (settings.dyslexiaFriendlyFont) {
            root.style.fontFamily = 'OpenDyslexic, Arial, sans-serif';
        }
        
        // Apply reduced motion
        if (settings.reducedMotion) {
            root.style.setProperty('--transition-duration', '0s');
        }
    };

    const handleUpdateMediaQuality = async (updates) => {
        try {
            setError('');
            const res = await api.put('/collaboration/user/media-quality', {
                ...mediaQuality,
                meetingId,
                ...updates
            });
            setMediaQuality(res.data);
            setSuccess('Media quality settings updated');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update quality settings');
        }
    };

    const handleUpdateLargeMeetingConfig = async (updates) => {
        try {
            setError('');
            const res = await api.post(`/collaboration/meetings/${meetingId}/large-meeting-config`, updates);
            setLargeMeetingConfig(res.data);
            setSuccess('Large meeting configuration updated');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update config');
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                <TuneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Experience & Accessibility
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }} variant="scrollable">
                <Tab label="Experience Level" />
                <Tab label="Accessibility" />
                <Tab label="Themes" />
                <Tab label="Media Quality" />
                {meetingId && <Tab label="Live Captions" />}
                {meetingId && <Tab label="Large Meeting" />}
            </Tabs>

            {/* Experience Profile Tab */}
            {activeTab === 0 && experienceProfile && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Experience Level</Typography>
                                <FormControl fullWidth sx={{ mt: 2 }}>
                                    <InputLabel>Level</InputLabel>
                                    <Select
                                        value={experienceProfile.experienceLevel}
                                        onChange={(e) => handleUpdateExperienceProfile({ experienceLevel: e.target.value })}
                                    >
                                        <MenuItem value="novice">Novice - Show me everything</MenuItem>
                                        <MenuItem value="intermediate">Intermediate - Balance simplicity and power</MenuItem>
                                        <MenuItem value="expert">Expert - Full control and advanced features</MenuItem>
                                    </Select>
                                </FormControl>
                                
                                <FormControl fullWidth sx={{ mt: 3 }}>
                                    <InputLabel>Interface Complexity</InputLabel>
                                    <Select
                                        value={experienceProfile.preferredComplexity}
                                        onChange={(e) => handleUpdateExperienceProfile({ preferredComplexity: e.target.value })}
                                    >
                                        <MenuItem value="simple">Simple - Hide advanced options</MenuItem>
                                        <MenuItem value="balanced">Balanced - Show most features</MenuItem>
                                        <MenuItem value="advanced">Advanced - All features visible</MenuItem>
                                    </Select>
                                </FormControl>

                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Onboarding Progress: {experienceProfile.completedOnboarding ? 'Complete' : 'In Progress'}
                                    </Typography>
                                    {experienceProfile.onboardingProgress && (
                                        <Typography variant="caption" color="text.secondary">
                                            {experienceProfile.onboardingProgress.completedSteps} / {experienceProfile.onboardingProgress.totalSteps} steps
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Onboarding Steps
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    {onboardingSteps.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No onboarding steps yet. Complete actions to track your progress!
                                        </Typography>
                                    )}
                                    {onboardingSteps.map((step) => (
                                        <Paper key={step.id} sx={{ p: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="subtitle2">{step.stepType}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Context: {step.context}
                                                    </Typography>
                                                </Box>
                                                <Chip 
                                                    label={step.completed ? 'Complete' : step.skipped ? 'Skipped' : 'Pending'}
                                                    color={step.completed ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Accessibility Tab */}
            {activeTab === 1 && accessibilitySettings && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Visual Accessibility
                                </Typography>
                                
                                <Stack spacing={3} sx={{ mt: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.highContrastMode}
                                                onChange={(e) => handleUpdateAccessibility({ highContrastMode: e.target.checked })}
                                            />
                                        }
                                        label="High Contrast Mode"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.dyslexiaFriendlyFont}
                                                onChange={(e) => handleUpdateAccessibility({ dyslexiaFriendlyFont: e.target.checked })}
                                            />
                                        }
                                        label="Dyslexia-Friendly Font"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.reducedMotion}
                                                onChange={(e) => handleUpdateAccessibility({ reducedMotion: e.target.checked })}
                                            />
                                        }
                                        label="Reduced Motion"
                                    />
                                    
                                    <Box>
                                        <Typography gutterBottom>Font Size: {accessibilitySettings.fontSize}px</Typography>
                                        <Slider
                                            value={accessibilitySettings.fontSize}
                                            onChange={(e, value) => handleUpdateAccessibility({ fontSize: value })}
                                            min={12}
                                            max={24}
                                            marks
                                            valueLabelDisplay="auto"
                                        />
                                    </Box>
                                    
                                    <FormControl fullWidth>
                                        <InputLabel>Color Blind Mode</InputLabel>
                                        <Select
                                            value={accessibilitySettings.colorBlindMode}
                                            onChange={(e) => handleUpdateAccessibility({ colorBlindMode: e.target.value })}
                                        >
                                            <MenuItem value="none">None</MenuItem>
                                            <MenuItem value="protanopia">Protanopia (Red-Blind)</MenuItem>
                                            <MenuItem value="deuteranopia">Deuteranopia (Green-Blind)</MenuItem>
                                            <MenuItem value="tritanopia">Tritanopia (Blue-Blind)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <CaptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Audio & Navigation
                                </Typography>
                                
                                <Stack spacing={3} sx={{ mt: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.screenReaderEnabled}
                                                onChange={(e) => handleUpdateAccessibility({ screenReaderEnabled: e.target.checked })}
                                            />
                                        }
                                        label="Screen Reader Optimized"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.keyboardNavigationOnly}
                                                onChange={(e) => handleUpdateAccessibility({ keyboardNavigationOnly: e.target.checked })}
                                            />
                                        }
                                        label="Keyboard Navigation Only"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={accessibilitySettings.captionsEnabled}
                                                onChange={(e) => handleUpdateAccessibility({ captionsEnabled: e.target.checked })}
                                            />
                                        }
                                        label="Enable Live Captions"
                                    />
                                    
                                    <FormControl fullWidth>
                                        <InputLabel>Caption Size</InputLabel>
                                        <Select
                                            value={accessibilitySettings.captionSize}
                                            onChange={(e) => handleUpdateAccessibility({ captionSize: e.target.value })}
                                        >
                                            <MenuItem value="small">Small</MenuItem>
                                            <MenuItem value="medium">Medium</MenuItem>
                                            <MenuItem value="large">Large</MenuItem>
                                            <MenuItem value="extra-large">Extra Large</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Themes Tab */}
            {activeTab === 2 && (
                <Grid container spacing={2}>
                    {themes.map((theme) => (
                        <Grid item xs={12} md={4} key={theme.id}>
                            <Card 
                                sx={{ 
                                    cursor: 'pointer',
                                    border: selectedTheme?.id === theme.id ? '2px solid primary.main' : 'none'
                                }}
                                onClick={() => setSelectedTheme(theme)}
                            >
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6">{theme.name}</Typography>
                                        {theme.isSystem && <Chip label="System" size="small" />}
                                    </Stack>
                                    <Chip label={theme.themeType} size="small" sx={{ mb: 2 }} />
                                    <Box sx={{ 
                                        display: 'flex', 
                                        gap: 1, 
                                        flexWrap: 'wrap',
                                        mt: 2
                                    }}>
                                        {theme.colors && Object.entries(theme.colors).slice(0, 5).map(([key, color]) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    backgroundColor: color,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1
                                                }}
                                                title={key}
                                            />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Media Quality Tab */}
            {activeTab === 3 && mediaQuality && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Media Quality Settings
                        </Typography>
                        
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Bandwidth</InputLabel>
                                    <Select
                                        value={mediaQuality.bandwidth}
                                        onChange={(e) => handleUpdateMediaQuality({ bandwidth: e.target.value })}
                                    >
                                        <MenuItem value="low">Low - Save data</MenuItem>
                                        <MenuItem value="medium">Medium - Balanced</MenuItem>
                                        <MenuItem value="high">High - Best quality</MenuItem>
                                        <MenuItem value="auto">Auto - Adaptive</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Video Quality</InputLabel>
                                    <Select
                                        value={mediaQuality.videoQuality}
                                        onChange={(e) => handleUpdateMediaQuality({ videoQuality: e.target.value })}
                                    >
                                        <MenuItem value="360p">360p</MenuItem>
                                        <MenuItem value="480p">480p</MenuItem>
                                        <MenuItem value="720p">720p (HD)</MenuItem>
                                        <MenuItem value="1080p">1080p (Full HD)</MenuItem>
                                        <MenuItem value="auto">Auto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Audio Quality</InputLabel>
                                    <Select
                                        value={mediaQuality.audioQuality}
                                        onChange={(e) => handleUpdateMediaQuality({ audioQuality: e.target.value })}
                                    >
                                        <MenuItem value="narrow">Narrow - Voice only</MenuItem>
                                        <MenuItem value="wide">Wide - Good quality</MenuItem>
                                        <MenuItem value="fullband">Fullband - Studio quality</MenuItem>
                                        <MenuItem value="auto">Auto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={mediaQuality.adaptiveMode}
                                            onChange={(e) => handleUpdateMediaQuality({ adaptiveMode: e.target.checked })}
                                        />
                                    }
                                    label="Adaptive Mode - Automatically adjust quality based on network conditions"
                                />
                            </Grid>
                            
                            {mediaQuality.currentBandwidthKbps && (
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        Current Bandwidth: {mediaQuality.currentBandwidthKbps} Kbps
                                        {mediaQuality.packetLoss && ` | Packet Loss: ${mediaQuality.packetLoss}%`}
                                        {mediaQuality.jitter && ` | Jitter: ${mediaQuality.jitter}ms`}
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Live Captions Tab */}
            {activeTab === 4 && meetingId && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <CaptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Live Captions
                        </Typography>
                        
                        <Stack spacing={1} sx={{ mt: 2, maxHeight: '500px', overflow: 'auto' }}>
                            {captions.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    No captions available yet. Captions will appear here as the meeting progresses.
                                </Typography>
                            )}
                            {captions.map((caption) => (
                                <Paper key={caption.id} sx={{ p: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" color="primary">
                                                {caption.speakerName || 'Speaker'}
                                            </Typography>
                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                {caption.content}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(caption.timestamp).toLocaleTimeString()}
                                                {caption.confidence && ` | Confidence: ${Math.round(caption.confidence * 100)}%`}
                                            </Typography>
                                        </Box>
                                        {caption.isFinal && (
                                            <Chip label="Final" size="small" color="success" />
                                        )}
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Large Meeting Configuration Tab */}
            {activeTab === 5 && meetingId && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Large Meeting Configuration
                        </Typography>
                        
                        {!largeMeetingConfig && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No large meeting configuration found. Create one to enable stage and audience modes for large meetings.
                            </Alert>
                        )}
                        
                        {largeMeetingConfig && (
                            <Grid container spacing={3} sx={{ mt: 2 }}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Mode</InputLabel>
                                        <Select
                                            value={largeMeetingConfig.mode}
                                            onChange={(e) => handleUpdateLargeMeetingConfig({ mode: e.target.value })}
                                        >
                                            <MenuItem value="stage">Stage Only - Presenters visible</MenuItem>
                                            <MenuItem value="audience">Audience Only - Viewers only</MenuItem>
                                            <MenuItem value="hybrid">Hybrid - Mix of both</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Max Stage Participants"
                                        type="number"
                                        value={largeMeetingConfig.maxStageParticipants}
                                        onChange={(e) => handleUpdateLargeMeetingConfig({ maxStageParticipants: parseInt(e.target.value) })}
                                        inputProps={{ min: 1, max: 50 }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>View Mode</InputLabel>
                                        <Select
                                            value={largeMeetingConfig.viewMode}
                                            onChange={(e) => handleUpdateLargeMeetingConfig({ viewMode: e.target.value })}
                                        >
                                            <MenuItem value="speaker">Speaker - Focus on active speaker</MenuItem>
                                            <MenuItem value="gallery">Gallery - Show all participants</MenuItem>
                                            <MenuItem value="presentation">Presentation - Focus on shared content</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={largeMeetingConfig.enableQA}
                                                onChange={(e) => handleUpdateLargeMeetingConfig({ enableQA: e.target.checked })}
                                            />
                                        }
                                        label="Enable Q&A"
                                    />
                                </Grid>
                                
                                {largeMeetingConfig.audienceSize > 0 && (
                                    <Grid item xs={12}>
                                        <Alert severity="info">
                                            Current Audience Size: {largeMeetingConfig.audienceSize} participants
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

export default ExperienceAccessibility;
