import React from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';

const FloatingParticles = () => {
    const particles = Array.from({ length: 20 }, (_, i) => i);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1,
                overflow: 'hidden'
            }}
        >
            {particles.map((particle) => (
                <motion.div
                    key={particle}
                    style={{
                        position: 'absolute',
                        width: Math.random() * 6 + 2,
                        height: Math.random() * 6 + 2,
                        backgroundColor: `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, ${Math.random() * 100 + 255}, 0.3)`,
                        borderRadius: '50%',
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        x: [0, Math.random() * 100 - 50, 0],
                        y: [0, Math.random() * 100 - 50, 0],
                        scale: [1, Math.random() * 0.5 + 0.5, 1],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </Box>
    );
};

const GradientWaves = () => {
    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1,
                overflow: 'hidden'
            }}
        >
            {/* Muted, slow-moving gradients so content remains readable */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #1565c0 0%, #283593 100%)',
                    opacity: 0.06,
                }}
                animate={{
                    background: [
                        'linear-gradient(135deg, #1565c0 0%, #283593 100%)',
                        'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                        'linear-gradient(135deg, #546e7a 0%, #263238 100%)',
                        'linear-gradient(135deg, #1565c0 0%, #283593 100%)',
                    ],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)',
                }}
                animate={{
                    scale: [1, 1.08, 1],
                    opacity: [0.06, 0.16, 0.06],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </Box>
    );
};

const BackgroundAnimation = ({ variant = 'auto', isLoggedIn, reducedMotion }) => {
    // Disable animations when reduced motion is enabled for accessibility
    if (reducedMotion || variant === 'none') return null;

    // Allow explicit variant selection. 'auto' falls back to isLoggedIn behavior.
    switch (variant) {
        case 'loggedIn':
            return <FloatingParticles />;
        case 'landing':
        case 'gradient':
            return <GradientWaves />;
        case 'subtle':
            // subtle is a very light gradient (smaller visual footprint)
            return (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: -1,
                        overflow: 'hidden',
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.04), transparent)'
                    }}
                />
            );
        case 'auto':
        default:
            return isLoggedIn ? <FloatingParticles /> : <GradientWaves />;
    }
};

export default BackgroundAnimation;