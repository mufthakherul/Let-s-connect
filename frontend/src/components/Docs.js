import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';

function Docs() {
  const [docs, setDocs] = useState([]);
  const [wikiPages, setWikiPages] = useState([]);

  useEffect(() => {
    fetchDocs();
    fetchWiki();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await axios.get('/api/collaboration/public/docs');
      setDocs(response.data);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    }
  };

  const fetchWiki = async () => {
    try {
      const response = await axios.get('/api/collaboration/public/wiki');
      setWikiPages(response.data);
    } catch (err) {
      console.error('Failed to fetch wiki:', err);
    }
  };

  return (
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
                <ListItemText
                  primary={page.title}
                  secondary={`Slug: ${page.slug}`}
                />
              </ListItem>
            </CardContent>
          </Card>
        ))}
      </List>
    </Box>
  );
}

export default Docs;
