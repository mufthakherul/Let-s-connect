import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Close,
  CameraAlt,
  PhotoCamera
} from '@mui/icons-material';
import api from '../utils/api';
import { requestCameraStream, supportsCameraCapture, triggerHapticFeedback } from '../utils/mobile';

/**
 * Media Gallery Component
 * Phase 4: Scale & Performance (v2.5)
 * 
 * Demonstrates image optimization features:
 * - Upload images with automatic optimization
 * - Display responsive image sizes
 * - Show blur placeholders while loading
 * - Display dominant colors
 * - View optimization metadata
 */
function MediaGallery() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Fetch public media files
  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/media/public/files');
      setFiles(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', '00000000-0000-0000-0000-000000000000'); // Demo user
      formData.append('visibility', visibility);

      const response = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFiles([response.data, ...files]);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      triggerHapticFeedback('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCameraDialog = () => {
    setCameraDialogOpen(false);
    setCapturingPhoto(false);
    stopCameraStream();
  };

  const openCameraDialog = async () => {
    setCameraError('');
    setCameraDialogOpen(true);

    if (!supportsCameraCapture()) {
      setCameraError('Camera is not supported in this browser/device.');
      return;
    }

    try {
      const stream = await requestCameraStream();
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      triggerHapticFeedback('selection');
    } catch (err) {
      console.error('Failed to access camera:', err);
      setCameraError(err.message || 'Unable to access camera. Check device permissions.');
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Failed to initialize capture context.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    setCapturingPhoto(true);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Failed to capture image from camera.');
        setCapturingPhoto(false);
        return;
      }

      const capturedFile = new File([blob], `camera-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      setSelectedFile(capturedFile);
      triggerHapticFeedback('success');
      setCapturingPhoto(false);
      closeCameraDialog();
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Handle file delete
  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;

    try {
      await api.delete(`/media/files/${fileId}`);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Media Gallery
          <Chip
            label="Phase 4: Image Optimization"
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          />
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Image
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {files.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                No media files yet. Upload your first image to see optimization in action!
              </Alert>
            </Grid>
          ) : (
            files.map((file) => (
              <Grid item xs={12} sm={6} md={4} key={file.id}>
                <Card>
                  {file.type === 'image' ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={file.thumbnailUrl || file.url}
                      alt={file.originalName}
                      sx={{
                        objectFit: 'cover',
                        backgroundColor: file.dominantColor
                          ? `rgb(${file.dominantColor.r}, ${file.dominantColor.g}, ${file.dominantColor.b})`
                          : '#f5f5f5'
                      }}
                    />
                  ) : (
                    <Box
                      height={200}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      bgcolor="grey.100"
                    >
                      <ImageIcon sx={{ fontSize: 64, color: 'grey.400' }} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {file.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(2)} KB
                    </Typography>

                    {/* Show optimization info if available */}
                    {file.responsiveSizes && (
                      <Box mt={1}>
                        <Chip
                          label="Optimized"
                          size="small"
                          color="success"
                        />
                        {file.metadata && (
                          <Typography variant="caption" display="block" mt={0.5}>
                            {file.metadata.width}x{file.metadata.height}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload Image
          <IconButton
            onClick={() => setUploadDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Images will be automatically optimized with 4 responsive sizes (thumbnail, small, medium, large)
            </Alert>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUpload />}
              sx={{ mb: 2 }}
            >
              Select Image File
              <input
                type="file"
                hidden
                accept="image/*"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </Button>

            <Button
              variant="text"
              fullWidth
              startIcon={<CameraAlt />}
              onClick={openCameraDialog}
              sx={{ mb: 1 }}
            >
              Capture with Camera
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Typography>
            )}

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Visibility</InputLabel>
              <Select
                value={visibility}
                label="Visibility"
                onChange={(e) => setVisibility(e.target.value)}
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Camera Capture Dialog */}
      <Dialog open={cameraDialogOpen} onClose={closeCameraDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Capture Image</DialogTitle>
        <DialogContent>
          {cameraError ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {cameraError}
            </Alert>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Box
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'black'
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCameraDialog}>Cancel</Button>
          {!cameraError && (
            <Button
              variant="contained"
              onClick={captureFromCamera}
              startIcon={capturingPhoto ? null : <PhotoCamera />}
              disabled={capturingPhoto}
            >
              {capturingPhoto ? <CircularProgress size={20} /> : 'Capture'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MediaGallery;
