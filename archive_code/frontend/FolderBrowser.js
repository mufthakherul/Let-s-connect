import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Folder,
  Description,
  FolderOpen,
  Add,
  MoreVert,
  Edit,
  Delete,
  Home as HomeIcon,
  NavigateNext
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';

const FolderBrowser = ({ user }) => {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [contents, setContents] = useState({ folders: [], documents: [] });
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState('folder'); // 'folder' or 'document'
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchRootContents();
    }
  }, [user]);

  const fetchRootContents = async () => {
    try {
      setLoading(true);
      // Fetch root level folders and documents
      const foldersResponse = await api.get('/collaboration/folders', {
        params: { parentId: null }
      });
      const docsResponse = await api.get('/collaboration/documents', {
        params: { parentFolderId: null }
      });
      
      setContents({
        folders: foldersResponse.data || [],
        documents: docsResponse.data || []
      });
      setCurrentFolder(null);
      setFolderPath([]);
    } catch (err) {
      console.error('Failed to fetch root contents:', err);
      toast.error('Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderContents = async (folderId, folderName) => {
    try {
      setLoading(true);
      const response = await api.get(`/collaboration/folders/${folderId}/contents`);
      
      setContents({
        folders: response.data.subfolders || [],
        documents: response.data.documents || []
      });
      setCurrentFolder({ id: folderId, name: folderName });
      
      // Update folder path
      const newPath = [...folderPath, { id: folderId, name: folderName }];
      setFolderPath(newPath);
    } catch (err) {
      console.error('Failed to fetch folder contents:', err);
      toast.error('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId, folderName, index) => {
    if (folderId === null) {
      fetchRootContents();
    } else {
      // Navigate to a folder in the path
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      fetchFolderContents(folderId, folderName);
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      await api.post('/collaboration/folders', {
        name: newItemName,
        description: newItemDescription,
        parentId: currentFolder?.id || null,
        createdBy: user?.id
      });
      
      toast.success('Folder created successfully');
      setCreateDialogOpen(false);
      setNewItemName('');
      setNewItemDescription('');
      
      // Refresh current view
      if (currentFolder) {
        fetchFolderContents(currentFolder.id, currentFolder.name);
      } else {
        fetchRootContents();
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      toast.error('Failed to create folder');
    }
  };

  const handleCreateDocument = async () => {
    if (!newItemName.trim()) {
      toast.error('Document name is required');
      return;
    }

    try {
      await api.post('/collaboration/documents', {
        title: newItemName,
        content: newItemDescription || '',
        parentFolderId: currentFolder?.id || null,
        createdBy: user?.id
      });
      
      toast.success('Document created successfully');
      setCreateDialogOpen(false);
      setNewItemName('');
      setNewItemDescription('');
      
      // Refresh current view
      if (currentFolder) {
        fetchFolderContents(currentFolder.id, currentFolder.name);
      } else {
        fetchRootContents();
      }
    } catch (err) {
      console.error('Failed to create document:', err);
      toast.error('Failed to create document');
    }
  };

  const handleItemMenuOpen = (event, item, type) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedItem({ ...item, type });
  };

  const handleItemMenuClose = () => {
    setMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    
    setEditName(selectedItem.name || selectedItem.title || '');
    setEditDescription(selectedItem.description || selectedItem.content || '');
    setEditDialogOpen(true);
    handleItemMenuClose();
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || !editName.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (selectedItem.type === 'folder') {
        await api.put(`/collaboration/folders/${selectedItem.id}`, {
          name: editName,
          description: editDescription
        });
      } else {
        await api.put(`/collaboration/documents/${selectedItem.id}`, {
          title: editName,
          content: editDescription
        });
      }
      
      toast.success(`${selectedItem.type === 'folder' ? 'Folder' : 'Document'} updated successfully`);
      setEditDialogOpen(false);
      setEditName('');
      setEditDescription('');
      
      // Refresh current view
      if (currentFolder) {
        fetchFolderContents(currentFolder.id, currentFolder.name);
      } else {
        fetchRootContents();
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    if (!window.confirm(`Are you sure you want to delete this ${selectedItem.type}?`)) {
      handleItemMenuClose();
      return;
    }

    try {
      if (selectedItem.type === 'folder') {
        await api.delete(`/collaboration/folders/${selectedItem.id}`);
      } else {
        await api.delete(`/collaboration/documents/${selectedItem.id}`);
      }
      
      toast.success(`${selectedItem.type === 'folder' ? 'Folder' : 'Document'} deleted successfully`);
      handleItemMenuClose();
      
      // Refresh current view
      if (currentFolder) {
        fetchFolderContents(currentFolder.id, currentFolder.name);
      } else {
        fetchRootContents();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error('Failed to delete item');
    }
  };

  const handleOpenDocument = (doc) => {
    // Navigate to document editor or viewer
    toast.info(`Opening document: ${doc.title}`);
    // You can navigate to /docs with the document ID
    // window.location.href = `/docs?id=${doc.id}`;
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Please log in to access folder browser
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FolderOpen sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Folder Browser
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setCreateType('folder');
                setCreateDialogOpen(true);
              }}
            >
              New Folder
            </Button>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => {
                setCreateType('document');
                setCreateDialogOpen(true);
              }}
            >
              New Document
            </Button>
          </Stack>
        </Box>

        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigateToFolder(null, 'Root', -1)}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Root
          </Link>
          {folderPath.map((folder, index) => (
            <Link
              key={folder.id}
              component="button"
              underline="hover"
              color={index === folderPath.length - 1 ? 'text.primary' : 'inherit'}
              onClick={() => navigateToFolder(folder.id, folder.name, index)}
              sx={{ cursor: 'pointer' }}
            >
              {folder.name}
            </Link>
          ))}
        </Breadcrumbs>

        {/* Folder and Document List */}
        {loading ? (
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <>
            {contents.folders.length === 0 && contents.documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  This folder is empty
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Create a new folder or document to get started
                </Typography>
              </Box>
            ) : (
              <List>
                {/* Folders */}
                {contents.folders.map((folder) => (
                  <ListItem
                    key={folder.id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleItemMenuOpen(e, folder, 'folder')}
                      >
                        <MoreVert />
                      </IconButton>
                    }
                  >
                    <ListItemButton onClick={() => fetchFolderContents(folder.id, folder.name)}>
                      <ListItemIcon>
                        <Folder color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.name}
                        secondary={folder.description || 'No description'}
                      />
                      <Chip
                        label="Folder"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 2 }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}

                {/* Documents */}
                {contents.documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleItemMenuOpen(e, doc, 'document')}
                      >
                        <MoreVert />
                      </IconButton>
                    }
                  >
                    <ListItemButton onClick={() => handleOpenDocument(doc)}>
                      <ListItemIcon>
                        <Description color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.title}
                        secondary={doc.content?.substring(0, 100) || 'No content'}
                      />
                      <Chip
                        label="Document"
                        size="small"
                        variant="outlined"
                        sx={{ ml: 2 }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New {createType === 'folder' ? 'Folder' : 'Document'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={createType === 'folder' ? 'Folder Name' : 'Document Title'}
              fullWidth
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              autoFocus
            />
            <TextField
              label={createType === 'folder' ? 'Description (Optional)' : 'Content (Optional)'}
              fullWidth
              multiline
              rows={4}
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createType === 'folder' ? handleCreateFolder : handleCreateDocument}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {selectedItem?.type === 'folder' ? 'Folder' : 'Document'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={selectedItem?.type === 'folder' ? 'Folder Name' : 'Document Title'}
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <TextField
              label={selectedItem?.type === 'folder' ? 'Description' : 'Content'}
              fullWidth
              multiline
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Item Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleItemMenuClose}
      >
        <MenuItem onClick={handleEditItem}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteItem}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default FolderBrowser;
