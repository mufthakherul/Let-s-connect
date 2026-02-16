import React, { useEffect, useMemo, useState } from 'react';
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
  Tab,
  Tooltip
} from '@mui/material';
import { Add, Delete, ThumbUp } from '@mui/icons-material';
import axios from 'axios';
import { motion } from 'framer-motion';

const emptyProfile = {
  firstName: '',
  lastName: '',
  bio: '',
  avatar: '',
  headline: '',
  pronouns: '',
  location: '',
  city: '',
  country: '',
  timezone: '',
  phoneNumber: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  portfolioUrl: '',
  company: '',
  jobTitle: '',
  industry: '',
  experienceLevel: '',
  yearsExperience: '',
  interests: [],
  languages: [],
  certifications: [],
  education: [],
  socialLinks: {
    linkedin: '',
    github: '',
    twitter: '',
    instagram: '',
    youtube: ''
  }
};

const splitList = (value) => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const listToString = (items) => (Array.isArray(items) ? items.join(', ') : '');

const formatEducation = (education) => {
  if (!Array.isArray(education)) return '';
  return education
    .map((entry) => [entry.school, entry.degree, entry.field, entry.year].filter(Boolean).join(' | '))
    .join('\n');
};

const parseEducation = (value) => {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [school, degree, field, year] = line.split('|').map((part) => part.trim());
    return {
      school: school || '',
      degree: degree || '',
      field: field || '',
      year: year || ''
    };
  });
};

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.08 }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

const hoverCardSx = {
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: 6
  }
};

const softActionSx = {
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: 3
  }
};

