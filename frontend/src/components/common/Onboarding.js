import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  MobileStepper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext,
  NavigateBefore,
  Home as HomeIcon,
  VideoLibrary,
  ShoppingCart,
  Article,
  Chat as ChatIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const onboardingSteps = [
  {
    title: 'Welcome to Let\'s Connect! 🎉',
    description: 'Let\'s take a quick tour of the platform and help you get started.',
    icon: <HomeIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    action: null,
  },
  {
    title: 'Explore Content',
    description: 'Discover videos, blog articles, and documentation. Browse our shop for products and services.',
    icon: <VideoLibrary sx={{ fontSize: 60, color: 'primary.main' }} />,
    features: ['Videos', 'Blog', 'Documentation', 'Shop'],
    action: { label: 'Explore', path: '/videos' },
  },
  {
    title: 'Connect with Others',
    description: 'Join groups, chat with members, and collaborate on projects. Build your network!',
    icon: <GroupIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    features: ['Groups', 'Chat', 'Video Calls', 'Feed'],
    action: { label: 'View Groups', path: '/groups' },
  },
  {
    title: 'Manage Your Content',
    description: 'Create pages, share posts, bookmark favorites, and organize your work with folders.',
    icon: <Article sx={{ fontSize: 60, color: 'primary.main' }} />,
    features: ['Pages', 'Projects', 'Bookmarks', 'Folders'],
    action: { label: 'My Pages', path: '/pages' },
  },
  {
    title: 'Customize Your Experience',
    description: 'Personalize your theme, set up notifications, and configure your preferences.',
    icon: <SettingsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    features: ['Dark/Light Mode', 'Accent Colors', 'Email Preferences', 'Security'],
    action: { label: 'Theme Settings', path: '/settings/theme' },
  },
  {
    title: 'You\'re All Set! 🚀',
    description: 'Start exploring and connecting. Remember, you can access quick navigation anytime with Cmd/Ctrl+K.',
    icon: <ChatIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    tip: 'Pro Tip: Press Cmd/Ctrl+K for quick navigation!',
    action: { label: 'Get Started', path: '/' },
  },
];

const Onboarding = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    const isFirstVisit = !localStorage.getItem('has_visited');

    if (!hasCompletedOnboarding && isFirstVisit) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.setItem('has_visited', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (activeStep === onboardingSteps.length - 1) {
      handleComplete();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setOpen(false);
    setActiveStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setOpen(false);
    setActiveStep(0);
  };

  const handleActionClick = (action) => {
    if (action && action.path) {
      navigate(action.path);
      handleComplete();
    }
  };

  const currentStep = onboardingSteps[activeStep];

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          minHeight: isMobile ? '100%' : 500,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={handleSkip}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
            zIndex: 1,
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 6, pb: 3, px: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            minHeight: 350,
          }}
        >
          {/* Icon */}
          <Box sx={{ mb: 3 }}>
            {currentStep.icon}
          </Box>

          {/* Title */}
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {currentStep.title}
          </Typography>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
            {currentStep.description}
          </Typography>

          {/* Features list */}
          {currentStep.features && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
                mb: 3,
              }}
            >
              {currentStep.features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    backgroundColor: 'action.hover',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {feature}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Pro tip */}
          {currentStep.tip && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                mb: 3,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                {currentStep.tip}
              </Typography>
            </Box>
          )}

          {/* Action button */}
          {currentStep.action && activeStep !== onboardingSteps.length - 1 && (
            <Button
              variant="outlined"
              onClick={() => handleActionClick(currentStep.action)}
              sx={{ mb: 2 }}
            >
              {currentStep.action.label}
            </Button>
          )}
        </Box>

        {/* Stepper */}
        {!isMobile ? (
          <Stepper activeStep={activeStep} sx={{ pt: 3 }}>
            {onboardingSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel />
              </Step>
            ))}
          </Stepper>
        ) : (
          <MobileStepper
            variant="dots"
            steps={onboardingSteps.length}
            position="static"
            activeStep={activeStep}
            sx={{ backgroundColor: 'transparent', pt: 2 }}
            nextButton={<Box />}
            backButton={<Box />}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button
          onClick={handleSkip}
          color="inherit"
        >
          Skip Tour
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<NavigateBefore />}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={activeStep !== onboardingSteps.length - 1 ? <NavigateNext /> : null}
          >
            {activeStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

// Reset onboarding (for testing or user re-tour)
export const resetOnboarding = () => {
  localStorage.removeItem('onboarding_completed');
  localStorage.removeItem('has_visited');
};

// Trigger onboarding manually
export const showOnboarding = () => {
  const event = new CustomEvent('show-onboarding');
  window.dispatchEvent(event);
};

export default Onboarding;
