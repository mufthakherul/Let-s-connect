const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
let Sequelize, DataTypes;
try {
  ({ Sequelize, DataTypes } = require('sequelize'));
} catch (err) {
  console.error('Critical: sequelize package not found. Ensure npm install ran successfully.', err.message);
  process.exit(1);
}
const { MigrationManager } = require('../shared/migrations-manager');
const { globalErrorHandler } = require('../shared/errorHandling');
const { HealthChecker, checkDatabase, checkS3 } = require('../shared/monitoring');
const response = require('../shared/response-wrapper');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(express.json());

// S3/MinIO Configuration
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET_NAME = process.env.S3_BUCKET || 'lets-connect-media';

// Multer memory storage (better for buffer-based optimization)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/media', {
  dialect: 'postgres',
  logging: false
});

const healthChecker = new HealthChecker('media-service');
const migrationManager = new MigrationManager(sequelize, 'media-service');

// Models (Standardized for Phase 10)
const MediaFile = sequelize.define('MediaFile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  originalName: DataTypes.STRING,
  mimeType: DataTypes.STRING,
  size: DataTypes.INTEGER,
  key: { type: DataTypes.STRING, allowNull: false }, // S3 Key
  bucket: { type: DataTypes.STRING, defaultValue: BUCKET_NAME },
  visibility: { type: DataTypes.ENUM('public', 'private'), defaultValue: 'private' },
  type: { type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'), defaultValue: 'other' },
  // Enrichment fields
  thumbnailKey: DataTypes.STRING,
  responsiveKeys: DataTypes.JSONB, // { thumbnail, small, medium, large, avif }
  blurPlaceholder: DataTypes.TEXT,
  dominantColor: DataTypes.JSONB,
  metadata: DataTypes.JSONB
}, {
  indexes: [{ fields: ['userId'] }, { fields: ['key'] }]
});

// Register Health Checks
healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('s3', () => checkS3(s3, BUCKET_NAME));

app.use(healthChecker.metricsMiddleware());

// --- ROUTES ---

// Health Checks
app.get('/health', (req, res) => res.json(healthChecker.getBasicHealth()));
app.get('/health/ready', async (req, res) => {
  const health = await healthChecker.runChecks();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

// Create Secure URL (Signed)
app.get('/url/:fileId', async (req, res) => {
  try {
    const file = await MediaFile.findByPk(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.visibility === 'public') {
      const publicUrl = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${file.key}`;
      return res.json({ url: publicUrl });
    }

    // Generate Signed URL
    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: file.key,
      Expires: 3600 // 1 hour
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload
const { processSingleImage } = require('./image-integration');

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { userId, visibility = 'private' } = req.body;
    const now = new Date();
    const datePath = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const uuid = require('uuid').v4();
    const extension = require('path').extname(req.file.originalname);
    const s3Key = `uploads/${datePath}/${uuid}${extension}`;

    // 1. Upload Original
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: visibility === 'public' ? 'public-read' : 'private'
    }).promise();

    let optimizationData = {};

    // 2. Process Image Optimization
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const processed = await processSingleImage(req.file);

        // Upload thumbnails and responsive sizes
        const responsiveKeys = {};
        for (const [size, data] of Object.entries(processed.sizes)) {
          const key = `optimized/${datePath}/${uuid}_${size}.webp`;
          const buffer = require('fs').readFileSync(data.path);
          await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: 'image/webp',
            ACL: visibility === 'public' ? 'public-read' : 'private'
          }).promise();
          responsiveKeys[size] = key;
        }

        optimizationData = {
          responsiveKeys,
          blurPlaceholder: processed.blurPlaceholder ? require('fs').readFileSync(processed.blurPlaceholder).toString('base64') : null,
          dominantColor: processed.dominantColor,
          metadata: processed.metadata
        };
      } catch (optErr) {
        console.error('[Opt] Optimization failed, continuing with original:', optErr);
      }
    }

    const mediaFile = await MediaFile.create({
      userId,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      key: s3Key,
      visibility,
      ...optimizationData
    });

    res.status(201).json(mediaFile);
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.use(globalErrorHandler);

async function startServer() {
  try {
    // Professional Migration Initialization
    await migrationManager.runMigrations([
      {
        name: 'init-media-tables',
        up: async (qi, Sequelize) => {
          // The model definition will handle table creation via sync in this setup, 
          // but for Phase 10 we move toward explicit migrations.
          await sequelize.sync({ alter: true });
        }
      }
    ]);

    app.listen(PORT, () => {
      console.log(`[Media] Professional S3 service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Fatal] Shutdown:', error);
    process.exit(1);
  }
}

startServer();
