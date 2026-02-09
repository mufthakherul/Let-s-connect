import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CardMedia,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';

function Pages({ user }) {
  const [pages, setPages] = useState([]);
  const [myPages, setMyPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false);
  const [pageAdmins, setPageAdmins] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    avatarUrl: '',
    coverUrl: '',
  });

  const [adminFormData, setAdminFormData] = useState({
    userId: '',
    role: 'moderator',
  });

  useEffect(() => {
    if (user?.id) {
      fetchMyPages();
      fetchAllPages();
    }
  }, [user]);

  const fetchMyPages = async () => {
    try {
      const response = await api.get(`/users/${user.id}/pages`);
      setMyPages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch my pages:', error);
      toast.error('Failed to load your pages');
    }
  };

  const fetchAllPages = async () => {
    try {
      // Since there's no public pages endpoint, we'll just show user's pages for now
      const response = await api.get(`/users/${user.id}/pages`);
      setPages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }
  };

  const fetchPageAdmins = async (pageId) => {
    try {
      const response = await api.get(`/pages/${pageId}/admins`);
      setPageAdmins(response.data || []);
    } catch (error) {
      console.error('Failed to fetch page admins:', error);
      toast.error('Failed to load page admins');
    }
  };

  const handleCreatePage = async () => {
    if (!formData.name.trim()) {
      toast.error('Page name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/pages', {
        userId: user.id,
        ...formData,
      });
      
      toast.success('Page created successfully!');
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', category: '', avatarUrl: '', coverUrl: '' });
      fetchMyPages();
      fetchAllPages();
    } catch (error) {
      console.error('Failed to create page:', error);
      toast.error(error.response?.data?.error || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePage = async () => {
    if (!formData.name.trim()) {
      toast.error('Page name is required');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/pages/${selectedPage.id}`, formData);
      
      toast.success('Page updated successfully!');
      setEditDialogOpen(false);
      setSelectedPage(null);
      setFormData({ name: '', description: '', category: '', avatarUrl: '', coverUrl: '' });
      fetchMyPages();
      fetchAllPages();
    } catch (error) {
      console.error('Failed to update page:', error);
      toast.error(error.response?.data?.error || 'Failed to update page');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowPage = async (pageId) => {
    try {
      await api.post(`/pages/${pageId}/follow`, { userId: user.id });
      toast.success('Page followed successfully!');
      fetchAllPages();
    } catch (error) {
      console.error('Failed to follow page:', error);
      toast.error(error.response?.data?.error || 'Failed to follow page');
    }
  };

  const handleEditClick = (page) => {
    setSelectedPage(page);
    setFormData({
      name: page.name || '',
      description: page.description || '',
      category: page.category || '',
      avatarUrl: page.avatarUrl || '',
      coverUrl: page.coverUrl || '',
    });
    setEditDialogOpen(true);
  };

  const handleManageAdminsClick = (page) => {
    setSelectedPage(page);
    fetchPageAdmins(page.id);
    setAdminsDialogOpen(true);
  };

  const handleAddAdmin = async () => {
    if (!adminFormData.userId.trim()) {
      toast.error('User ID is required');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/pages/${selectedPage.id}/admins`, {
        userId: adminFormData.userId,
        role: adminFormData.role,
      });
      
      toast.success('Admin added successfully!');
      setAdminFormData({ userId: '', role: 'moderator' });
      fetchPageAdmins(selectedPage.id);
    } catch (error) {
      console.error('Failed to add admin:', error);
      toast.error(error.response?.data?.error || 'Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    setLoading(true);
    try {
      await api.delete(`/pages/${selectedPage.id}/admins/${adminId}`);
      toast.success('Admin removed successfully!');
      fetchPageAdmins(selectedPage.id);
    } catch (error) {
      console.error('Failed to remove admin:', error);
      toast.error(error.response?.data?.error || 'Failed to remove admin');
    } finally {
      setLoading(false);
    }
  };

  const renderPageCard = (page, isOwner = false) => (
    <Grid item xs={12} sm={6} md={4} key={page.id}>
      <Card>
        {page.coverUrl && (
          <CardMedia
            component="img"
            height="140"
            image={page.coverUrl}
            alt={page.name}
          />
        )}
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={page.avatarUrl}
              sx={{ width: 56, height: 56, mr: 2 }}
            >
              {page.name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">{page.name}</Typography>
                {page.isVerified && (
                  <VerifiedIcon color="primary" fontSize="small" />
                )}
              </Box>
              {page.category && (
                <Chip label={page.category} size="small" />
              )}
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {page.description}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {page.followers || 0} followers
              </Typography>
            </Box>
          </Box>
        </CardContent>
        
        <CardActions>
          {isOwner ? (
            <>
              <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(page)}>
                Edit
              </Button>
              <Button size="small" startIcon={<PeopleIcon />} onClick={() => handleManageAdminsClick(page)}>
                Admins
              </Button>
            </>
          ) : (
            <Button size="small" onClick={() => handleFollowPage(page.id)}>
              Follow
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Pages
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Page
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="My Pages" />
        <Tab label="Discover Pages" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {myPages.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    You haven't created any pages yet. Click "Create Page" to get started!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            myPages.map((page) => renderPageCard(page, true))
          )}
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {pages.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    No pages to discover yet.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            pages.map((page) => renderPageCard(page, false))
          )}
        </Grid>
      )}

      {/* Create Page Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !loading && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Page Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Category"
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Avatar URL (optional)"
            fullWidth
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Cover Image URL (optional)"
            fullWidth
            value={formData.coverUrl}
            onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreatePage} variant="contained" disabled={loading}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !loading && setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Page Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Category"
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Avatar URL (optional)"
            fullWidth
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Cover Image URL (optional)"
            fullWidth
            value={formData.coverUrl}
            onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdatePage} variant="contained" disabled={loading}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Admins Dialog */}
      <Dialog
        open={adminsDialogOpen}
        onClose={() => !loading && setAdminsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Page Admins</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add New Admin
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                size="small"
                label="User ID"
                value={adminFormData.userId}
                onChange={(e) => setAdminFormData({ ...adminFormData, userId: e.target.value })}
                disabled={loading}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={adminFormData.role}
                  label="Role"
                  onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value })}
                  disabled={loading}
                >
                  <MenuItem value="moderator">Moderator</MenuItem>
                  <MenuItem value="editor">Editor</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddAdmin}
                disabled={loading}
              >
                Add
              </Button>
            </Box>
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Current Admins
          </Typography>
          <List>
            {pageAdmins.length === 0 ? (
              <ListItem>
                <ListItemText primary="No admins yet" />
              </ListItem>
            ) : (
              pageAdmins.map((admin) => (
                <ListItem key={admin.id}>
                  <ListItemAvatar>
                    <Avatar>{admin.userId?.[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={admin.userId}
                    secondary={admin.role}
                  />
                  <ListItemSecondaryAction>
                    {admin.role !== 'owner' && (
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveAdmin(admin.id)}
                        disabled={loading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminsDialogOpen(false)} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pages;
