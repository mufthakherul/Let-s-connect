import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Stack
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Projects from './Projects';

function Docs({ user }) {
  const [tab, setTab] = useState(0);
  const [docs, setDocs] = useState([]);
  const [wikiPages, setWikiPages] = useState([]);

  useEffect(() => {
    fetchDocs();
    fetchWiki();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await api.get('/collaboration/public/docs');
      setDocs(response.data);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
      toast.error('Failed to load docs');
    }
  };

  const fetchWiki = async () => {
    try {
      const response = await api.get('/collaboration/public/wiki');
      setWikiPages(response.data);
    } catch (err) {
      console.error('Failed to fetch wiki:', err);
      toast.error('Failed to load wiki');
    }
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Docs & Wiki" />
        <Tab label="Projects" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Typography variant="h4" gutterBottom>
            Documentation & Wiki
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Read documentation without signing up
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Public Documents
          </Typography>
          <List>
            {docs.map((doc) => (
              <Card key={doc.id} sx={{ mb: 2 }}>
                <CardContent>
                  <ListItem>
                    <ListItemText
                      primary={doc.title}
                      secondary={`Last updated: ${new Date(doc.updatedAt).toLocaleDateString()}`}
                    />
                  </ListItem>
                </CardContent>
              </Card>
            ))}
          </List>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Wiki Pages
          </Typography>
          <List>
            {wikiPages.map((page) => (
              <Card key={page.id} sx={{ mb: 2 }}>
                <CardContent>
                  <ListItem>
                    <ListItemText primary={page.title} secondary={`Slug: ${page.slug}`} />
                  </ListItem>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {!user && (
            <Card>
              <CardContent>
                <Typography variant="h6">Login required</Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects, issues, milestones, and board management need authentication.
                </Typography>
              </CardContent>
            </Card>
          )}
          {user && <Projects user={user} />}
        </Stack>
      )}
    </Box>
  );
}

export default Docs;
