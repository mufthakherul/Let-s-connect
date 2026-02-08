import React from 'react';
import { Typography, Box, Button, Grid, Card, CardContent } from '@mui/material';
import { Link } from 'react-router-dom';

function Home() {
  const features = [
    { title: 'Social Feed', description: 'Share posts, images, and videos with friends', link: '/feed' },
    { title: 'Video Platform', description: 'Watch and upload videos publicly', link: '/videos' },
    { title: 'Real-time Chat', description: 'Message friends and groups instantly', link: '/chat' },
    { title: 'Collaboration', description: 'Create docs, wikis, and manage tasks', link: '/docs' },
    { title: 'Shop', description: 'Browse and purchase products', link: '/shop' },
    { title: 'AI Assistant', description: 'Get help from AI-powered assistant', link: '/chat' }
  ];

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" gutterBottom>
          Welcome to Let's Connect
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Unified Social Collaboration Platform
        </Typography>
        <Typography variant="body1" paragraph>
          Combining the best features of Facebook, X, YouTube, WhatsApp, Telegram, Discord, and Notion
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" size="large" component={Link} to="/register" sx={{ mr: 2 }}>
            Get Started
          </Button>
          <Button variant="outlined" size="large" component={Link} to="/videos">
            Explore Videos
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Features
        </Typography>
        <ul>
          <li>Public access for video watching, reading docs, and browsing shops - no signup required</li>
          <li>Private access for feeds, posts, orders, chat, calls, and collaboration</li>
          <li>User profiles and customizable settings</li>
          <li>Groups and communities</li>
          <li>Real-time messaging with voice and video support</li>
          <li>File sharing and media management</li>
          <li>Collaborative documents and wiki</li>
          <li>AI-powered assistant</li>
          <li>Strong security with JWT authentication</li>
          <li>Modular microservices architecture</li>
          <li>Self-hosted deployment with Docker</li>
        </ul>
      </Box>
    </Box>
  );
}

export default Home;
