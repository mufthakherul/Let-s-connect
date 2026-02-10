import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

const FolderBrowser = () => {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <FolderIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" component="h1">
                        Folder Browser
                    </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                    Folder browser functionality is available in the full backend-connected version.
                    This requires document-service API integration.
                </Typography>
            </Paper>
        </Container>
    );
};

export default FolderBrowser;
