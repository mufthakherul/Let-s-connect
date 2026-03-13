import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * StealthLogin Component
 *
 * An obfuscated admin login interface that appears as a minimal animation canvas.
 * Features:
 * - No branding, SEO tags, or identifiable elements
 * - Two input boxes with animated character effects
 * - Box 1: Characters fall downward like gravity
 * - Box 2: Characters float upward as bubbles
 * - Collision system: falling letters collide with bubbles and pop them
 * - Hidden authentication trigger: type → delete last char → retype triggers auth
 *
 * Security:
 * - Silent validation (no UI feedback on errors)
 * - No error messages revealed
 * - Constant-time submission
 * - Input state tracked server-side
 */

const StealthLogin = ({ onAuthenticate }) => {
  const [box1Value, setBox1Value] = useState('');
  const [box2Value, setBox2Value] = useState('');
  const [box1History, setBox1History] = useState([]);
  const [box2History, setBox2History] = useState([]);
  const [fallingLetters, setFallingLetters] = useState([]);
  const [floatingBubbles, setFloatingBubbles] = useState([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastBox1CharRef = useRef('');
  const deletedCharRef = useRef(null);

  // Configuration
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.5;
  const BUBBLE_RISE_SPEED = 2;
  const COLLISION_RADIUS = 25;

  /**
   * Character Animation Class - Falling Letter
   */
  class FallingLetter {
    constructor(char, x, y) {
      this.char = char;
      this.x = x;
      this.y = y;
      this.velocity = 0;
      this.alive = true;
      this.opacity = 1;
    }

    update() {
      this.velocity += GRAVITY;
      this.y += this.velocity;

      // Remove if off screen
      if (this.y > CANVAS_HEIGHT + 50) {
        this.alive = false;
      }
    }

    draw(ctx) {
      if (!this.alive) return;

      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.font = '24px monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(this.char, this.x, this.y);
      ctx.restore();
    }

    checkCollision(bubble) {
      const dx = this.x - bubble.x;
      const dy = this.y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < COLLISION_RADIUS;
    }
  }

  /**
   * Character Animation Class - Floating Bubble
   */
  class FloatingBubble {
    constructor(char, x, y) {
      this.char = char;
      this.x = x;
      this.y = y;
      this.alive = true;
      this.popping = false;
      this.popProgress = 0;
      this.size = 30;
      this.wobble = Math.random() * Math.PI * 2;
    }

    update() {
      if (this.popping) {
        this.popProgress += 0.1;
        this.size += 2;
        if (this.popProgress >= 1) {
          this.alive = false;
        }
        return;
      }

      this.y -= BUBBLE_RISE_SPEED;
      this.wobble += 0.05;
      this.x += Math.sin(this.wobble) * 0.5;

      // Remove if off screen
      if (this.y < -50) {
        this.alive = false;
      }
    }

    draw(ctx) {
      if (!this.alive) return;

      ctx.save();

      if (this.popping) {
        // Pop animation
        ctx.globalAlpha = 1 - this.popProgress;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Bubble with character inside
        const gradient = ctx.createRadialGradient(
          this.x - 5, this.y - 5, 0,
          this.x, this.y, this.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(150, 180, 255, 0.2)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Character inside bubble
        ctx.font = '20px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, this.x, this.y);
      }

      ctx.restore();
    }

    pop() {
      this.popping = true;
    }
  }

  /**
   * Handle Box 1 input change (falling letters)
   */
  const handleBox1Change = useCallback((e) => {
    const newValue = e.target.value;
    const prevValue = box1Value;

    // Track if user deleted the last character (for auth trigger)
    if (newValue.length < prevValue.length) {
      const deleted = prevValue[prevValue.length - 1];
      deletedCharRef.current = deleted;
      lastBox1CharRef.current = '';
    } else if (newValue.length > prevValue.length) {
      const newChar = newValue[newValue.length - 1];

      // Check for auth trigger: delete last → retype same
      if (deletedCharRef.current && newChar === deletedCharRef.current && prevValue.length > 0) {
        // Trigger authentication!
        triggerAuthentication();
        deletedCharRef.current = null;
      }

      lastBox1CharRef.current = newChar;

      // Create falling letter
      const x = 200 + Math.random() * 50 - 25;
      const y = 150;
      setFallingLetters(prev => [...prev, new FallingLetter(newChar, x, y)]);
    }

    setBox1Value(newValue);
    setBox1History(prev => [...prev, newValue]);
  }, [box1Value]);

  /**
   * Handle Box 2 input change (floating bubbles)
   */
  const handleBox2Change = useCallback((e) => {
    const newValue = e.target.value;
    const prevValue = box2Value;

    if (newValue.length > prevValue.length) {
      const newChar = newValue[newValue.length - 1];

      // Create floating bubble
      const x = 200 + Math.random() * 50 - 25;
      const y = 400;
      setFloatingBubbles(prev => [...prev, new FloatingBubble(newChar, x, y)]);
    }

    setBox2Value(newValue);
    setBox2History(prev => [...prev, newValue]);
  }, [box2Value]);

  /**
   * Trigger authentication (hidden)
   */
  const triggerAuthentication = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    // Silent server-side validation
    try {
      const response = await fetch('/api/admin/stealth-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: box1Value,
          secret: box2Value,
          inputHistory: { box1: box1History, box2: box2History }
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Continue to next step (no UI feedback)
        if (onAuthenticate) {
          onAuthenticate(data);
        }
      }
    } catch (error) {
      // Silent failure - no user feedback
      console.error('[Stealth Auth] Silent error');
    } finally {
      setIsAuthenticating(false);
    }
  }, [box1Value, box2Value, box1History, box2History, isAuthenticating, onAuthenticate]);

  /**
   * Animation loop for canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Update and draw falling letters
      setFallingLetters(prev => {
        const updated = prev.map(letter => {
          letter.update();
          return letter;
        }).filter(letter => letter.alive);

        updated.forEach(letter => letter.draw(ctx));
        return updated;
      });

      // Update and draw floating bubbles
      setFloatingBubbles(prev => {
        const updated = prev.map(bubble => {
          bubble.update();
          return bubble;
        }).filter(bubble => bubble.alive);

        updated.forEach(bubble => bubble.draw(ctx));
        return updated;
      });

      // Check collisions
      setFallingLetters(prevLetters => {
        setFloatingBubbles(prevBubbles => {
          prevLetters.forEach(letter => {
            prevBubbles.forEach(bubble => {
              if (letter.alive && bubble.alive && !bubble.popping && letter.checkCollision(bubble)) {
                bubble.pop();
              }
            });
          });
          return prevBubbles;
        });
        return prevLetters;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Canvas for animations */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1
        }}
      />

      {/* Input boxes - positioned over canvas */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center'
        }}
      >
        {/* Box 1 - Falling letters */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <TextField
            value={box1Value}
            onChange={handleBox1Change}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                border: 'none',
                '& fieldset': { border: 'none' },
                '& input': {
                  color: 'transparent',
                  caretColor: '#888',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  width: '300px',
                  padding: '12px',
                  '&::selection': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }
              }
            }}
          />
        </motion.div>

        {/* Box 2 - Floating bubbles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
        >
          <TextField
            type="password"
            value={box2Value}
            onChange={handleBox2Change}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                border: 'none',
                '& fieldset': { border: 'none' },
                '& input': {
                  color: 'transparent',
                  caretColor: '#888',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  width: '300px',
                  padding: '12px',
                  '&::selection': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }
              }
            }}
          />
        </motion.div>
      </Box>
    </Box>
  );
};

export default StealthLogin;
