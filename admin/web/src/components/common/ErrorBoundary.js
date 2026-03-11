import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Container,
} from '@mui/material';
import { Error as ErrorIcon, Refresh, Home } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service if available
    if (window.errorLogger) {
      window.errorLogger.log(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallback, level = 'page' } = this.props;

      // Custom fallback UI
      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      if (level === 'component') {
        return (
          <Card sx={{ m: 2, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'error.main' }}>
                <ErrorIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Component Error</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Something went wrong with this component. You can try reloading it or continue using other parts of the page.
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    mb: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  <Typography variant="caption" color="error">
                    {this.state.error.toString()}
                  </Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={this.handleReset}
                size="small"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        );
      }

      // Page-level error
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '60vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <Card sx={{ width: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <ErrorIcon
                  sx={{
                    fontSize: 80,
                    color: 'error.main',
                    mb: 3,
                  }}
                />
                <Typography variant="h4" gutterBottom>
                  Oops! Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  We're sorry for the inconvenience. An unexpected error has occurred.
                  Please try reloading the page or return to the home page.
                </Typography>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      mb: 3,
                      textAlign: 'left',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleReload}
                  >
                    Reload Page
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Home />}
                    onClick={this.handleGoHome}
                  >
                    Go to Home
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};

export default ErrorBoundary;
