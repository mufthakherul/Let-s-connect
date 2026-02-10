import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  BrightnessAuto,
  Palette,
} from '@mui/icons-material';
import { useThemeStore } from '../store/themeStore';

const PRESET_COLORS = {
  light: [
    { name: 'Blue', primary: '#1976d2', secondary: '#dc004e' },
    { name: 'Green', primary: '#388e3c', secondary: '#f57c00' },
    { name: 'Purple', primary: '#7b1fa2', secondary: '#e91e63' },
    { name: 'Teal', primary: '#00796b', secondary: '#ff5722' },
    { name: 'Indigo', primary: '#303f9f', secondary: '#ff6f00' },
    { name: 'Orange', primary: '#e64a19', secondary: '#1976d2' },
  ],
  dark: [
    { name: 'Blue', primary: '#90caf9', secondary: '#f48fb1' },
    { name: 'Green', primary: '#81c784', secondary: '#ffb74d' },
    { name: 'Purple', primary: '#ce93d8', secondary: '#f48fb1' },
    { name: 'Teal', primary: '#4db6ac', secondary: '#ff8a65' },
    { name: 'Indigo', primary: '#9fa8da', secondary: '#ffb74d' },
    { name: 'Orange', primary: '#ff8a65', secondary: '#90caf9' },
  ],
};

const ThemeSettings = () => {
  const theme = useTheme();
  const { 
    mode, 
    setMode, 
    useSystemTheme, 
    setUseSystemTheme,
    accentColor,
    setAccentColor,
  } = useThemeStore();

  const handleSystemThemeToggle = (event) => {
    setUseSystemTheme(event.target.checked);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleAccentColorChange = (color) => {
    setAccentColor(color);
  };

  const handleResetColors = () => {
    setAccentColor(null);
  };

  const currentPresets = PRESET_COLORS[mode];

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Theme Settings
      </Typography>

      {/* Theme Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Palette sx={{ mr: 1 }} />
            <Typography variant="h6">Theme Mode</Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={useSystemTheme}
                onChange={handleSystemThemeToggle}
                icon={<Brightness4 />}
                checkedIcon={<BrightnessAuto />}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Use System Theme</Typography>
                <Typography variant="body2" color="text.secondary">
                  Automatically match your device's theme settings
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manual Theme Selection
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant={mode === 'light' && !useSystemTheme ? 'contained' : 'outlined'}
                startIcon={<Brightness7 />}
                onClick={() => handleModeChange('light')}
                disabled={useSystemTheme}
              >
                Light Mode
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant={mode === 'dark' && !useSystemTheme ? 'contained' : 'outlined'}
                startIcon={<Brightness4 />}
                onClick={() => handleModeChange('dark')}
                disabled={useSystemTheme}
              >
                Dark Mode
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Accent Color Selection */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Palette sx={{ mr: 1 }} />
            <Typography variant="h6">Accent Colors</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a color scheme for buttons, links, and highlights
          </Typography>

          <Grid container spacing={2}>
            {currentPresets.map((preset) => {
              const isSelected = accentColor?.primary === preset.primary;
              return (
                <Grid item xs={6} sm={4} key={preset.name}>
                  <Button
                    fullWidth
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => handleAccentColorChange(preset)}
                    sx={{
                      height: 80,
                      flexDirection: 'column',
                      gap: 1,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        backgroundColor: preset.primary,
                        opacity: 0.8,
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        backgroundColor: preset.secondary,
                        opacity: 0.8,
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        fontWeight: 600,
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {preset.name}
                    </Typography>
                    {isSelected && (
                      <Chip
                        label="Active"
                        size="small"
                        color="primary"
                        sx={{ position: 'relative', zIndex: 1 }}
                      />
                    )}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          {accentColor && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleResetColors}
                color="inherit"
              >
                Reset to Default Colors
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Theme Preview
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button variant="contained" color="primary">
              Primary Button
            </Button>
            <Button variant="contained" color="secondary">
              Secondary Button
            </Button>
            <Button variant="outlined" color="primary">
              Outlined Button
            </Button>
            <Chip label="Sample Chip" color="primary" />
            <Chip label="Sample Chip" color="secondary" />
          </Box>
        </CardContent>
      </Card>

      {/* Information */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          💡 Tip: Theme preferences are saved to your browser and will persist across sessions.
        </Typography>
      </Box>
    </Box>
  );
};

export default ThemeSettings;
