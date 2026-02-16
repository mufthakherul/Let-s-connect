import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Button,
    Grid,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Chip,
    Alert,
    useTheme,
} from '@mui/material';
import {
    Visibility,
    TextFields,
    ZoomIn,
    Palette,
    AccessibilityNew,
    FormatSize,
    FontDownload,
} from '@mui/icons-material';
import { useThemeStore } from '../store/themeStore';

const COLOR_BLIND_TYPES = [
    { value: null, label: 'None', description: 'No color adjustments' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Difficulty distinguishing green and red' },
    { value: 'protanopia', label: 'Protanopia', description: 'Difficulty distinguishing red and green' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Difficulty distinguishing blue and yellow' },
];

const FONT_FAMILIES = [
    { value: 'default', label: 'Default', description: 'Inter, Roboto, Helvetica' },
    { value: 'dyslexic', label: 'Dyslexic Friendly', description: 'OpenDyslexic font' },
    { value: 'high-legibility', label: 'High Legibility', description: 'Atkinson Hyperlegible font' },
];

const AccessibilitySettings = () => {
    const theme = useTheme();
    const { accessibility, updateAccessibilitySetting, resetAccessibilitySettings } = useThemeStore();

    const handleSettingChange = (key, value) => {
        updateAccessibilitySetting(key, value);
    };

    const handleReset = () => {
        resetAccessibilitySettings();
    };

    return (
        <Box sx={{ maxWidth: 800, margin: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <AccessibilityNew sx={{ mr: 2 }} />
                Accessibility Settings
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                These settings help make the website more accessible for users with different needs.
                All preferences are saved automatically and will persist across sessions.
            </Alert>

            {/* High Contrast Mode */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Visibility sx={{ mr: 1 }} />
                        <Typography variant="h6">High Contrast</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Increases contrast for better visibility, especially helpful for users with visual impairments.
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={accessibility.highContrast}
                                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1">Enable High Contrast Mode</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {accessibility.highContrast ? 'High contrast mode is active' : 'Standard contrast'}
                                </Typography>
                            </Box>
                        }
                    />
                </CardContent>
            </Card>

            {/* Text Size and Scaling */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextFields sx={{ mr: 1 }} />
                        <Typography variant="h6">Text Size & Scaling</Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Large Text: Makes all text larger throughout the site
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={accessibility.largeText}
                                        onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Enable Large Text"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Text Scale: {Math.round(accessibility.textScale * 100)}%
                            </Typography>
                            <Slider
                                value={accessibility.textScale}
                                onChange={(e, value) => handleSettingChange('textScale', value)}
                                min={0.8}
                                max={2.0}
                                step={0.1}
                                marks={[
                                    { value: 0.8, label: '80%' },
                                    { value: 1.0, label: '100%' },
                                    { value: 1.5, label: '150%' },
                                    { value: 2.0, label: '200%' },
                                ]}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Color Blind Support */}
            <Card sx={{ mb: 3, borderLeft: '4px solid', borderLeftColor: 'info.main' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Palette sx={{ mr: 1 }} />
                        <Typography variant="h6">Color Blind Accessibility</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Applies color filters to improve visibility for different types of color blindness. This is separate from theme accent colors.
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Color Blindness Type</InputLabel>
                        <Select
                            value={accessibility.colorBlindSupport || ''}
                            onChange={(e) => handleSettingChange('colorBlindSupport', e.target.value || null)}
                            label="Color Blindness Type"
                        >
                            {COLOR_BLIND_TYPES.map((type) => (
                                <MenuItem key={type.value || 'none'} value={type.value || ''}>
                                    <Box>
                                        <Typography variant="body1">{type.label}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {type.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {accessibility.colorBlindSupport && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Color filter applied: {COLOR_BLIND_TYPES.find(t => t.value === accessibility.colorBlindSupport)?.label}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Magnification */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <ZoomIn sx={{ mr: 1 }} />
                        <Typography variant="h6">Magnification</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Zoom level: {Math.round(accessibility.magnification * 100)}%
                    </Typography>

                    <Slider
                        value={accessibility.magnification}
                        onChange={(e, value) => handleSettingChange('magnification', value)}
                        min={1.0}
                        max={2.0}
                        step={0.1}
                        marks={[
                            { value: 1.0, label: '100%' },
                            { value: 1.25, label: '125%' },
                            { value: 1.5, label: '150%' },
                            { value: 2.0, label: '200%' },
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Note: Magnification affects the entire page layout. Use browser zoom for temporary adjustments.
                    </Typography>
                </CardContent>
            </Card>

            {/* Font Family */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FontDownload sx={{ mr: 1 }} />
                        <Typography variant="h6">Font Family</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Choose a font that's easier to read for your needs.
                    </Typography>

                    <FormControl fullWidth>
                        <InputLabel>Font Family</InputLabel>
                        <Select
                            value={accessibility.fontFamily}
                            onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                            label="Font Family"
                        >
                            {FONT_FAMILIES.map((font) => (
                                <MenuItem key={font.value} value={font.value}>
                                    <Box>
                                        <Typography variant="body1" sx={{
                                            fontFamily: font.value === 'dyslexic' ? '"OpenDyslexic", sans-serif' :
                                                font.value === 'high-legibility' ? '"Atkinson Hyperlegible", sans-serif' : 'inherit'
                                        }}>
                                            {font.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {font.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            {/* Reduced Motion */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FormatSize sx={{ mr: 1 }} />
                        <Typography variant="h6">Motion & Animations</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Reduce or eliminate animations and transitions that may cause discomfort.
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={accessibility.reducedMotion}
                                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1">Reduce Motion</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {accessibility.reducedMotion ? 'Animations and transitions are disabled' : 'Standard animations enabled'}
                                </Typography>
                            </Box>
                        }
                    />
                </CardContent>
            </Card>

            {/* Reset and Preview */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Settings Management
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                        <Button
                            variant="outlined"
                            onClick={handleReset}
                            color="inherit"
                        >
                            Reset to Defaults
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                        Current Settings Preview
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                        {accessibility.highContrast && (
                            <Chip label="High Contrast" color="primary" size="small" />
                        )}
                        {accessibility.largeText && (
                            <Chip label="Large Text" color="secondary" size="small" />
                        )}
                        {accessibility.textScale !== 1.0 && (
                            <Chip label={`Text Scale: ${Math.round(accessibility.textScale * 100)}%`} color="info" size="small" />
                        )}
                        {accessibility.colorBlindSupport && (
                            <Chip label={`Color: ${COLOR_BLIND_TYPES.find(t => t.value === accessibility.colorBlindSupport)?.label}`} color="warning" size="small" />
                        )}
                        {accessibility.magnification !== 1.0 && (
                            <Chip label={`Zoom: ${Math.round(accessibility.magnification * 100)}%`} color="success" size="small" />
                        )}
                        {accessibility.reducedMotion && (
                            <Chip label="Reduced Motion" color="error" size="small" />
                        )}
                        {accessibility.fontFamily !== 'default' && (
                            <Chip label={`Font: ${FONT_FAMILIES.find(f => f.value === accessibility.fontFamily)?.label}`} color="default" size="small" />
                        )}
                    </Box>

                    {Object.values(accessibility).every(v => !v || v === 1.0 || v === 'default') && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                            No accessibility settings are currently active.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Information */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 Tip: Accessibility settings are saved to your browser and will persist across sessions.
                    You can also use your browser's built-in accessibility features in combination with these settings.
                </Typography>
            </Box>
        </Box>
    );
};

export default AccessibilitySettings;