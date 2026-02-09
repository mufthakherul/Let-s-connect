/**
 * Lazy Loading Components for Let's Connect Platform
 * Phase 4: Scale & Performance (v2.5)
 * 
 * Provides lazy loading functionality for images and components
 */

import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * LazyImage Component
 * Lazy loads images with intersection observer
 */
export const LazyImage = ({
    src,
    alt,
    placeholder,
    className,
    style,
    onLoad,
    threshold = 0.1,
    rootMargin = '50px'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        if (!imgRef.current) return;

        // Create intersection observer
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold,
                rootMargin
            }
        );

        observer.observe(imgRef.current);

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [threshold, rootMargin]);

    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    return (
        <div
            ref={imgRef}
            className={`lazy-image-container ${className || ''}`}
            style={style}
        >
            {!isLoaded && (
                <div className="lazy-image-placeholder" style={{
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                }}>
                    {placeholder || <CircularProgress size={24} />}
                </div>
            )}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={handleLoad}
                    style={{
                        display: isLoaded ? 'block' : 'none',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                    loading="lazy"
                />
            )}
        </div>
    );
};

/**
 * LazyComponent
 * Lazy loads React components when they come into view
 */
export const LazyComponent = ({
    children,
    fallback,
    threshold = 0.1,
    rootMargin = '50px',
    className,
    style
}) => {
    const [isInView, setIsInView] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold,
                rootMargin
            }
        );

        observer.observe(containerRef.current);

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, [threshold, rootMargin]);

    return (
        <div ref={containerRef} className={className} style={style}>
            {isInView ? children : (fallback || <CircularProgress />)}
        </div>
    );
};

/**
 * InfiniteScroll Component
 * Implements infinite scrolling with automatic loading
 */
export const InfiniteScroll = ({
    children,
    loadMore,
    hasMore,
    loading,
    loader,
    threshold = 0.5,
    className,
    style
}) => {
    const loaderRef = useRef(null);

    useEffect(() => {
        if (!loaderRef.current || !hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold }
        );

        observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [hasMore, loading, loadMore, threshold]);

    return (
        <div className={className} style={style}>
            {children}
            {hasMore && (
                <div ref={loaderRef} style={{ padding: '20px', textAlign: 'center' }}>
                    {loading ? (loader || <CircularProgress />) : null}
                </div>
            )}
        </div>
    );
};

/**
 * LazyVideo Component
 * Lazy loads video elements
 */
export const LazyVideo = ({
    src,
    poster,
    className,
    style,
    controls = true,
    autoPlay = false,
    threshold = 0.1
}) => {
    const [isInView, setIsInView] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold }
        );

        observer.observe(videoRef.current);

        return () => {
            if (videoRef.current) {
                observer.unobserve(videoRef.current);
            }
        };
    }, [threshold]);

    return (
        <div ref={videoRef} className={className} style={style}>
            {isInView ? (
                <video
                    src={src}
                    poster={poster}
                    controls={controls}
                    autoPlay={autoPlay}
                    style={{ width: '100%', height: '100%' }}
                />
            ) : (
                <div style={{
                    background: '#000',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {poster && <img src={poster} alt="Video poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
            )}
        </div>
    );
};

/**
 * Progressive Image Component
 * Loads low-quality placeholder first, then high-quality image
 */
export const ProgressiveImage = ({
    placeholderSrc,
    src,
    alt,
    className,
    style
}) => {
    const [currentSrc, setCurrentSrc] = useState(placeholderSrc);
    const [isBlurred, setIsBlurred] = useState(true);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            setCurrentSrc(src);
            setIsBlurred(false);
        };
    }, [src]);

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            style={{
                ...style,
                filter: isBlurred ? 'blur(10px)' : 'none',
                transition: 'filter 0.3s ease-out'
            }}
        />
    );
};

/**
 * Virtual List Component
 * Renders only visible items in long lists
 */
export const VirtualList = ({
    items,
    itemHeight,
    containerHeight = 600,
    renderItem,
    className,
    style,
    overscan = 3
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef(null);

    const handleScroll = (e) => {
        setScrollTop(e.target.scrollTop);
    };

    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={className}
            style={{
                ...style,
                height: containerHeight,
                overflow: 'auto',
                position: 'relative'
            }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div key={startIndex + index} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * Lazy Load Hook
 * Custom hook for implementing lazy loading
 */
export const useLazyLoad = (options = {}) => {
    const {
        threshold = 0.1,
        rootMargin = '0px'
    } = options;

    const [isInView, setIsInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold,
                rootMargin
            }
        );

        observer.observe(ref.current);

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [threshold, rootMargin]);

    return [ref, isInView];
};

export default {
    LazyImage,
    LazyComponent,
    InfiniteScroll,
    LazyVideo,
    ProgressiveImage,
    VirtualList,
    useLazyLoad
};
