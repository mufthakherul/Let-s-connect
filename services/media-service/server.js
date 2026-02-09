const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(express.json());

// Phase 4: Image optimization integration
let imageOptimizationEnabled = false;
let processSingleImage, processMultipleImages;

try {
  const imageIntegration = require('./image-integration');
  processSingleImage = imageIntegration.processSingleImage;
  processMultipleImages = imageIntegration.processMultipleImages;
  imageOptimizationEnabled = true;
  console.log('[Image] Image optimization enabled for media-service');
} catch (error) {
  console.log('[Image] Image optimization disabled (sharp not available)');
  // Create no-op functions for when optimization is disabled
  processSingleImage = async (file) => ({ original: file });
  processMultipleImages = async (files) => files.map(f => ({ original: f }));
}

// S3 Configuration (MinIO compatible)
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.S3_BUCKET || 'lets-connect-media';

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/media', {
  dialect: 'postgres',
  logging: false
});

// Models
const MediaFile = sequelize.define('MediaFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: DataTypes.STRING,
  mimeType: DataTypes.STRING,
  size: DataTypes.INTEGER,
  url: DataTypes.STRING,
  type: {
    type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
    defaultValue: 'other'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'private'
  },
  // Phase 4: Image optimization fields
  optimizedUrl: DataTypes.STRING,
  thumbnailUrl: DataTypes.STRING,
  responsiveSizes: DataTypes.JSONB, // { thumbnail, small, medium, large }
  blurPlaceholder: DataTypes.TEXT,  // base64 encoded blur placeholder
  dominantColor: DataTypes.JSONB,   // { r, g, b }
  metadata: DataTypes.JSONB         // { width, height, format }
});

sequelize.sync();

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Phase 4: Monitoring and health checks
let healthChecker;
try {
  const { HealthChecker, checkDatabase, checkS3 } = require('../shared/monitoring');
  healthChecker = new HealthChecker('media-service');
  
  // Register database and S3 health checks
  healthChecker.registerCheck('database', () => checkDatabase(sequelize));
  healthChecker.registerCheck('s3', () => checkS3(s3, BUCKET_NAME));
  
  // Add metrics middleware
  app.use(healthChecker.metricsMiddleware());
  
  console.log('[Monitoring] Health checks and metrics enabled');
} catch (error) {
  console.log('[Monitoring] Advanced monitoring disabled');
}

// Routes

// Health check (basic liveness probe)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'media-service' });
});

// Readiness check (detailed health with dependencies)
app.get('/health/ready', async (req, res) => {
  if (!healthChecker) {
    return res.json({ status: 'healthy', service: 'media-service', message: 'Basic health check' });
  }
  
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  if (!healthChecker) {
    return res.type('text/plain').send('# Metrics not available\n');
  }
  
  const metrics = healthChecker.getPrometheusMetrics();
  res.type('text/plain').send(metrics);
});

// Public: Get public media
app.get('/public/files', async (req, res) => {
  try {
    const files = await MediaFile.findAll({
      where: { visibility: 'public' },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Upload file
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { userId, visibility } = req.body;
    const file = req.file;
    const filename = `${Date.now()}-${file.originalname}`;

    // Upload to S3/MinIO
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: visibility === 'public' ? 'public-read' : 'private'
    };

    const s3Result = await s3.upload(uploadParams).promise();

    // Determine file type
    let type = 'other';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('video/')) type = 'video';
    else if (file.mimetype.startsWith('audio/')) type = 'audio';
    else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) type = 'document';

    // Phase 4: Image optimization for image files
    let optimizationData = {};
    if (type === 'image' && imageOptimizationEnabled) {
      try {
        console.log('[Image] Processing image optimization for:', filename);
        const processedImage = await processSingleImage(file);
        
        // Upload optimized versions to S3
        if (processedImage.sizes) {
          const responsiveSizes = {};
          
          for (const [sizeName, sizeData] of Object.entries(processedImage.sizes)) {
            if (sizeData.path) {
              const sizeFilename = `${Date.now()}-${sizeName}-${file.originalname}`;
              const fs = require('fs');
              const sizeBuffer = fs.readFileSync(sizeData.path);
              
              const sizeUploadParams = {
                Bucket: BUCKET_NAME,
                Key: `optimized/${sizeFilename}`,
                Body: sizeBuffer,
                ContentType: 'image/webp',
                ACL: visibility === 'public' ? 'public-read' : 'private'
              };
              
              const sizeResult = await s3.upload(sizeUploadParams).promise();
              responsiveSizes[sizeName] = sizeResult.Location;
              
              // Clean up temp file
              fs.unlinkSync(sizeData.path);
            }
          }
          
          optimizationData.responsiveSizes = responsiveSizes;
          optimizationData.thumbnailUrl = responsiveSizes.thumbnail || null;
        }
        
        // Upload blur placeholder if available
        if (processedImage.blurPlaceholder) {
          const fs = require('fs');
          const blurBuffer = fs.readFileSync(processedImage.blurPlaceholder);
          optimizationData.blurPlaceholder = `data:image/webp;base64,${blurBuffer.toString('base64')}`;
          fs.unlinkSync(processedImage.blurPlaceholder);
        }
        
        optimizationData.dominantColor = processedImage.dominantColor || null;
        optimizationData.metadata = processedImage.metadata || null;
        
        console.log('[Image] Image optimization completed successfully');
      } catch (error) {
        console.error('[Image] Image optimization failed:', error);
        // Continue without optimization if it fails
      }
    }

    // Save metadata to database
    const mediaFile = await MediaFile.create({
      userId,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: s3Result.Location,
      type,
      visibility,
      ...optimizationData
    });

    res.status(201).json(mediaFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get user files
app.get('/files/:userId', async (req, res) => {
  try {
    const files = await MediaFile.findAll({
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file by ID
app.get('/files/id/:fileId', async (req, res) => {
  try {
    const file = await MediaFile.findByPk(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete file
app.delete('/files/:fileId', async (req, res) => {
  try {
    const file = await MediaFile.findByPk(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3/MinIO
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: file.filename
    }).promise();

    await file.destroy();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`Media service running on port ${PORT}`);
});
