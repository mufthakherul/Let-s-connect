/**
 * Image Optimization Integration for Media Service
 * Phase 4: Scale & Performance (v2.5)
 * 
 * This file integrates image optimization into media-service
 * Works with multer memory storage for buffer-based uploads
 */

const { ImageOptimizer, ImageUtils } = require('../shared/imageOptimization');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Initialize image optimizer
const imageOptimizer = new ImageOptimizer();

/**
 * Process single image upload with optimization
 * Works with buffer-based uploads (multer.memoryStorage)
 */
async function processSingleImage(file, options = {}) {
    try {
        const {
            generateSizes = true,
            format = 'webp',
            quality = 85
        } = options;

        // Create temp directory for processing
        const tempDir = path.join(os.tmpdir(), 'image-optimization', Date.now().toString());
        await fs.mkdir(tempDir, { recursive: true });

        // Write buffer to temp file
        const tempInputPath = path.join(tempDir, file.originalname);
        await fs.writeFile(tempInputPath, file.buffer);

        const results = {
            original: file,
            optimized: null,
            sizes: {},
            metadata: null,
            dominantColor: null,
            blurPlaceholder: null
        };

        // Generate responsive sizes
        if (generateSizes) {
            const sizes = await imageOptimizer.generateResponsiveSizes(tempInputPath, tempDir);
            results.sizes = sizes;
        } else {
            // Just optimize the original
            const outputPath = path.join(tempDir, `optimized-${file.originalname}`);
            await imageOptimizer.optimizeImage(tempInputPath, outputPath, {
                format,
                quality
            });
            results.optimized = outputPath;
        }

        // Get image metadata
        results.metadata = await ImageUtils.getDimensions(tempInputPath);

        // Generate blur placeholder for lazy loading
        const blurPath = path.join(tempDir, `blur-${file.originalname}.webp`);
        await ImageUtils.generateBlurPlaceholder(tempInputPath, blurPath);
        results.blurPlaceholder = blurPath;

        // Get dominant color for placeholder background
        results.dominantColor = await ImageUtils.getDominantColor(tempInputPath);

        // Clean up temp input file
        await fs.unlink(tempInputPath);

        return results;
    } catch (error) {
        console.error('[ImageOptimization] Error processing image:', error);
        throw error;
    }
}

/**
 * Process multiple image uploads
 */
async function processMultipleImages(files, options = {}) {
    const results = [];
    for (const file of files) {
        try {
            const processed = await processSingleImage(file, options);
            results.push(processed);
        } catch (error) {
            console.error(`[ImageOptimization] Error processing ${file.originalname}:`, error);
            results.push({ error: error.message, file: file.originalname });
        }
    }
    return results;
}

module.exports = {
    processSingleImage,
    processMultipleImages
};
