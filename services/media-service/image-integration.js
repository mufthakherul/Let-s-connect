/**
 * Image Optimization Integration for Media Service
 * Phase 4: Scale & Performance (v2.5)
 * 
 * This file shows how to integrate image optimization middleware into media-service
 * Wire this into server.js to enable automatic image processing on uploads
 */

const { ImageOptimizer, ImageUtils } = require('../shared/imageOptimization');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Initialize image optimizer
const imageOptimizer = new ImageOptimizer();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', 'temp');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF are allowed.'));
        }
    }
});

/**
 * Middleware configuration for optimizing uploaded images
 * Automatically generates responsive sizes (thumbnail, small, medium, large)
 */
const optimizeUploadedImage = imageOptimizer.middleware({
    generateSizes: true,
    outputDir: path.join(__dirname, 'uploads', 'optimized'),
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'webp'
});

/**
 * Process single image upload with optimization
 * Generates multiple sizes and optimized formats
 */
async function processSingleImage(file, options = {}) {
    try {
        const {
            generateSizes = true,
            format = 'webp',
            quality = 85
        } = options;

        const outputDir = path.join(__dirname, 'uploads', 'optimized');
        await fs.mkdir(outputDir, { recursive: true });

        const results = {
            original: file,
            optimized: null,
            sizes: {},
            metadata: null,
            dominantColor: null
        };

        // Generate responsive sizes
        if (generateSizes) {
            const sizes = await imageOptimizer.generateResponsiveSizes(file.path, outputDir);
            results.sizes = sizes;
        } else {
            // Just optimize the original
            const outputPath = path.join(outputDir, `optimized-${file.filename}`);
            await imageOptimizer.optimizeImage(file.path, outputPath, {
                format,
                quality
            });
            results.optimized = outputPath;
        }

        // Get image metadata
        results.metadata = await ImageUtils.getDimensions(file.path);

        // Generate blur placeholder for lazy loading
        const blurPath = path.join(outputDir, `blur-${file.filename}`);
        await ImageUtils.generateBlurPlaceholder(file.path, blurPath);
        results.blurPlaceholder = blurPath;

        // Get dominant color for placeholder background
        results.dominantColor = await ImageUtils.getDominantColor(file.path);

        // Clean up temp file
        await fs.unlink(file.path);

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
            console.error(`[ImageOptimization] Error processing ${file.filename}:`, error);
            results.push({ error: error.message, file: file.filename });
        }
    }
    return results;
}

/**
 * HOW TO INTEGRATE INTO server.js:
 * 
 * 1. Add to package.json:
 *    npm install sharp multer
 * 
 * 2. Import at top of server.js:
 *    const { 
 *      upload, 
 *      optimizeUploadedImage, 
 *      processSingleImage,
 *      processMultipleImages 
 *    } = require('./image-integration');
 * 
 * 3. Add to POST upload route:
 *    app.post('/files/upload', 
 *      upload.single('file'), 
 *      optimizeUploadedImage, 
 *      async (req, res) => { ... }
 *    );
 * 
 * 4. Access optimized files in route handler:
 *    req.optimizedFiles will contain:
 *    - original: original file info
 *    - optimized: path to optimized image
 *    - sizes: { thumbnail, small, medium, large } paths
 *    - metadata: { width, height, format, size }
 *    - blurPlaceholder: path to 20x20 blurred preview
 *    - dominantColor: RGB array [r, g, b]
 * 
 * EXAMPLE WIRED ROUTE:
 * 
 * // Single file upload with automatic optimization
 * app.post('/files/upload', 
 *   authMiddleware,
 *   upload.single('file'), 
 *   optimizeUploadedImage, 
 *   async (req, res) => {
 *     try {
 *       const { optimizedFiles } = req;
 *       
 *       if (!optimizedFiles || optimizedFiles.length === 0) {
 *         return res.status(400).json({ error: 'No file uploaded' });
 *       }
 *       
 *       const fileData = optimizedFiles[0];
 *       
 *       // Save to database
 *       const file = await File.create({
 *         userId: req.user.id,
 *         originalName: fileData.original.originalname,
 *         filename: fileData.original.filename,
 *         mimeType: fileData.original.mimetype,
 *         size: fileData.original.size,
 *         optimizedPath: fileData.sizes?.large || fileData.optimized,
 *         thumbnailPath: fileData.sizes?.thumbnail,
 *         blurPlaceholder: fileData.blurPlaceholder,
 *         dominantColor: fileData.dominantColor,
 *         metadata: fileData.metadata,
 *         sizes: fileData.sizes
 *       });
 *       
 *       res.json({
 *         message: 'File uploaded and optimized successfully',
 *         file: {
 *           id: file.id,
 *           url: `/files/${file.id}`,
 *           thumbnail: `/files/${file.id}/thumbnail`,
 *           sizes: Object.keys(fileData.sizes || {})
 *         }
 *       });
 *     } catch (error) {
 *       console.error('Error uploading file:', error);
 *       res.status(500).json({ error: 'Internal server error' });
 *     }
 *   }
 * );
 * 
 * // Multiple file upload
 * app.post('/files/upload-multiple',
 *   authMiddleware,
 *   upload.array('files', 10),
 *   optimizeUploadedImage,
 *   async (req, res) => {
 *     try {
 *       const { optimizedFiles } = req;
 *       
 *       const savedFiles = await Promise.all(
 *         optimizedFiles.map(async (fileData) => {
 *           return await File.create({
 *             userId: req.user.id,
 *             originalName: fileData.original.originalname,
 *             filename: fileData.original.filename,
 *             mimeType: fileData.original.mimetype,
 *             size: fileData.original.size,
 *             optimizedPath: fileData.sizes?.large || fileData.optimized,
 *             thumbnailPath: fileData.sizes?.thumbnail,
 *             blurPlaceholder: fileData.blurPlaceholder,
 *             dominantColor: fileData.dominantColor,
 *             metadata: fileData.metadata,
 *             sizes: fileData.sizes
 *           });
 *         })
 *       );
 *       
 *       res.json({
 *         message: `${savedFiles.length} files uploaded and optimized successfully`,
 *         files: savedFiles.map(f => ({
 *           id: f.id,
 *           url: `/files/${f.id}`,
 *           thumbnail: `/files/${f.id}/thumbnail`
 *         }))
 *       });
 *     } catch (error) {
 *       console.error('Error uploading files:', error);
 *       res.status(500).json({ error: 'Internal server error' });
 *     }
 *   }
 * );
 * 
 * // Serve optimized image by size
 * app.get('/files/:id/:size?', authMiddleware, async (req, res) => {
 *   try {
 *     const { id, size } = req.params;
 *     const file = await File.findByPk(id);
 *     
 *     if (!file) {
 *       return res.status(404).json({ error: 'File not found' });
 *     }
 *     
 *     let imagePath;
 *     if (size && file.sizes && file.sizes[size]) {
 *       imagePath = file.sizes[size];
 *     } else {
 *       imagePath = file.optimizedPath;
 *     }
 *     
 *     res.sendFile(imagePath);
 *   } catch (error) {
 *     console.error('Error serving file:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 */

module.exports = {
    upload,
    optimizeUploadedImage,
    processSingleImage,
    processMultipleImages
};
