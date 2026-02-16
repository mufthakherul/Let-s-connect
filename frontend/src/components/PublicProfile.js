import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Avatar,
    Chip,
    Button,
    Stack,
    Divider,
    Tooltip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../utils/api';

function PublicProfile({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const [profileUser, setProfileUser] = useState(null);
    const [followingIds, setFollowingIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
        fetchFollowing();
    }, [id]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`/api/user/profile/${id}`, { headers });
            setProfileUser(response.data || null);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowing = async () => {
        try {
            if (!user?.id) return;
            const response = await api.get(`/content/follows/${user.id}`);
            setFollowingIds(response.data?.following || []);
        } catch (error) {
            console.error('Failed to load following list:', error);
        }
    };

    const handleToggleFollow = async () => {
        if (!user?.id || !profileUser?.id || user.id === profileUser.id) return;
        const isFollowing = followingIds.includes(profileUser.id);
        try {
            if (isFollowing) {
                await api.delete(`/content/follows/${profileUser.id}`);
                setFollowingIds((prev) => prev.filter((followId) => followId !== profileUser.id));
            } else {
                await api.post('/content/follows', { followedId: profileUser.id });
                setFollowingIds((prev) => [...prev, profileUser.id]);
            }
        } catch (error) {
            console.error('Failed to update follow state:', error);
        }
    };

    if (loading) {
        return (
            <Card sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">Loading profile...</Typography>
            </Card>
        );
    }

    if (!profileUser) {
        return (
            <Card sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">Profile not found.</Typography>
            </Card>
        );
    }

    const details = profileUser.Profile || {};
    const isFollowing = followingIds.includes(profileUser.id);

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
                        <Avatar
                            sx={{ width: 96, height: 96 }}
                            src={profileUser.avatar || undefined}
                        >
                            {(profileUser.firstName || 'U')[0]}{(profileUser.lastName || '')[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h5">
                                {profileUser.firstName} {profileUser.lastName}
                            </Typography>
                            {details.headline && (
                                <Typography variant="body1" color="text.secondary">
                                    {details.headline}
                                </Typography>
                            )}
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                <Chip size="small" label={`@${profileUser.username}`} />
                                {(details.city || details.country) && (
                                    <Chip size="small" label={`${details.city || ''}${details.city && details.country ? ', ' : ''}${details.country || ''}`} />
                                )}
                                {details.timezone && <Chip size="small" label={details.timezone} />}
                            </Stack>
                        </Box>
                        {user?.id && user.id !== profileUser.id && (
                            <Tooltip title={isFollowing ? 'Unfollow user' : 'Follow user'} arrow>
                                <Button variant={isFollowing ? 'outlined' : 'contained'} onClick={handleToggleFollow}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Button>
                            </Tooltip>
                        )}
                        {user?.id === profileUser.id && (
                            <Button variant="contained" onClick={() => navigate('/profile')}>Edit Profile</Button>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            <Stack spacing={2}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>About</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {profileUser.bio || details.bio || 'No bio added yet.'}
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Professional</Typography>
                        <Stack spacing={1}>
                            {details.company && <Typography variant="body2">Company: {details.company}</Typography>}
                            {details.jobTitle && <Typography variant="body2">Role: {details.jobTitle}</Typography>}
                            {details.industry && <Typography variant="body2">Industry: {details.industry}</Typography>}
                            {details.yearsExperience && <Typography variant="body2">Experience: {details.yearsExperience} years</Typography>}
                            {(!details.company && !details.jobTitle && !details.industry && !details.yearsExperience) && (
                                <Typography variant="body2" color="text.secondary">No professional details yet.</Typography>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Contact & Links</Typography>
                        <Stack spacing={1}>
                            {details.website && <Typography variant="body2">Website: {details.website}</Typography>}
                            {details.portfolioUrl && <Typography variant="body2">Portfolio: {details.portfolioUrl}</Typography>}
                            {details.socialLinks?.linkedin && <Typography variant="body2">LinkedIn: {details.socialLinks.linkedin}</Typography>}
                            {details.socialLinks?.github && <Typography variant="body2">GitHub: {details.socialLinks.github}</Typography>}
                            {(!details.website && !details.portfolioUrl && !details.socialLinks?.linkedin && !details.socialLinks?.github) && (
                                <Typography variant="body2" color="text.secondary">No public links shared.</Typography>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                <Divider />
            </Stack>
        </Box>
    );
}

export default PublicProfile;
