import React, { useState, useEffect } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, Grid } from '@mui/material';
import axios from 'axios';

function Videos() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/content/public/videos');
      setVideos(response.data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Videos
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Watch videos without signing up
      </Typography>

      <Grid container spacing={3}>
        {videos.map((video) => (
          <Grid item xs={12} sm={6} md={4} key={video.id}>
            <Card>
              <CardMedia
                component="div"
                sx={{ height: 200, bgcolor: 'grey.300' }}
                title={video.title}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {video.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {video.description}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {video.views} views
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Videos;
