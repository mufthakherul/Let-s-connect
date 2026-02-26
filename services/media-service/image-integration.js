const { ImageOptimizer, ImageUtils } = require('../shared/imageOptimization');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const uuid = require('uuid').v4;

const imageOptimizer = new ImageOptimizer({
    generateThumbnails: true,
    format: 'webp',
    quality: 85
});

/**
 * Process single image with professional multi-size generation
 * @param {Object} file Multer file object (buffer)
 */
async function processSingleImage(file) {
    const tempDir = path.join(os.tmpdir(), 'lets-connect-opt', uuid());
    await fs.mkdir(tempDir, { recursive: true });

    try {
        const tempInputPath = path.join(tempDir, `input_${file.originalname}`);
        await fs.writeFile(tempInputPath, file.buffer);

        // 1. Generate core metadata and dominant color
        const metadata = await ImageUtils.getDimensions(tempInputPath);
        const dominantColor = await ImageUtils.getDominantColor(tempInputPath);

        // 2. Generate Blur Placeholder (Base64)
        const blurPath = path.join(tempDir, 'blur.webp');
        await ImageUtils.generateBlurPlaceholder(tempInputPath, blurPath);

        // 3. Generate Responsive Sizes (WebP)
        const sizes = await imageOptimizer.generateResponsiveSizes(tempInputPath, tempDir);

        return {
            metadata,
            dominantColor,
            blurPlaceholder: blurPath,
            sizes
        };
    } catch (error) {
        console.error('[ImageIntegration] Processing failed:', error);
        throw error;
    }
}

module.exports = { processSingleImage };
