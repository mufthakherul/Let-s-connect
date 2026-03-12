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
  CardActions,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  People as PeopleIcon,
  BarChart as InsightsIcon,
  Favorite as FollowIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../utils/api';

const CATEGORY_GRADIENTS = {
  Technology: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Business: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  Entertainment: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Education: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  Health: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Sports: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  Arts: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const generateMockFollowerGrowth = (baseCount = 100) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let count = baseCount;
  return days.map((day) => {
    count += Math.floor(Math.random() * 40) + 5;
    return { day, followers: count };
  });
};

const getCoverStyle = (page) => {
  if (page.coverUrl) return {};
  const cat = page.category || '';
  const key = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  return { background: CATEGORY_GRADIENTS[key] || CATEGORY_GRADIENTS.default };
};

function Pages({ user }) {
  const [pages, setPages] = useState([]);
  const [myPages, setMyPages] = useState([]);
  const [followingPages, setFollowingPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [pageAdmins, setPageAdmins] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    avatarUrl: '',
    coverUrl: '',
    ctaLabel: '',
    ctaUrl: '',
  });

  const [adminFormData, setAdminFormData] = useState({
    userId: '',
    role: 'moderator',
  });

  useEffect(() => {
    if (user?.id) {
      fetchMyPages();
      fetchAllPages();
      fetchFollowingPages();
    }
  }, [user]);

  const fetchMyPages = async () => {
    try {
      const response = await api.get('/user/pages');
      setMyPages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch my pages:', error);
      // Fallback to legacy endpoint
      try {
        const resp = await api.get(`/users/${user.id}/pages`);
        setMyPages(resp.data || []);
      } catch (e) {
        toast.error('Failed to load your pages');
      }
    }
  };

  const fetchAllPages = async () => {
    try {
      const response = await api.get('/user/pages/discover');
      setPages(response.data || []);
    } catch (error) {
      // Discover may not exist yet; keep empty
      setPages([]);
    }
  };

  const fetchFollowingPages = async () => {
    try {
      const response = await api.get('/user/pages/following');
      setFollowingPages(response.data || []);
    } catch (error) {
      setFollowingPages([]);
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

  const fetchPageInsights = async (page) => {
    setSelectedPage(page);
    try {
      const response = await api.get(`/user/pages/${page.id}/insights`);
      setInsightsData(response.data);
    } catch (error) {
      // Use mock data when endpoint is not yet available
      setInsightsData({
        followerGrowth: generateMockFollowerGrowth(page.followers || 100),
        totalViews: Math.floor(Math.random() * 10000) + 500,
        followers: page.followers || 0,
        engagementRate: (Math.random() * 8 + 1).toFixed(1),
      });
    }
    setInsightsDialogOpen(true);
  };

  const handleCreatePage = async () => {
    if (!formData.name.trim()) {
      toast.error('Page name is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/user/pages', formData);
      toast.success('Page created successfully!');
      setCreateDialogOpen(false);
      resetForm();
      fetchMyPages();
      fetchAllPages();
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        await api.post('/pages', formData);
        toast.success('Page created successfully!');
        setCreateDialogOpen(false);
        resetForm();
        fetchMyPages();
      } catch (e) {
        console.error('Failed to create page:', e);
        toast.error(e.response?.data?.error || 'Failed to create page');
      }
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
      await api.put(`/user/pages/${selectedPage.id}`, formData);
      toast.success('Page updated successfully!');
      setEditDialogOpen(false);
      setSelectedPage(null);
      resetForm();
      fetchMyPages();
    } catch (error) {
      try {
        await api.put(`/pages/${selectedPage.id}`, formData);
        toast.success('Page updated successfully!');
        setEditDialogOpen(false);
        setSelectedPage(null);
        resetForm();
        fetchMyPages();
      } catch (e) {
        console.error('Failed to update page:', e);
        toast.error(e.response?.data?.error || 'Failed to update page');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollowPage = async (pageId) => {
    try {
      await api.post(`/user/pages/${pageId}/follow`);
      toast.success('Page followed!');
      fetchAllPages();
      fetchFollowingPages();
    } catch (error) {
      try {
        await api.post(`/pages/${pageId}/follow`, { userId: user.id });
        toast.success('Page followed!');
        fetchAllPages();
      } catch (e) {
        toast.error(e.response?.data?.error || 'Failed to follow page');
      }
    }
  };

  const handleUnfollowPage = async (pageId) => {
    try {
      await api.post(`/user/pages/${pageId}/unfollow`);
      toast.success('Unfollowed page');
      fetchFollowingPages();
      fetchAllPages();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unfollow page');
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
      ctaLabel: page.ctaLabel || '',
      ctaUrl: page.ctaUrl || '',
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
        adminUserId: adminFormData.userId,
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

  const resetForm = () => {
    setFormData({ name: '', description: '', category: '', avatarUrl: '', coverUrl: '', ctaLabel: '', ctaUrl: '' });
  };

  const renderPageFormFields = () => (
    <>
      <TextField
        autoFocus
        margin="dense"
        label="Page Name"
        fullWidth
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={loading}
        sx={{ mb: 1 }}
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
        sx={{ mb: 1 }}
      />
      <TextField
        margin="dense"
        label="Category"
        fullWidth
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        disabled={loading}
        sx={{ mb: 1 }}
      />
      <TextField
        margin="dense"
        label="Avatar URL (optional)"
        fullWidth
        value={formData.avatarUrl}
        onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
        disabled={loading}
        sx={{ mb: 1 }}
      />
      <TextField
        margin="dense"
        label="Cover Photo URL (optional)"
        fullWidth
        value={formData.coverUrl}
        onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
        disabled={loading}
        sx={{ mb: 1 }}
      />
      <TextField
        margin="dense"
        label="CTA Button Label (optional)"
        fullWidth
        value={formData.ctaLabel}
        onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
        disabled={loading}
        sx={{ mb: 1 }}
      />
      <TextField
        margin="dense"
        label="CTA Button URL (optional)"
        fullWidth
        value={formData.ctaUrl}
        onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
        disabled={loading}
      />
    </>
  );

  const renderPageCard = (page, isOwner = false, showUnfollow = false) => (
    <Grid item xs={12} sm={6} md={4} key={page.id}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -3 }}
      >
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Cover strip */}
          <Box
            sx={{
              height: 100,
              ...getCoverStyle(page),
              backgroundImage: page.coverUrl ? `url(${page.coverUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={page.avatarUrl}
                sx={{ width: 56, height: 56, mr: 2, mt: -4, border: '3px solid white' }}
              >
                {page.name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="h6" noWrap>
                    {page.name}
                  </Typography>
                  {page.isVerified && (
                    <VerifiedIcon color="primary" fontSize="small" />
                  )}
                </Box>
                {page.category && (
                  <Chip label={page.category} size="small" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {page.description}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {page.followers || 0} followers
              </Typography>
            </Box>
          </CardContent>

          <CardActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {isOwner ? (
              <>
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(page)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<InsightsIcon />}
                  onClick={() => fetchPageInsights(page)}
                >
                  Insights
                </Button>
                <Button
                  size="small"
                  startIcon={<PeopleIcon />}
                  onClick={() => handleManageAdminsClick(page)}
                >
                  Admins
                </Button>
              </>
            ) : showUnfollow ? (
              <Button size="small" color="error" onClick={() => handleUnfollowPage(page.id)}>
                Unfollow
              </Button>
            ) : (
              <Button
                size="small"
                startIcon={<FollowIcon />}
                onClick={() => handleFollowPage(page.id)}
              >
                Follow
              </Button>
            )}
          </CardActions>
        </Card>
      </motion.div>
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

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="My Pages" />
        <Tab label="Discover" />
        <Tab label="Following" />
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

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {followingPages.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" align="center">
                    You're not following any pages yet.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            followingPages.map((page) => renderPageCard(page, false, true))
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DialogTitle>Create New Page</DialogTitle>
          <DialogContent>{renderPageFormFields()}</DialogContent>
          <DialogActions>
            <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage} variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Create'}
            </Button>
          </DialogActions>
        </motion.div>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !loading && setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DialogTitle>Edit Page</DialogTitle>
          <DialogContent>{renderPageFormFields()}</DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePage} variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Update'}
            </Button>
          </DialogActions>
        </motion.div>
      </Dialog>

      {/* Page Insights Dialog */}
      <Dialog
        open={insightsDialogOpen}
        onClose={() => setInsightsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Page Insights — {selectedPage?.name}</DialogTitle>
        <DialogContent>
          {insightsData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats row */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {insightsData.totalViews?.toLocaleString() || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Views
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {insightsData.followers?.toLocaleString() || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Followers
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {insightsData.engagementRate || '—'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Engagement Rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Follower growth chart */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Follower Growth (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={insightsData.followerGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="followers"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightsDialogOpen(false)}>Close</Button>
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
              <Button variant="contained" onClick={handleAddAdmin} disabled={loading}>
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
                  <ListItemText primary={admin.userId} secondary={admin.role} />
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
