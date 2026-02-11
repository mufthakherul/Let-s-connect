import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import { Add, Delete, ThumbUp } from '@mui/icons-material';
import axios from 'axios';

function Profile({ user }) {
  const [profile, setProfile] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: ''
  });

  const [skills, setSkills] = useState([]);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`/api/user/users/${user.id}/skills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkills(response.data || []);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setSaving(true);
      const payload = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        bio: profile.bio
      };

      const response = await axios.put(
        `/api/user/profile/${user.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = response.data?.user;
      if (updatedUser) {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const mergedUser = { ...storedUser, ...updatedUser };
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) {
      setError('Please enter a skill name');
      return;
    }

    try {
      const response = await axios.post(
        `/api/user/users/${user.id}/skills`,
        { name: newSkill.name.trim(), level: newSkill.level },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSkills([...skills, response.data]);
      setNewSkill({ name: '', level: 'intermediate' });
      setSkillDialogOpen(false);
      setSuccess('Skill added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to add skill:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to add skill');
      }
    }
  };

  const deleteSkill = async (skillId) => {
    if (!window.confirm('Are you sure you want to remove this skill?')) {
      return;
    }

    try {
      await axios.delete(`/api/user/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSkills(skills.filter(s => s.id !== skillId));
      setSuccess('Skill removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete skill:', err);
      setError('Failed to remove skill');
    }
  };

  const endorseSkill = async (skillId) => {
    try {
      await axios.post(
        `/api/user/skills/${skillId}/endorse`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh skills to show updated endorsement count
      fetchSkills();
      setSuccess('Skill endorsed!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to endorse skill:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to endorse skill');
      }
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'default';
      case 'intermediate': return 'primary';
      case 'advanced': return 'secondary';
      case 'expert': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5">
                {profile.firstName || user.firstName} {profile.lastName || user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>

          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="Skills & Endorsements" />
          </Tabs>

          {tabValue === 0 && (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                multiline
                rows={4}
                value={profile.bio}
                onChange={handleChange}
                margin="normal"
              />
              <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={saving}>
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </form>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Skills ({skills.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setSkillDialogOpen(true)}
                >
                  Add Skill
                </Button>
              </Box>

              {skills.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No skills added yet. Add your skills to showcase your expertise!
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {skills.map((skill) => (
                    <Grid item xs={12} sm={6} md={4} key={skill.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              {skill.name}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteSkill(skill.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>

                          <Chip
                            label={skill.level}
                            color={getLevelColor(skill.level)}
                            size="small"
                            sx={{ mb: 1 }}
                          />

                          <Divider sx={{ my: 1 }} />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              {skill.endorsements || 0} endorsement{(skill.endorsements || 0) !== 1 ? 's' : ''}
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<ThumbUp />}
                              onClick={() => endorseSkill(skill.id)}
                            >
                              Endorse
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Skill Dialog */}
      <Dialog open={skillDialogOpen} onClose={() => setSkillDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Skill</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Skill Name"
            value={newSkill.name}
            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            margin="normal"
            placeholder="e.g., JavaScript, Project Management, Design"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Proficiency Level</InputLabel>
            <Select
              value={newSkill.level}
              label="Proficiency Level"
              onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
              <MenuItem value="expert">Expert</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addSkill}>Add Skill</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Profile;
