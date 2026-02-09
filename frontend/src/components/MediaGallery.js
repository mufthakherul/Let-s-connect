import React, { useState, useEffect } from 'react';
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
  Close
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

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

  // Fetch public media files
  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/public/files`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data);
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

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setFiles([data, ...files]);
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle file delete
  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

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
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
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
    </Container>
  );
}

export default MediaGallery;
