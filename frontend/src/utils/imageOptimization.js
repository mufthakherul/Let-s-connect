/**
 * Phase 19: Image optimization utilities for performance.
 * Helpers for WebP/AVIF URL rewriting and responsive srcSet generation.
 */

const SUPPORTED_FORMATS = ['webp', 'avif'];

/**
 * Returns an optimized image URL with optional width and format hints.
 * If the URL is already a CDN URL (milonexa.com/cdn), append query params.
 * Otherwise returns the original URL unchanged (graceful degradation).
 */
export const getOptimizedImageUrl = (url, { width, format = 'webp' } = {}) => {
  if (!url) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    // Only rewrite CDN or relative media URLs
    const isCdn = parsed.hostname.includes('milonexa.com') || parsed.pathname.startsWith('/media');
    if (!isCdn) return url;
    if (width) parsed.searchParams.set('w', width);
    if (SUPPORTED_FORMATS.includes(format)) parsed.searchParams.set('fmt', format);
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * Generates a srcSet string for responsive images.
 * @param {string} url - Base image URL
 * @param {number[]} widths - Array of widths (e.g. [320, 640, 1280])
 * @param {string} format - 'webp' or 'avif'
 * @returns {string} srcSet attribute value
 */
export const buildSrcSet = (url, widths = [320, 640, 960, 1280], format = 'webp') =>
  widths.map((w) => `${getOptimizedImageUrl(url, { width: w, format })} ${w}w`).join(', ');

/**
 * React hook returning optimized src and srcSet for an image element.
 */
export const useOptimizedImage = (url, options = {}) => {
  const src = getOptimizedImageUrl(url, options);
  const srcSet = buildSrcSet(url, options.widths, options.format);
  return { src, srcSet };
};

export default getOptimizedImageUrl;
