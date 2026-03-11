import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Virtualized list component for rendering large lists efficiently
 * Only renders visible items + buffer
 */
function VirtualizedList({
  items = [],
  itemHeight = 80,
  containerHeight = 600,
  renderItem,
  onLoadMore,
  hasMore = false,
  loading = false,
  overscan = 3, // Number of items to render outside viewport
  keyExtractor = (item, index) => item.id || index,
  className = '',
  emptyMessage = 'No items to display'
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerClientHeight, setContainerClientHeight] = useState(containerHeight);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerClientHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);

    // Trigger load more when near bottom
    if (
      hasMore &&
      !loading &&
      onLoadMore &&
      newScrollTop + containerClientHeight >= totalHeight - itemHeight * 5
    ) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore, containerClientHeight, totalHeight, itemHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      setContainerClientHeight(container.clientHeight);
    }
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <Box
        sx={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary'
        }}
      >
        {emptyMessage}
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <Box
        sx={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const key = keyExtractor(item, actualIndex);

            return (
              <Box
                key={key}
                sx={{
                  height: itemHeight,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, actualIndex)}
              </Box>
            );
          })}
        </Box>
      </Box>

      {loading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: 2
          }}
        >
          <CircularProgress size={30} />
        </Box>
      )}
    </Box>
  );
}

export default React.memo(VirtualizedList);
