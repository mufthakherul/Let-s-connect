import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Button,
    Box,
    Typography,
    Tree,
    TreeItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    IconButton,
    Breadcrumbs,
    Link as MuiLink,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Card,
    CardContent,
    Menu,
    MenuItem
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FolderBrowser = () => {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [breadcrumb, setBreadcrumb] = useState([]);
    const [folderContents, setFolderContents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [folderDescription, setFolderDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    useEffect(() => {
        fetchRootFolders();
    }, [refreshKey]);

    const fetchRootFolders = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:8000/folders?ownerId=' + userId, {
                headers: { 'x-user-id': userId }
            });
            if (response.ok) {
                const data = await response.json();
                setFolders(data.folders || []);
            }
        } catch (error) {
            console.error('Failed to fetch folders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFolderTree = async (folderId) => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:8000/folders/tree/${folderId}`, {
                headers: { 'x-user-id': userId }
            });
            if (response.ok) {
                const data = await response.json();
                setFolderContents(data);
                setSelectedFolder(folderId);
            }
        } catch (error) {
            console.error('Failed to fetch folder tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!folderName.trim()) return;

        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch('http://localhost:8000/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    name: folderName,
                    description: folderDescription,
                    parentId: selectedFolder,
                    isPublic
                })
            });

            if (response.ok) {
                setOpenDialog(false);
                setFolderName('');
                setFolderDescription('');
                setIsPublic(false);
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Are you sure you want to delete this folder?')) return;

        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:8000/folders/${folderId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': userId }
            });

            if (response.ok) {
                setRefreshKey(prev => prev + 1);
                setContextMenu(null);
            }
        } catch (error) {
            console.error('Failed to delete folder:', error);
        }
    };

    const renderFolderTree = (node) => {
        if (!node) return null;

        return (
            <TreeItem
                nodeId={node.folder.id}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderIcon fontSize="small" />
                        <span>{node.folder.name}</span>
                        {node.folder.isPublic && (
                            <Typography variant="caption" sx={{ ml: 1, color: 'green' }}>
                                Public
                            </Typography>
                        )}
                    </Box>
                }
                onLabelClick={() => fetchFolderTree(node.folder.id)}
            >
                {node.children && node.children.map(child => renderFolderTree(child))}
            </TreeItem>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Folder Browser</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    New Folder
                </Button>
            </Box>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 3 }}>
                    {/* Folder Tree */}
                    <Paper elevation={2} sx={{ p: 2, height: 'fit-content' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Folder Structure
                        </Typography>
                        <Box
                            sx={{
                                maxHeight: '500px',
                                overflowY: 'auto',
                                '& .MuiTreeItem-root .MuiTreeItem-root': {
                                    marginLeft: 2
                                }
                            }}
                        >
                            {folders.length > 0 ? (
                                <Box sx={{ '& .MuiTreeItem-group': { marginLeft: 0 } }}>
                                    {folders.map(folder => (
                                        <Paper
                                            key={folder.id}
                                            sx={{
                                                p: 1.5,
                                                mb: 1,
                                                backgroundColor: selectedFolder === folder.id ? '#e3f2fd' : 'transparent',
                                                cursor: 'pointer',
                                                '&:hover': { backgroundColor: '#f5f5f5' }
                                            }}
                                            onClick={() => fetchFolderTree(folder.id)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FolderIcon fontSize="small" />
                                                <Typography variant="body2" sx={{ flex: 1 }}>
                                                    {folder.name}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setContextMenu(e.currentTarget);
                                                    }}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            {folder.description && (
                                                <Typography variant="caption" sx={{ ml: 4, color: 'textSecondary' }}>
                                                    {folder.description}
                                                </Typography>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="textSecondary">
                                    No folders yet. Create one to get started!
                                </Typography>
                            )}
                        </Box>
                    </Paper>

                    {/* Folder Contents */}
                    <Card>
                        <CardContent>
                            {folderContents ? (
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="h6" gutterBottom>
                                            {folderContents.folder.name}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {folderContents.folder.description}
                                        </Typography>
                                        {folderContents.folder.isPublic && (
                                            <Typography variant="caption" sx={{ color: 'green', display: 'block', mt: 1 }}>
                                                📤 This folder is public
                                            </Typography>
                                        )}
                                    </Box>

                                    {(folderContents.subfolders?.length > 0 || folderContents.documents?.length > 0) ? (
                                        <>
                                            {folderContents.subfolders?.length > 0 && (
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                        📁 Subfolders ({folderContents.subfolders.length})
                                                    </Typography>
                                                    <List dense>
                                                        {folderContents.subfolders.map(subfolder => (
                                                            <ListItem
                                                                key={subfolder.id}
                                                                button
                                                                onClick={() => fetchFolderTree(subfolder.id)}
                                                            >
                                                                <ListItemIcon>
                                                                    <FolderOpenIcon />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                    primary={subfolder.name}
                                                                    secondary={subfolder.description}
                                                                />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </Box>
                                            )}

                                            {folderContents.documents?.length > 0 && (
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                        📄 Documents ({folderContents.documents.length})
                                                    </Typography>
                                                    <List dense>
                                                        {folderContents.documents.map(doc => (
                                                            <ListItem key={doc.id}>
                                                                <ListItemText
                                                                    primary={doc.name}
                                                                    secondary={`Created: ${new Date(doc.createdAt).toLocaleDateString()}`}
                                                                />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </Box>
                                            )}
                                        </>
                                    ) : (
                                        <Typography variant="body2" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                                            This folder is empty
                                        </Typography>
                                    )}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                                    Select a folder to view its contents
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Create Folder Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Folder Name"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="My Folder"
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            value={folderDescription}
                            onChange={(e) => setFolderDescription(e.target.value)}
                            placeholder="Optional description"
                            multiline
                            rows={3}
                        />
                        {/* <FormControlLabel
              control={
                <Checkbox
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Make this folder public"
            /> */}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="contained"
                        disabled={!folderName.trim()}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Context Menu */}
            <Menu
                anchorEl={contextMenu}
                open={Boolean(contextMenu)}
                onClose={() => setContextMenu(null)}
            >
                <MenuItem onClick={() => setContextMenu(null)}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        // Delete context would need folder ID
                        setContextMenu(null);
                    }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>
        </Container>
    );
};

export default FolderBrowser;
