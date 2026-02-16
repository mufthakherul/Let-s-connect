import React, { useEffect, useRef, useState } from 'react';
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
                zIndex: -9999,
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
                zIndex: -9999,
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

// CursorTrail: light, accessible cursor-follow effect (respects reduced motion)
const CursorTrail = ({ reducedMotion }) => {
    if (reducedMotion) return null;
    const dots = 4;
    const posRef = useRef({ x: -9999, y: -9999 });
    const [, setTick] = useState(0);

    useEffect(() => {
        const onMove = (e) => {
            posRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', onMove);
        let rafId = 0;
        const loop = () => {
            setTick(t => (t + 1) % 1000000);
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => {
            window.removeEventListener('mousemove', onMove);
            cancelAnimationFrame(rafId);
        };
    }, []);

    const particles = Array.from({ length: dots }).map((_, i) => ({ i }));

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: -9998,
                overflow: 'visible'
            }}
        >
            {particles.map((p, idx) => (
                <motion.div
                    key={idx}
                    animate={{
                        x: posRef.current.x,
                        y: posRef.current.y,
                        opacity: posRef.current.x < 0 ? 0 : 1,
                        scale: 1 - idx * 0.12
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: Math.max(120 - idx * 20, 40),
                        damping: 18 + idx * 6
                    }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: 10 - idx * 2,
                        height: 10 - idx * 2,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.18))',
                        transform: 'translate(-50%,-50%)',
                        mixBlendMode: 'screen',
                        opacity: 0.6 - idx * 0.12,
                        pointerEvents: 'none'
                    }}
                />
            ))}
        </Box>
    );
};

const BackgroundAnimation = ({ variant = 'auto', isLoggedIn, reducedMotion }) => {
    // Disable animations when reduced motion is enabled for accessibility
    if (reducedMotion || variant === 'none') return null;

    // Allow explicit variant selection. 'auto' falls back to isLoggedIn behavior.
    switch (variant) {
        case 'loggedIn':
            return <FloatingParticles sx={{ zIndex: -9999 }} />;
        case 'landing':
        case 'gradient':
            return (
                <>
                    <GradientWaves sx={{ zIndex: -9999 }} />
                    <CursorTrail reducedMotion={reducedMotion} />
                </>
            );
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
                        zIndex: -9999,
                        overflow: 'hidden',
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.04), transparent)'
                    }}
                />
            );
        case 'auto':
        default:
            return isLoggedIn ? <FloatingParticles sx={{ zIndex: -10 }} /> : (
                <>
                    <GradientWaves sx={{ zIndex: -10 }} />
                    <CursorTrail reducedMotion={reducedMotion} />
                </>
            );
    }
};

export default BackgroundAnimation;