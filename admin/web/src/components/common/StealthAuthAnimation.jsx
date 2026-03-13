import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const clampChars = (value, max = 18) => String(value || '').slice(0, max).split('');

const StealthAuthAnimation = ({ identifier, secret, collisionSeed = 0 }) => {
  const letters = useMemo(() => clampChars(identifier), [identifier]);
  const bubbles = useMemo(() => clampChars(secret), [secret]);
  const collisions = useMemo(() => {
    const count = Math.min(letters.length, bubbles.length, 6);
    return Array.from({ length: count }).map((_, idx) => ({
      id: `${collisionSeed}-${idx}`,
      left: 20 + idx * 12 + ((collisionSeed + idx) % 7),
    }));
  }, [letters.length, bubbles.length, collisionSeed]);

  return (
    <Box sx={{ position: 'relative', height: 220, overflow: 'hidden', pointerEvents: 'none' }}>
      <AnimatePresence>
        {letters.map((char, i) => (
          <motion.span
            key={`l-${i}-${char}`}
            initial={{ y: -18, opacity: 0.85 }}
            animate={{ y: 220, opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3 + (i % 5) * 0.18, ease: 'linear' }}
            style={{
              position: 'absolute',
              left: `${6 + i * 5}%`,
              color: '#9fb3ff',
              fontSize: 14,
              fontFamily: 'monospace',
            }}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {bubbles.map((char, i) => (
          <motion.span
            key={`b-${i}-${char}`}
            initial={{ y: 215, opacity: 0.65, scale: 0.8 }}
            animate={{ y: 0, opacity: 0.35, scale: 1.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 + (i % 4) * 0.16, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${8 + i * 5}%`,
              color: '#8de7ff',
              border: '1px solid rgba(141, 231, 255, 0.35)',
              borderRadius: 999,
              width: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'monospace',
            }}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {collisions.map((c) => (
          <motion.span
            key={c.id}
            initial={{ y: 108, opacity: 0.55, scale: 0.8 }}
            animate={{ y: 92, opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${c.left}%`,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'rgba(173, 216, 255, 0.7)',
              boxShadow: '0 0 8px rgba(173, 216, 255, 0.55)',
            }}
          />
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default StealthAuthAnimation;
