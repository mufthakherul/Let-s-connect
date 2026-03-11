import toast from 'react-hot-toast';
import { Box, Typography, IconButton } from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';
import React from 'react';

// Custom toast styles
const toastStyles = {
  success: {
    icon: <CheckCircle />,
    iconColor: '#4caf50',
    backgroundColor: '#f1f8f4',
    borderColor: '#4caf50',
  },
  error: {
    icon: <Error />,
    iconColor: '#f44336',
    backgroundColor: '#fef1f0',
    borderColor: '#f44336',
  },
  warning: {
    icon: <Warning />,
    iconColor: '#ff9800',
    backgroundColor: '#fff8f0',
    borderColor: '#ff9800',
  },
  info: {
    icon: <Info />,
    iconColor: '#2196f3',
    backgroundColor: '#f0f7ff',
    borderColor: '#2196f3',
  },
};

// Custom toast component
const CustomToast = ({ type, title, message, onDismiss }) => {
  const style = toastStyles[type] || toastStyles.info;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        backgroundColor: style.backgroundColor,
        borderLeft: `4px solid ${style.borderColor}`,
        borderRadius: 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: 300,
        maxWidth: 500,
      }}
    >
      <Box sx={{ color: style.iconColor, mt: 0.5, flexShrink: 0 }}>
        {style.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onDismiss}
        sx={{ mt: -0.5, mr: -1, flexShrink: 0 }}
      >
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
};

// Toast notification helpers
export const showToast = {
  success: (message, options = {}) => {
    const { title, duration = 4000, ...restOptions } = options;
    return toast.custom(
      (t) => (
        <CustomToast
          type="success"
          title={title}
          message={message}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration, ...restOptions }
    );
  },

  error: (message, options = {}) => {
    const { title, duration = 5000, ...restOptions } = options;
    return toast.custom(
      (t) => (
        <CustomToast
          type="error"
          title={title}
          message={message}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration, ...restOptions }
    );
  },

  warning: (message, options = {}) => {
    const { title, duration = 4000, ...restOptions } = options;
    return toast.custom(
      (t) => (
        <CustomToast
          type="warning"
          title={title}
          message={message}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration, ...restOptions }
    );
  },

  info: (message, options = {}) => {
    const { title, duration = 4000, ...restOptions } = options;
    return toast.custom(
      (t) => (
        <CustomToast
          type="info"
          title={title}
          message={message}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration, ...restOptions }
    );
  },

  // Promise-based toast for async operations
  promise: (promise, messages, options = {}) => {
    const { loading = 'Loading...', success = 'Success!', error = 'Error occurred' } = messages;
    return toast.promise(
      promise,
      {
        loading,
        success: (data) => {
          const message = typeof success === 'function' ? success(data) : success;
          return (
            <CustomToast
              type="success"
              message={message}
              onDismiss={() => {}}
            />
          );
        },
        error: (err) => {
          const message = typeof error === 'function' ? error(err) : error;
          return (
            <CustomToast
              type="error"
              message={message}
              onDismiss={() => {}}
            />
          );
        },
      },
      options
    );
  },

  // Simple text toast (for backward compatibility)
  simple: (message, type = 'info') => {
    return toast[type](message, {
      duration: 3000,
      style: {
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },

  // Dismiss all toasts
  dismissAll: () => {
    toast.dismiss();
  },

  // Dismiss specific toast
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};

// API error handler
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  const message = error?.response?.data?.error || error?.message || defaultMessage;
  showToast.error(message, {
    title: 'Error',
  });
};

// Success handler for API operations
export const handleApiSuccess = (message, options = {}) => {
  showToast.success(message, {
    title: 'Success',
    ...options,
  });
};

export default showToast;
