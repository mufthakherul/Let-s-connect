import React from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';

const FloatingParticles = () => {
    // Reduced count for better performance and subtlety
    const particles = Array.from({ length: 15 }, (_, i) => i);

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
                        width: Math.random() * 4 + 1, // Smaller particles
                        height: Math.random() * 4 + 1,
                        backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.15 + 0.05})`,
                        borderRadius: '50%',
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        boxShadow: '0 0 10px rgba(255,255,255,0.2)',
                    }}
                    animate={{
                        x: [0, Math.random() * 100 - 50, 0],
                        y: [0, Math.random() * 100 - 50, 0],
                        opacity: [0.1, 0.4, 0.1],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: Math.random() * 15 + 15,
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
                overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)'
            }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    top: '-25%',
                    left: '-25%',
                    width: '150%',
                    height: '150%',
                    background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: '-25%',
                    right: '-25%',
                    width: '150%',
                    height: '150%',
                    background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.05) 0%, transparent 50%)',
                }}
                animate={{
                    x: [0, -50, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </Box>
    );
};

const Nebula = () => {
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
                background: '#020617',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")',
                    opacity: 0.15,
                }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '60vw',
                    height: '60vw',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                    x: [0, 30, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '10%',
                    width: '70vw',
                    height: '70vw',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.6, 0.4, 0.6],
                    x: [0, -40, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
        </Box>
    );
};

const BackgroundAnimation = ({ variant = 'auto', isLoggedIn, reducedMotion }) => {
    if (reducedMotion || variant === 'none') return null;

    switch (variant) {
        case 'nebula':
        case 'landing':
            return <Nebula />;
        case 'loggedIn':
            return <FloatingParticles />;
        case 'gradient':
            return <GradientWaves />;
        case 'subtle':
            return (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0, left: 0, width: '100%', height: '100%', zIndex: -1,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.02), transparent)'
                    }}
                />
            );
        case 'auto':
        default:
            return isLoggedIn ? <FloatingParticles /> : <Nebula />;
    }
};

export default BackgroundAnimation;