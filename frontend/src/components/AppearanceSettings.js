import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Alert
} from '@mui/material';
import {
  Palette,
  TextFields,
  Animation,
  ViewQuilt,
  AutoAwesome,
  GetApp,
  Publish,
  RestartAlt,
  Preview,
  PlayArrow,
  Pause,
  Brightness4,
  Brightness7,
  Lock
} from '@mui/icons-material';
import { useAppearanceStore, FONT_FAMILIES, NAVBAR_ICON_STYLES, BACKGROUND_ANIMATIONS, THEME_PRESETS, CARD_STYLES, LAYOUT_DENSITY } from '../store/appearanceStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AppearanceSettings = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Check authentication
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      toast.error('Please login to customize appearance settings');
      navigate('/login');
    }
  }, [navigate]);
  
  const {
    theme,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    lineHeight,
    letterSpacing,
    navbarIconStyle,
    navbarPosition,
    navbarIconSize,
    backgroundAnimation,
    pageTransitions,
    hoverEffects,
    scrollAnimations,
    cardShadow,
    borderRadius,
    glassEffect,
    autoScroll,
    scrollSpeed,
    pauseOnHover,
    cardStyle,
    layoutDensity,
    darkMode,
    headingFont,
    animationSpeed,
    reduceMotion,
    highContrast,
    colorBlindMode,
    updateSetting,
    applyThemePreset,
    resetAppearance,
    exportSettings,
    importSettings,
    toggleAutoScroll
  } = useAppearanceStore();
  
  const { mode } = useThemeStore();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExport = () => {
    const settings = exportSettings();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appearance-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully!');
  };

  const handleImport = () => {
    if (importSettings(importText)) {
      toast.success('Settings imported successfully!');
      setImportDialogOpen(false);
      setImportText('');
    } else {
      toast.error('Failed to import settings. Please check the format.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all appearance settings to default?')) {
      resetAppearance();
      toast.success('Appearance settings reset to default');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
          Appearance Customization
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Preview mode">
            <IconButton onClick={() => setPreviewMode(!previewMode)} color={previewMode ? 'primary' : 'default'}>
              <Preview />
            </IconButton>
          </Tooltip>
          <Button startIcon={<GetApp />} onClick={handleExport} variant="outlined">
            Export
          </Button>
          <Button startIcon={<Publish />} onClick={() => setImportDialogOpen(true)} variant="outlined">
            Import
          </Button>
          <Button startIcon={<RestartAlt />} onClick={handleReset} variant="outlined" color="warning">
            Reset
          </Button>
        </Stack>
      </Box>

      {previewMode && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPreviewMode(false)}>
          Preview mode is active. You can see how your changes will look.
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab icon={<Palette />} label="Themes" />
            <Tab icon={<TextFields />} label="Typography" />
            <Tab icon={<ViewQuilt />} label="Navbar" />
            <Tab icon={<Animation />} label="Animations" />
            <Tab icon={<AutoAwesome />} label="Effects" />
            <Tab icon={<PlayArrow />} label="Auto-Scroll" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Themes Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>Theme Presets</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                <Grid item xs={6} sm={4} md={3} key={key}>
                  <Paper
                    onClick={() => applyThemePreset(key)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: theme === key ? 2 : 1,
                      borderColor: theme === key ? 'primary.main' : 'divider',
                      background: preset.background || 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <Typography variant="subtitle2" align="center" sx={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {preset.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'center' }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: preset.primary }} />
                      <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: preset.secondary }} />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Typography Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Font Family</InputLabel>
                  <Select
                    value={fontFamily}
                    label="Font Family"
                    onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  >
                    {Object.entries(FONT_FAMILIES).map(([key, value]) => (
                      <MenuItem key={key} value={key} style={{ fontFamily: value }}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Font Size: {fontSize}px</Typography>
                <Slider
                  value={fontSize}
                  onChange={(e, value) => updateSetting('fontSize', value)}
                  min={10}
                  max={24}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Font Weight: {fontWeight}</Typography>
                <Slider
                  value={fontWeight}
                  onChange={(e, value) => updateSetting('fontWeight', value)}
                  min={100}
                  max={900}
                  step={100}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Font Style</InputLabel>
                  <Select
                    value={fontStyle}
                    label="Font Style"
                    onChange={(e) => updateSetting('fontStyle', e.target.value)}
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="italic">Italic</MenuItem>
                    <MenuItem value="oblique">Oblique</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Line Height: {lineHeight}</Typography>
                <Slider
                  value={lineHeight}
                  onChange={(e, value) => updateSetting('lineHeight', value)}
                  min={1}
                  max={2.5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Letter Spacing</InputLabel>
                  <Select
                    value={letterSpacing}
                    label="Letter Spacing"
                    onChange={(e) => updateSetting('letterSpacing', e.target.value)}
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="0.05em">Slightly Wide</MenuItem>
                    <MenuItem value="0.1em">Wide</MenuItem>
                    <MenuItem value="-0.05em">Tight</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography
                    sx={{
                      fontFamily: FONT_FAMILIES[fontFamily],
                      fontSize: `${fontSize}px`,
                      fontWeight,
                      fontStyle,
                      lineHeight,
                      letterSpacing
                    }}
                  >
                    Preview: The quick brown fox jumps over the lazy dog. 1234567890
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Navbar Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Icon Style</InputLabel>
                  <Select
                    value={navbarIconStyle}
                    label="Icon Style"
                    onChange={(e) => updateSetting('navbarIconStyle', e.target.value)}
                  >
                    {Object.entries(NAVBAR_ICON_STYLES).map(([key, value]) => (
                      <MenuItem key={key} value={value}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Navbar Position</InputLabel>
                  <Select
                    value={navbarPosition}
                    label="Navbar Position"
                    onChange={(e) => updateSetting('navbarPosition', e.target.value)}
                  >
                    <MenuItem value="top">Top</MenuItem>
                    <MenuItem value="side">Side</MenuItem>
                    <MenuItem value="floating">Floating</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Icon Size: {navbarIconSize}px</Typography>
                <Slider
                  value={navbarIconSize}
                  onChange={(e, value) => updateSetting('navbarIconSize', value)}
                  min={16}
                  max={40}
                  step={2}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Animations Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Background Animation</InputLabel>
                  <Select
                    value={backgroundAnimation}
                    label="Background Animation"
                    onChange={(e) => updateSetting('backgroundAnimation', e.target.value)}
                  >
                    {Object.entries(BACKGROUND_ANIMATIONS).map(([key, value]) => (
                      <MenuItem key={key} value={value}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={pageTransitions}
                      onChange={(e) => updateSetting('pageTransitions', e.target.checked)}
                    />
                  }
                  label="Page Transitions"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hoverEffects}
                      onChange={(e) => updateSetting('hoverEffects', e.target.checked)}
                    />
                  }
                  label="Hover Effects"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={scrollAnimations}
                      onChange={(e) => updateSetting('scrollAnimations', e.target.checked)}
                    />
                  }
                  label="Scroll Animations"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Effects Tab */}
          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Card Shadow: {cardShadow}</Typography>
                <Slider
                  value={cardShadow}
                  onChange={(e, value) => updateSetting('cardShadow', value)}
                  min={0}
                  max={24}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Border Radius: {borderRadius}px</Typography>
                <Slider
                  value={borderRadius}
                  onChange={(e, value) => updateSetting('borderRadius', value)}
                  min={0}
                  max={24}
                  step={2}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={glassEffect}
                      onChange={(e) => updateSetting('glassEffect', e.target.checked)}
                    />
                  }
                  label="Glass Effect (Glassmorphism)"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Auto-Scroll Tab */}
          <TabPanel value={tabValue} index={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoScroll}
                      onChange={toggleAutoScroll}
                      color="primary"
                    />
                  }
                  label="Enable Auto-Scroll"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Automatically scroll through your feed at a comfortable pace
                </Typography>
              </Grid>

              {autoScroll && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>Scroll Speed: {scrollSpeed}x</Typography>
                    <Slider
                      value={scrollSpeed}
                      onChange={(e, value) => updateSetting('scrollSpeed', value)}
                      min={0.5}
                      max={3}
                      step={0.5}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={pauseOnHover}
                          onChange={(e) => updateSetting('pauseOnHover', e.target.checked)}
                        />
                      }
                      label="Pause on Hover"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Appearance Settings</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste your exported settings JSON here..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained">Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppearanceSettings;