function Profile({ user }) {
  const [profile, setProfile] = useState({
    ...emptyProfile,
    firstName: user.firstName || '',
    lastName: user.lastName || ''
  });

  const [skills, setSkills] = useState([]);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  useEffect(() => {
    fetchProfile();
    fetchSkills();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`/api/user/profile/${user.id}`, { headers });
      const userData = response.data || {};
      const serverProfile = userData.Profile || {};
      setProfile((prev) => ({
        ...prev,
        ...serverProfile,
        firstName: userData.firstName || prev.firstName,
        lastName: userData.lastName || prev.lastName,
        bio: userData.bio || prev.bio,
        avatar: userData.avatar || prev.avatar,
        interests: serverProfile.interests || [],
        languages: serverProfile.languages || [],
        certifications: serverProfile.certifications || [],
        education: serverProfile.education || [],
        socialLinks: {
          ...prev.socialLinks,
          ...(serverProfile.socialLinks || {})
        }
      }));
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`/api/user/users/${user.id}/skills`, { headers });
      setSkills(response.data || []);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleListChange = (key, value) => {
    setProfile({ ...profile, [key]: splitList(value) });
  };

  const handleSocialChange = (key, value) => {
    setProfile({
      ...profile,
      socialLinks: {
        ...(profile.socialLinks || {}),
        [key]: value
      }
    });
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
        bio: profile.bio,
        avatar: profile.avatar
      };

      const profilePayload = {
        headline: profile.headline,
        pronouns: profile.pronouns,
        phoneNumber: profile.phoneNumber,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        location: profile.location,
        city: profile.city,
        country: profile.country,
        timezone: profile.timezone,
        website: profile.website,
        portfolioUrl: profile.portfolioUrl,
        company: profile.company,
        jobTitle: profile.jobTitle,
        industry: profile.industry,
        experienceLevel: profile.experienceLevel,
        yearsExperience: profile.yearsExperience ? Number(profile.yearsExperience) : null,
        interests: profile.interests,
        languages: profile.languages,
        certifications: profile.certifications,
        education: profile.education,
        socialLinks: profile.socialLinks
      };

      const response = await axios.put(
        `/api/user/profile/${user.id}`,
        { ...payload, profile: profilePayload },
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
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
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

      <Card component={motion.div} variants={sectionVariants} sx={hoverCardSx}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
            <Tooltip title="Profile photo" arrow>
              <Avatar sx={{ width: 88, height: 88 }} src={profile.avatar || undefined}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Avatar>
            </Tooltip>
            <Box sx={{ flexGrow: 1, minWidth: 240 }}>
              <Typography variant="h5">
                {profile.firstName || user.firstName} {profile.lastName || user.lastName}
              </Typography>
              {profile.headline && (
                <Typography variant="body1" color="text.secondary">
                  {profile.headline}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip
                  size="small"
                  label={`@${user.username}`}
                  sx={{ transition: 'transform 0.15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
                />
                {profile.city && profile.country && (
                  <Chip
                    size="small"
                    label={`${profile.city}, ${profile.country}`}
                    sx={{ transition: 'transform 0.15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
                  />
                )}
                {profile.timezone && (
                  <Chip
                    size="small"
                    label={profile.timezone}
                    sx={{ transition: 'transform 0.15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ minWidth: 220 }}>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              {profile.pronouns && (
                <Typography variant="body2" color="text.secondary">
                  Pronouns: {profile.pronouns}
                </Typography>
              )}
            </Box>
          </Box>

          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 2 }}>
            <Tab label={(
              <Tooltip title="Bio, location, languages, and personal details" arrow>
                <span>Overview</span>
              </Tooltip>
            )} />
            <Tab label={(
              <Tooltip title="Work, experience, education, certifications" arrow>
                <span>Professional</span>
              </Tooltip>
            )} />
            <Tab label={(
              <Tooltip title="Public contact and social links" arrow>
                <span>Contact</span>
              </Tooltip>
            )} />
            <Tab label={(
              <Tooltip title="Skills, levels, and endorsements" arrow>
                <span>Skills</span>
              </Tooltip>
            )} />
          </Tabs>

          {loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Loading profile details...
            </Typography>
          )}

          {tabValue === 0 && (
            <Box component={motion.form} variants={sectionVariants} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Your given name" arrow>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Your family name" arrow>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Short professional summary" arrow>
                    <TextField
                      fullWidth
                      label="Headline"
                      name="headline"
                      value={profile.headline || ''}
                      onChange={handleChange}
                      placeholder="e.g., Product Designer at Let’s Connect"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Optional pronouns" arrow>
                    <TextField
                      fullWidth
                      label="Pronouns"
                      name="pronouns"
                      value={profile.pronouns || ''}
                      onChange={handleChange}
                      placeholder="e.g., she/her"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Tell others about your background" arrow>
                    <TextField
                      fullWidth
                      label="Bio"
                      name="bio"
                      multiline
                      rows={4}
                      value={profile.bio}
                      onChange={handleChange}
                      placeholder="Share a short summary about yourself"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Short location string used for quick display" arrow>
                    <TextField
                      fullWidth
                      label="Location (short)"
                      name="location"
                      value={profile.location || ''}
                      onChange={handleChange}
                      placeholder="e.g., Berlin, Germany"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tooltip title="City or region" arrow>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={profile.city || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tooltip title="Country" arrow>
                    <TextField
                      fullWidth
                      label="Country"
                      name="country"
                      value={profile.country || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tooltip title="Preferred timezone" arrow>
                    <TextField
                      fullWidth
                      label="Timezone"
                      name="timezone"
                      value={profile.timezone || ''}
                      onChange={handleChange}
                      placeholder="e.g., UTC+1"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Separate interests with commas" arrow>
                    <TextField
                      fullWidth
                      label="Interests (optional)"
                      value={listToString(profile.interests)}
                      onChange={(e) => handleListChange('interests', e.target.value)}
                      helperText="Comma-separated"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Separate languages with commas" arrow>
                    <TextField
                      fullWidth
                      label="Languages (optional)"
                      value={listToString(profile.languages)}
                      onChange={(e) => handleListChange('languages', e.target.value)}
                      helperText="Comma-separated"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Paste an image URL to use as your avatar" arrow>
                    <TextField
                      fullWidth
                      label="Avatar URL (optional)"
                      name="avatar"
                      value={profile.avatar || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
              </Grid>
              <Tooltip title="Save overview changes" arrow>
                <Button type="submit" variant="contained" sx={{ mt: 2, ...softActionSx }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Overview'}
                </Button>
              </Tooltip>
            </Box>
          )}

          {tabValue === 1 && (
            <Box component={motion.form} variants={sectionVariants} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Current or most recent company" arrow>
                    <TextField
                      fullWidth
                      label="Company"
                      name="company"
                      value={profile.company || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Role or position" arrow>
                    <TextField
                      fullWidth
                      label="Job Title"
                      name="jobTitle"
                      value={profile.jobTitle || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Industry or domain" arrow>
                    <TextField
                      fullWidth
                      label="Industry"
                      name="industry"
                      value={profile.industry || ''}
                      onChange={handleChange}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Tooltip title="Optional seniority level" arrow>
                    <FormControl fullWidth>
                      <InputLabel>Experience Level</InputLabel>
                      <Select
                        value={profile.experienceLevel || ''}
                        label="Experience Level"
                        onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
                      >
                        <MenuItem value="">Prefer not to say</MenuItem>
                        <MenuItem value="entry">Entry</MenuItem>
                        <MenuItem value="mid">Mid</MenuItem>
                        <MenuItem value="senior">Senior</MenuItem>
                        <MenuItem value="lead">Lead</MenuItem>
                        <MenuItem value="executive">Executive</MenuItem>
                      </Select>
                    </FormControl>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Tooltip title="Total years of experience" arrow>
                    <TextField
                      fullWidth
                      label="Years Experience"
                      name="yearsExperience"
                      value={profile.yearsExperience || ''}
                      onChange={handleChange}
                      type="number"
                      inputProps={{ min: 0 }}
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="One per line: School | Degree | Field | Year" arrow>
                    <TextField
                      fullWidth
                      label="Education (optional)"
                      multiline
                      rows={3}
                      value={formatEducation(profile.education)}
                      onChange={(e) => setProfile({ ...profile, education: parseEducation(e.target.value) })}
                      helperText="One per line: School | Degree | Field | Year"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Separate certifications with commas" arrow>
                    <TextField
                      fullWidth
                      label="Certifications (optional)"
                      value={listToString(profile.certifications)}
                      onChange={(e) => handleListChange('certifications', e.target.value)}
                      helperText="Comma-separated"
                    />
                  </Tooltip>
                </Grid>
              </Grid>
              <Tooltip title="Save professional details" arrow>
                <Button type="submit" variant="contained" sx={{ mt: 2, ...softActionSx }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Professional Details'}
                </Button>
              </Tooltip>
            </Box>
          )}

          {tabValue === 2 && (
            <Box component={motion.form} variants={sectionVariants} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Public email for contact (optional)" arrow>
                    <TextField
                      fullWidth
                      label="Public Contact Email"
                      name="contactEmail"
                      value={profile.contactEmail || ''}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Public phone number (optional)" arrow>
                    <TextField
                      fullWidth
                      label="Public Contact Phone"
                      name="contactPhone"
                      value={profile.contactPhone || ''}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Private phone for your account" arrow>
                    <TextField
                      fullWidth
                      label="Personal Phone"
                      name="phoneNumber"
                      value={profile.phoneNumber || ''}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Personal site or homepage" arrow>
                    <TextField
                      fullWidth
                      label="Website"
                      name="website"
                      value={profile.website || ''}
                      onChange={handleChange}
                      placeholder="https://"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <Tooltip title="Portfolio or case studies" arrow>
                    <TextField
                      fullWidth
                      label="Portfolio URL"
                      name="portfolioUrl"
                      value={profile.portfolioUrl || ''}
                      onChange={handleChange}
                      placeholder="https://"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="LinkedIn profile" arrow>
                    <TextField
                      fullWidth
                      label="LinkedIn"
                      value={profile.socialLinks?.linkedin || ''}
                      onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="GitHub profile" arrow>
                    <TextField
                      fullWidth
                      label="GitHub"
                      value={profile.socialLinks?.github || ''}
                      onChange={(e) => handleSocialChange('github', e.target.value)}
                      placeholder="https://github.com/..."
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="X / Twitter profile" arrow>
                    <TextField
                      fullWidth
                      label="X / Twitter"
                      value={profile.socialLinks?.twitter || ''}
                      onChange={(e) => handleSocialChange('twitter', e.target.value)}
                      placeholder="https://x.com/..."
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="Instagram profile" arrow>
                    <TextField
                      fullWidth
                      label="Instagram"
                      value={profile.socialLinks?.instagram || ''}
                      onChange={(e) => handleSocialChange('instagram', e.target.value)}
                      placeholder="https://instagram.com/..."
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title="YouTube channel" arrow>
                    <TextField
                      fullWidth
                      label="YouTube"
                      value={profile.socialLinks?.youtube || ''}
                      onChange={(e) => handleSocialChange('youtube', e.target.value)}
                      placeholder="https://youtube.com/..."
                    />
                  </Tooltip>
                </Grid>
              </Grid>
              <Tooltip title="Save contact information" arrow>
                <Button type="submit" variant="contained" sx={{ mt: 2, ...softActionSx }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Contact Info'}
                </Button>
              </Tooltip>
            </Box>
          )}

          {tabValue === 3 && (
            <Box component={motion.div} variants={sectionVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Tooltip title="Skills you want to highlight" arrow>
                  <Typography variant="h6">
                    Skills ({skills.length})
                  </Typography>
                </Tooltip>
                <Tooltip title="Add a new skill" arrow>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setSkillDialogOpen(true)}
                    sx={softActionSx}
                  >
                    Add Skill
                  </Button>
                </Tooltip>
              </Box>

              {skills.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No skills added yet. Add your skills to showcase your expertise.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {skills.map((skill) => (
                    <Grid item xs={12} sm={6} md={4} key={skill.id}>
                      <Card component={motion.div} variants={sectionVariants} sx={hoverCardSx} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              {skill.name}
                            </Typography>
                            <Tooltip title="Remove skill" arrow>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteSkill(skill.id)}
                                sx={softActionSx}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
                            <Tooltip title="Endorse this skill" arrow>
                              <Button
                                size="small"
                                startIcon={<ThumbUp />}
                                onClick={() => endorseSkill(skill.id)}
                                sx={softActionSx}
                              >
                                Endorse
                              </Button>
                            </Tooltip>
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
          <Tooltip title="Enter the skill name" arrow>
            <TextField
              fullWidth
              label="Skill Name"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              margin="normal"
              placeholder="e.g., JavaScript, Project Management, Design"
            />
          </Tooltip>

          <Tooltip title="Select a proficiency level" arrow>
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
          </Tooltip>
        </DialogContent>
        <DialogActions>
          <Tooltip title="Discard changes" arrow>
            <Button onClick={() => setSkillDialogOpen(false)} sx={softActionSx}>Cancel</Button>
          </Tooltip>
          <Tooltip title="Add this skill" arrow>
            <Button variant="contained" onClick={addSkill} sx={softActionSx}>Add Skill</Button>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Profile;
