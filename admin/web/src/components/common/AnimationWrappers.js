import React from 'react';
import { motion } from 'framer-motion';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3,
};

// Page transition wrapper component
export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

// Fade in animation
const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const FadeIn = ({ children, delay = 0, duration = 0.3 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
};

// Slide in from direction
export const SlideIn = ({ children, direction = 'up', delay = 0, duration = 0.3 }) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  const slideVariants = {
    hidden: { opacity: 0, ...directions[direction] },
    visible: { opacity: 1, x: 0, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={slideVariants}
      transition={{ duration, delay, type: 'tween', ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

// Scale animation
export const ScaleIn = ({ children, delay = 0, duration = 0.3 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, type: 'tween', ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

// Stagger children animation
export const StaggerContainer = ({ children, staggerDelay = 0.1 }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children }) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return <motion.div variants={itemVariants}>{children}</motion.div>;
};

// Button hover/tap animation
export const AnimatedButton = ({ children, onClick, whileHover, whileTap, ...props }) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={whileHover || { scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={whileTap || { scale: 0.98 }}
      style={{ display: 'inline-block', cursor: 'pointer' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Success checkmark animation
export const SuccessAnimation = () => {
  const checkmarkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: 'spring', duration: 0.6, bounce: 0 },
        opacity: { duration: 0.2 },
      },
    },
  };

  const circleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke="#4caf50"
        strokeWidth="3"
        variants={circleVariants}
      />
      <motion.path
        d="M 20 32 L 28 40 L 44 24"
        fill="none"
        stroke="#4caf50"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkmarkVariants}
      />
    </motion.svg>
  );
};

// Error X animation
export const ErrorAnimation = () => {
  const xVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: 'spring', duration: 0.5, bounce: 0 },
        opacity: { duration: 0.2 },
      },
    },
  };

  const circleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke="#f44336"
        strokeWidth="3"
        variants={circleVariants}
      />
      <motion.path
        d="M 22 22 L 42 42 M 42 22 L 22 42"
        fill="none"
        stroke="#f44336"
        strokeWidth="3"
        strokeLinecap="round"
        variants={xVariants}
      />
    </motion.svg>
  );
};

// Loading spinner
export const LoadingSpinner = ({ size = 40 }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        duration: 1,
        ease: 'linear',
      }}
      style={{
        width: size,
        height: size,
        border: `3px solid rgba(25, 118, 210, 0.2)`,
        borderTop: `3px solid #1976d2`,
        borderRadius: '50%',
      }}
    />
  );
};

// Pulse animation (for notifications, badges)
export const Pulse = ({ children }) => {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
