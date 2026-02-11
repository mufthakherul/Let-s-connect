import React, { useState, useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const PullToRefresh = ({
  onRefresh,
  children,
  disabled = false,
  pullDownThreshold = 80,
  refreshingDuration = 1500,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;
    
    // Only enable pull-to-refresh when scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      setCanPull(true);
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (!canPull || disabled || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;

    // Only pull down, not up
    if (distance > 0) {
      // Prevent default scroll behavior while pulling
      if (distance > 10) {
        e.preventDefault();
      }
      
      // Apply resistance to pull distance (diminishing returns)
      const resistanceFactor = 0.5;
      const adjustedDistance = Math.min(distance * resistanceFactor, pullDownThreshold * 1.5);
      setPullDistance(adjustedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!canPull || disabled || isRefreshing) {
      setPullDistance(0);
      setCanPull(false);
      return;
    }

    setCanPull(false);

    // Trigger refresh if pulled past threshold
    if (pullDistance >= pullDownThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullDownThreshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Error during refresh:', error);
      }

      // Minimum display time for smooth UX
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, refreshingDuration);
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPullDistance(0);
      setIsRefreshing(false);
      setCanPull(false);
    };
  }, []);

  const pullProgress = Math.min((pullDistance / pullDownThreshold) * 100, 100);
  const iconRotation = (pullProgress / 100) * 360;

  return (
    <Box
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        overflow: 'auto',
        height: '100%',
        width: '100%',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: pullDistance,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pb: 1,
          overflow: 'hidden',
          transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
          zIndex: 1,
        }}
      >
        {pullDistance > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {isRefreshing ? (
              <>
                <CircularProgress size={24} thickness={4} />
                <Typography variant="caption" color="text.secondary">
                  Refreshing...
                </Typography>
              </>
            ) : (
              <>
                <RefreshIcon
                  sx={{
                    transform: `rotate(${iconRotation}deg)`,
                    transition: 'transform 0.1s ease-out',
                    color: pullProgress >= 100 ? 'primary.main' : 'text.secondary',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {pullProgress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PullToRefresh;
