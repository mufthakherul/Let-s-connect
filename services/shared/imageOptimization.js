/**
 * Image Optimization Middleware for Let's Connect Platform
 * Phase 4: Scale & Performance (v2.5)
 * 
 * Automatically optimizes, resizes, and converts images for better performance
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image optimization configuration
 */
const OPTIMIZATION_PRESETS = {
    thumbnail: {
        width: 150,
        height: 150,
        quality: 80,
        format: 'webp'
    },
    small: {
        width: 400,
        height: 400,
        quality: 85,
        format: 'webp'
    },
    medium: {
        width: 800,
        height: 800,
        quality: 85,
        format: 'webp'
    },
    large: {
        width: 1920,
        height: 1920,
        quality: 90,
        format: 'webp'
    }
};

class ImageOptimizer {
    constructor(config = {}) {
        this.maxWidth = config.maxWidth || 1920;
        this.maxHeight = config.maxHeight || 1920;
        this.quality = config.quality || 85;
        this.format = config.format || 'webp';
        this.generateThumbnails = config.generateThumbnails !== false;
    }

    /**
     * Check if file is an image
     */
    isImage(mimeType) {
        return mimeType && mimeType.startsWith('image/');
    }

    /**
     * Optimize single image
     */
    async optimizeImage(inputPath, outputPath, options = {}) {
        const {
            width = this.maxWidth,
            height = this.maxHeight,
            quality = this.quality,
            format = this.format,
            fit = 'inside'
        } = options;

        try {
            const image = sharp(inputPath);
            const metadata = await image.metadata();

            // Skip optimization if image is already small enough
            if (metadata.width <= width && metadata.height <= height && metadata.format === format) {
                console.log(`✅ Image already optimized: ${inputPath}`);
                return { optimized: false, originalSize: metadata.size };
            }

            // Apply optimization
            let pipeline = image.resize(width, height, { fit, withoutEnlargement: true });

            // Convert to optimal format
            switch (format) {
                case 'webp':
                    pipeline = pipeline.webp({ quality });
                    break;
                case 'jpeg':
                case 'jpg':
                    pipeline = pipeline.jpeg({ quality, progressive: true });
                    break;
                case 'png':
                    pipeline = pipeline.png({ quality, progressive: true, compressionLevel: 9 });
                    break;
                default:
                    break;
            }

            // Save optimized image
            await pipeline.toFile(outputPath);

            const stats = await fs.stat(outputPath);
            const compressionRatio = ((1 - stats.size / metadata.size) * 100).toFixed(2);

            console.log(`✅ Image optimized: ${path.basename(inputPath)}`);
            console.log(`   Original: ${(metadata.size / 1024).toFixed(2)} KB`);
            console.log(`   Optimized: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`   Compression: ${compressionRatio}%`);

            return {
                optimized: true,
                originalSize: metadata.size,
                optimizedSize: stats.size,
                compressionRatio: parseFloat(compressionRatio)
            };
        } catch (error) {
            console.error(`❌ Image optimization failed for ${inputPath}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate multiple sizes for responsive images
     */
    async generateResponsiveSizes(inputPath, outputDir) {
        const results = {};
        const basename = path.basename(inputPath, path.extname(inputPath));

        for (const [sizeName, preset] of Object.entries(OPTIMIZATION_PRESETS)) {
            const outputPath = path.join(outputDir, `${basename}_${sizeName}.${preset.format}`);

            try {
                results[sizeName] = await this.optimizeImage(inputPath, outputPath, preset);
                results[sizeName].path = outputPath;
            } catch (error) {
                console.error(`Failed to generate ${sizeName} size:`, error.message);
                results[sizeName] = { error: error.message };
            }
        }

        return results;
    }

    /**
     * Express middleware for image upload optimization
     */
    middleware(options = {}) {
        return async (req, res, next) => {
            // Check if request has files
            if (!req.files || Object.keys(req.files).length === 0) {
                return next();
            }

            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            const optimizedFiles = [];

            for (const file of files) {
                // Skip non-images
                if (!this.isImage(file.mimetype)) {
                    optimizedFiles.push(file);
                    continue;
                }

                try {
                    const originalPath = file.path || file.tempFilePath;
                    const optimizedPath = originalPath.replace(
                        path.extname(originalPath),
                        `_optimized.${this.format}`
                    );

                    // Optimize image
                    const result = await this.optimizeImage(originalPath, optimizedPath, options);

                    // Generate responsive sizes if enabled
                    if (this.generateThumbnails && options.generateSizes) {
                        const outputDir = path.dirname(optimizedPath);
                        result.responsiveSizes = await this.generateResponsiveSizes(originalPath, outputDir);
                    }

                    // Update file info
                    file.optimizedPath = optimizedPath;
                    file.optimizationResult = result;
                    file.originalSize = result.originalSize;
                    file.optimizedSize = result.optimizedSize;

                    optimizedFiles.push(file);
                } catch (error) {
                    console.error('Image optimization middleware error:', error);
                    // Continue with original file if optimization fails
                    optimizedFiles.push(file);
                }
            }

            req.optimizedFiles = optimizedFiles;
            next();
        };
    }

    /**
     * Cleanup temporary files
     */
    async cleanup(files) {
        for (const file of files) {
            try {
                if (file.path) await fs.unlink(file.path);
                if (file.optimizedPath) await fs.unlink(file.optimizedPath);
            } catch (error) {
                console.error('Cleanup error:', error.message);
            }
        }
    }
}

/**
 * Utility functions for image processing
 */
class ImageUtils {
    /**
     * Get image dimensions without loading full image
     */
    static async getDimensions(imagePath) {
        const metadata = await sharp(imagePath).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: metadata.size
        };
    }

    /**
     * Convert image to specific format
     */
    static async convertFormat(inputPath, outputPath, format, quality = 85) {
        let pipeline = sharp(inputPath);

        switch (format.toLowerCase()) {
            case 'webp':
                pipeline = pipeline.webp({ quality });
                break;
            case 'jpeg':
            case 'jpg':
                pipeline = pipeline.jpeg({ quality, progressive: true });
                break;
            case 'png':
                pipeline = pipeline.png({ quality, progressive: true });
                break;
            case 'avif':
                pipeline = pipeline.avif({ quality });
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        await pipeline.toFile(outputPath);
        return outputPath;
    }

    /**
     * Generate blur placeholder for lazy loading
     */
    static async generateBlurPlaceholder(inputPath, outputPath) {
        await sharp(inputPath)
            .resize(20, 20, { fit: 'inside' })
            .blur(2)
            .webp({ quality: 20 })
            .toFile(outputPath);

        return outputPath;
    }

    /**
     * Extract dominant color from image
     */
    static async getDominantColor(imagePath) {
        const { dominant } = await sharp(imagePath)
            .resize(1, 1, { fit: 'cover' })
            .raw()
            .toBuffer({ resolveWithObject: true });

        return {
            r: dominant.data[0],
            g: dominant.data[1],
            b: dominant.data[2]
        };
    }
}

module.exports = {
    ImageOptimizer,
    ImageUtils,
    OPTIMIZATION_PRESETS
};
