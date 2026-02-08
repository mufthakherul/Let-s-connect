import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Avatar } from '@mui/material';

function Profile({ user }) {
  const [profile, setProfile] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: ''
  });

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    console.log('Update profile:', profile);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>

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
            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Profile;
