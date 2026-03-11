import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Grid, Card, CardContent, CardActions, Typography,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Chip, Box, Avatar,
  Skeleton, Stepper, Step, StepLabel, InputAdornment,
} from '@mui/material';
import {
  Add, Group as GroupIcon, Public, Lock, VpnLock,
  Search as SearchIcon, Visibility as VisibilityIcon,
  ExitToApp as LeaveIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../utils/helpers';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['All', 'Technology', 'Arts', 'Sports', 'Business', 'Gaming', 'Education', 'Lifestyle'];

const CATEGORY_GRADIENTS = {
  Technology: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Arts: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Sports: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Business: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  Gaming: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  Education: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  Lifestyle: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  General: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
  default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public — Anyone can join', icon: <Public fontSize="small" /> },
  { value: 'closed', label: 'Closed — Approval required', icon: <Lock fontSize="small" /> },
  { value: 'secret', label: 'Secret — Invite only', icon: <VpnLock fontSize="small" /> },
];

const STEPS = ['Basic Info', 'Settings', 'Preview'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const getCoverGradient = (category) => {
  if (!category) return CATEGORY_GRADIENTS.default;
  const key = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return CATEGORY_GRADIENTS[key] || CATEGORY_GRADIENTS.default;
};

const getPrivacyIcon = (privacy) => {
  switch (privacy) {
    case 'public': return <Public fontSize="small" />;
    case 'closed':
    case 'private': return <Lock fontSize="small" />;
    case 'secret': return <VpnLock fontSize="small" />;
    default: return <Public fontSize="small" />;
  }
};

const Groups = ({ user }) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimer = useRef(null);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: 'public',
    category: 'general',
    coverUrl: '',
  });

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchGroups = useCallback(async (search = searchQuery) => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory.toLowerCase();
      if (search) params.search = search;
      const response = await api.get('/content/groups', { params });
      setGroups(Array.isArray(response.data) ? response.data : response.data?.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchGroups(value), 400);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    try {
      const response = await api.post('/content/groups', newGroup);
      setGroups((prev) => [response.data, ...prev]);
      setOpenDialog(false);
      setActiveStep(0);
      setNewGroup({ name: '', description: '', privacy: 'public', category: 'general', coverUrl: '' });
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await api.post(`/content/groups/${groupId}/join`, {});
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, isMember: true, memberCount: (g.memberCount || 0) + 1 } : g
        )
      );
      toast.success('Joined group successfully!');
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.response?.data?.error || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await api.post(`/content/groups/${groupId}/leave`, {});
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, isMember: false, memberCount: Math.max(0, (g.memberCount || 1) - 1) }
            : g
        )
      );
      toast.success('Left group');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(error.response?.data?.error || 'Failed to leave group');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setActiveStep(0);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={newGroup.category}
                label="Category"
                onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
              >
                <MenuItem value="general">General</MenuItem>
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <MenuItem key={cat} value={cat.toLowerCase()}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Privacy</InputLabel>
              <Select
                value={newGroup.privacy}
                label="Privacy"
                onChange={(e) => setNewGroup({ ...newGroup, privacy: e.target.value })}
              >
                {PRIVACY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {opt.icon}
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Cover Photo URL (optional)"
              fullWidth
              value={newGroup.coverUrl}
              onChange={(e) => setNewGroup({ ...newGroup, coverUrl: e.target.value })}
            />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Box
              sx={{
                height: 120,
                borderRadius: 2,
                backgroundImage: newGroup.coverUrl
                  ? `url(${newGroup.coverUrl})`
                  : undefined,
                background: !newGroup.coverUrl
                  ? getCoverGradient(newGroup.category)
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mb: 2,
              }}
            />
            <Typography variant="h6">{newGroup.name || 'Group Name'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {newGroup.description || 'No description provided'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Chip label={newGroup.category || 'general'} size="small" />
              <Chip
                icon={getPrivacyIcon(newGroup.privacy)}
                label={newGroup.privacy}
                size="small"
                variant="outlined"
              />
            </Box>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (loading && groups.length === 0) {
    return (
      <Container maxWidth="lg">
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map((n) => (
            <Grid item xs={12} sm={6} md={4} key={n}>
              <Card>
                <Skeleton variant="rectangular" height={120} />
                <CardContent>
                  <Skeleton variant="text" width="60%" height={30} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Groups
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Create Group
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search groups..."
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Category filter chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            clickable
            color={selectedCategory === cat ? 'primary' : 'default'}
            variant={selectedCategory === cat ? 'filled' : 'outlined'}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </Box>

      {/* Group cards */}
      <Grid container spacing={3}>
        <AnimatePresence>
          {groups.length === 0 && !loading ? (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <GroupIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No groups found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try a different category or create a new group
                </Typography>
              </Box>
            </Grid>
          ) : (
            groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ scale: 1.02, y: -4 }}
                  layout
                >
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Cover gradient or image */}
                    <Box
                      sx={{
                        height: 120,
                        backgroundImage: group.coverUrl ? `url(${group.coverUrl})` : undefined,
                        background: !group.coverUrl ? getCoverGradient(group.category) : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div" noWrap>
                            {group.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            {getPrivacyIcon(group.privacy)}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ textTransform: 'capitalize' }}
                            >
                              {group.privacy}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {group.description || 'No description'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={group.category || 'general'}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${formatNumber(group.memberCount || 0)} members`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>

                    <CardActions sx={{ gap: 1, px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        View
                      </Button>

                      {group.isMember ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<LeaveIcon />}
                          onClick={() => handleLeaveGroup(group.id)}
                          sx={{ ml: 'auto' }}
                        >
                          Leave
                        </Button>
                      ) : group.isPending ? (
                        <Button size="small" variant="outlined" disabled sx={{ ml: 'auto' }}>
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleJoinGroup(group.id)}
                          sx={{ ml: 'auto' }}
                        >
                          Join
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </motion.div>
              </Grid>
            ))
          )}
        </AnimatePresence>
      </Grid>

      {/* Create Group Dialog — 3-step wizard */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3, pt: 1 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
          )}
          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => {
                if (activeStep === 0 && !newGroup.name.trim()) {
                  toast.error('Group name is required');
                  return;
                }
                setActiveStep((s) => s + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleCreateGroup}>
              Create Group
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Groups;
