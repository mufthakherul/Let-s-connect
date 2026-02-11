/**
 * Reduced Data Mode Middleware
 * Phase 7 Feature - Mobile performance optimization
 * Provides lightweight API responses for mobile devices on slow connections
 */

/**
 * Reduced data mode middleware
 * Checks for X-Data-Mode header and optimizes response accordingly
 */
function reducedDataMode(req, res, next) {
  const dataMode = req.headers['x-data-mode'] || 'full';
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to apply transformations
  res.json = function(data) {
    if (dataMode === 'reduced' && data) {
      const reducedData = reduceDataSize(data, req.path);
      return originalJson(reducedData);
    }
    return originalJson(data);
  };
  
  next();
}

/**
 * Reduce data size based on content type
 */
function reduceDataSize(data, path) {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => reduceDataSize(item, path));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const reduced = { ...data };
    
    // Remove or truncate fields based on context
    if (path.includes('/posts') || path.includes('/feed')) {
      return reducePostData(reduced);
    }
    
    if (path.includes('/users') || path.includes('/profile')) {
      return reduceUserData(reduced);
    }
    
    if (path.includes('/blogs')) {
      return reduceBlogData(reduced);
    }
    
    if (path.includes('/media')) {
      return reduceMediaData(reduced);
    }
    
    // Default reduction
    return reduceGenericData(reduced);
  }
  
  return data;
}

/**
 * Reduce post data for mobile
 */
function reducePostData(post) {
  const reduced = { ...post };
  
  // Truncate content
  if (reduced.content && reduced.content.length > 200) {
    reduced.content = reduced.content.substring(0, 200) + '...';
    reduced.truncated = true;
  }
  
  // Remove or reduce media URLs
  if (reduced.mediaUrls && reduced.mediaUrls.length > 0) {
    // Keep only first media item
    reduced.mediaUrls = [reduced.mediaUrls[0]];
    if (post.mediaUrls.length > 1) {
      reduced.mediaCount = post.mediaUrls.length;
    }
  }
  
  // Remove heavy metadata
  delete reduced.metadata;
  delete reduced.rawData;
  
  return reduced;
}

/**
 * Reduce user data for mobile
 */
function reduceUserData(user) {
  const reduced = { ...user };
  
  // Remove or reduce avatar to thumbnail
  if (reduced.avatar) {
    // If avatar URL exists, add thumbnail parameter
    reduced.avatar = reduced.avatar.includes('?') 
      ? `${reduced.avatar}&size=small`
      : `${reduced.avatar}?size=small`;
  }
  
  // Truncate bio
  if (reduced.bio && reduced.bio.length > 150) {
    reduced.bio = reduced.bio.substring(0, 150) + '...';
    reduced.bioTruncated = true;
  }
  
  // Remove detailed fields
  delete reduced.skills;
  delete reduced.experiences;
  delete reduced.education;
  delete reduced.certifications;
  delete reduced.projects;
  
  // Keep only essential fields
  if (reduced.skills && Array.isArray(reduced.skills)) {
    reduced.skillCount = reduced.skills.length;
  }
  
  return reduced;
}

/**
 * Reduce blog data for mobile
 */
function reduceBlogData(blog) {
  const reduced = { ...blog };
  
  // Use excerpt instead of full content
  if (reduced.content && !reduced.excerpt) {
    reduced.excerpt = reduced.content.substring(0, 150) + '...';
  }
  
  // Remove full content in list views
  delete reduced.content;
  reduced.contentAvailable = true;
  
  // Reduce featured image to thumbnail
  if (reduced.featuredImage) {
    reduced.featuredImage = reduced.featuredImage.includes('?')
      ? `${reduced.featuredImage}&size=thumb`
      : `${reduced.featuredImage}?size=thumb`;
  }
  
  return reduced;
}

/**
 * Reduce media data for mobile
 */
function reduceMediaData(media) {
  const reduced = { ...media };
  
  // Replace full URLs with thumbnails
  if (reduced.url) {
    reduced.thumbnailUrl = reduced.url.includes('?')
      ? `${reduced.url}&size=thumb`
      : `${reduced.url}?size=thumb`;
    reduced.fullUrl = reduced.url;
    reduced.url = reduced.thumbnailUrl;
  }
  
  // Remove high-res versions
  delete reduced.originalUrl;
  delete reduced.highResUrl;
  
  return reduced;
}

/**
 * Reduce generic data
 */
function reduceGenericData(obj) {
  const reduced = { ...obj };
  
  // Remove common heavy fields
  const heavyFields = ['metadata', 'rawData', 'detailedInfo', 'fullDescription'];
  heavyFields.forEach(field => delete reduced[field]);
  
  // Truncate long string fields
  Object.keys(reduced).forEach(key => {
    if (typeof reduced[key] === 'string' && reduced[key].length > 500) {
      reduced[key] = reduced[key].substring(0, 500) + '...';
      reduced[`${key}Truncated`] = true;
    }
  });
  
  return reduced;
}

/**
 * Middleware to add data mode info to response headers
 */
function addDataModeHeaders(req, res, next) {
  const dataMode = req.headers['x-data-mode'] || 'full';
  
  res.setHeader('X-Data-Mode-Applied', dataMode);
  
  if (dataMode === 'reduced') {
    res.setHeader('X-Data-Optimization', 'enabled');
  }
  
  next();
}

/**
 * Get data mode statistics
 */
function getDataModeStats() {
  return {
    modes: ['full', 'reduced'],
    default: 'full',
    header: 'X-Data-Mode',
    features: {
      reduced: [
        'Truncated text content (200 chars)',
        'Thumbnail images instead of full size',
        'Limited media arrays',
        'Removed metadata fields',
        'Compressed user profiles'
      ]
    }
  };
}

module.exports = {
  reducedDataMode,
  addDataModeHeaders,
  getDataModeStats
};
