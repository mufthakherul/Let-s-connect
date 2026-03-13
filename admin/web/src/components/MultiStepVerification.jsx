import React, { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MultiStepVerification Component
 *
 * Phase 4 Implementation - Multi-step verification flow:
 * Step 1: Username/Email cross-validation
 * Step 2: Email verification code (6-8 digits)
 *
 * Features:
 * - Silent failure on mismatches
 * - No error messages
 * - Clean minimal interface
 */

const MultiStepVerification = ({ initialIdentifier, initialSecret, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [crossField, setCrossField] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState(initialIdentifier);

  /**
   * Step 1: Submit username/email cross-validation
   */
  const handleCrossValidation = useCallback(async () => {
    if (!crossField.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/verify-cross-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary: identifier,
          cross: crossField.trim()
        }),
        credentials: 'include'
      });

      if (response.ok) {
        // Proceed to step 2
        setStep(2);

        // Send verification code
        await sendVerificationCode();
      } else {
        // Silent failure - continue animation
        console.log('[Multi-Step] Cross-validation failed (silent)');
      }
    } catch (error) {
      console.error('[Multi-Step] Silent error');
    } finally {
      setIsLoading(false);
    }
  }, [crossField, identifier]);

  /**
   * Send verification code to email
   */
  const sendVerificationCode = useCallback(async () => {
    try {
      await fetch('/api/admin/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('[Multi-Step] Code send error (silent)');
    }
  }, [identifier]);

  /**
   * Step 2: Submit verification code
   */
  const handleCodeVerification = useCallback(async () => {
    if (!verificationCode.trim() || verificationCode.length < 6) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          code: verificationCode
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Authentication successful
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        // Silent failure
        console.log('[Multi-Step] Code validation failed (silent)');
      }
    } catch (error) {
      console.error('[Multi-Step] Silent error');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, identifier, onSuccess]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        position: 'relative'
      }}
    >
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3
              }}
            >
              <TextField
                value={crossField}
                onChange={(e) => setCrossField(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCrossValidation()}
                autoComplete="off"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    '& fieldset': { border: 'none' },
                    '& input': {
                      color: '#fff',
                      fontSize: '16px',
                      padding: '12px 16px',
                      width: '300px'
                    }
                  }
                }}
              />
              <Button
                onClick={handleCrossValidation}
                disabled={isLoading || !crossField.trim()}
                variant="outlined"
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  minWidth: '120px',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Proceed'}
              </Button>
            </Box>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3
              }}
            >
              <TextField
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyPress={(e) => e.key === 'Enter' && handleCodeVerification()}
                autoComplete="off"
                autoFocus
                placeholder="000000"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    '& fieldset': { border: 'none' },
                    '& input': {
                      color: '#fff',
                      fontSize: '24px',
                      fontFamily: 'monospace',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      padding: '16px',
                      width: '300px'
                    }
                  }
                }}
              />
              <Button
                onClick={handleCodeVerification}
                disabled={isLoading || verificationCode.length < 6}
                variant="outlined"
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  minWidth: '120px',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Verify'}
              </Button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default MultiStepVerification;
