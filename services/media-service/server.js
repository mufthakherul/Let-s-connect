const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(express.json());

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
  }
});

sequelize.sync();

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'media-service' });
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

    // Save metadata to database
    const mediaFile = await MediaFile.create({
      userId,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: s3Result.Location,
      type,
      visibility
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
