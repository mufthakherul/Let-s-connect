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
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                    opacity: 0.1,
                }}
                animate={{
                    background: [
                        'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                        'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
                        'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                        'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                    ],
                }}
                transition={{
                    duration: 15,
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
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </Box>
    );
};

const BackgroundAnimation = ({ isLoggedIn, reducedMotion }) => {
    // Disable animations when reduced motion is enabled for accessibility
    if (reducedMotion) {
        return null;
    }
    return isLoggedIn ? <FloatingParticles /> : <GradientWaves />;
};

export default BackgroundAnimation;