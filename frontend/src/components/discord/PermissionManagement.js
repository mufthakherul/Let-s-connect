import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
} from '@mui/material';
import {
  Info as InfoIcon,
  Security as SecurityIcon,
  Chat as ChatIcon,
  VolumeUp as VoiceIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// Permission categories and descriptions
const permissionCategories = {
  general: {
    label: 'General Server Permissions',
    icon: <SettingsIcon />,
    permissions: [
      { id: 'VIEW_CHANNEL', name: 'View Channels', description: 'Allows members to view channels' },
      { id: 'MANAGE_CHANNELS', name: 'Manage Channels', description: 'Allows members to create, edit, and delete channels' },
      { id: 'MANAGE_ROLES', name: 'Manage Roles', description: 'Allows members to create, edit, and delete roles' },
      { id: 'MANAGE_SERVER', name: 'Manage Server', description: 'Allows members to change server settings' },
      { id: 'CREATE_INVITE', name: 'Create Invite', description: 'Allows members to invite new people' },
      { id: 'MANAGE_WEBHOOKS', name: 'Manage Webhooks', description: 'Allows members to create, edit, and delete webhooks' },
    ],
  },
  membership: {
    label: 'Membership Permissions',
    icon: <PeopleIcon />,
    permissions: [
      { id: 'KICK_MEMBERS', name: 'Kick Members', description: 'Allows members to remove other members from the server' },
      { id: 'BAN_MEMBERS', name: 'Ban Members', description: 'Allows members to ban other members from the server' },
      { id: 'MANAGE_NICKNAMES', name: 'Manage Nicknames', description: 'Allows members to change their own and others\' nicknames' },
    ],
  },
  text: {
    label: 'Text Channel Permissions',
    icon: <ChatIcon />,
    permissions: [
      { id: 'SEND_MESSAGES', name: 'Send Messages', description: 'Allows members to send messages in text channels' },
      { id: 'MANAGE_MESSAGES', name: 'Manage Messages', description: 'Allows members to delete and pin messages' },
      { id: 'EMBED_LINKS', name: 'Embed Links', description: 'Links sent by members will be embedded' },
      { id: 'ATTACH_FILES', name: 'Attach Files', description: 'Allows members to upload files' },
      { id: 'ADD_REACTIONS', name: 'Add Reactions', description: 'Allows members to react to messages' },
      { id: 'MENTION_EVERYONE', name: 'Mention Everyone', description: 'Allows members to use @everyone or @here' },
      { id: 'USE_EXTERNAL_EMOJIS', name: 'Use External Emojis', description: 'Allows members to use emojis from other servers' },
    ],
  },
  voice: {
    label: 'Voice Channel Permissions',
    icon: <VoiceIcon />,
    permissions: [
      { id: 'CONNECT', name: 'Connect', description: 'Allows members to join voice channels' },
      { id: 'SPEAK', name: 'Speak', description: 'Allows members to speak in voice channels' },
      { id: 'VIDEO', name: 'Video', description: 'Allows members to share their video' },
      { id: 'MUTE_MEMBERS', name: 'Mute Members', description: 'Allows members to mute other members in voice channels' },
      { id: 'DEAFEN_MEMBERS', name: 'Deafen Members', description: 'Allows members to deafen other members in voice channels' },
      { id: 'MOVE_MEMBERS', name: 'Move Members', description: 'Allows members to move other members between voice channels' },
      { id: 'USE_VOICE_ACTIVITY', name: 'Use Voice Activity', description: 'Allows members to use voice activity detection' },
      { id: 'PRIORITY_SPEAKER', name: 'Priority Speaker', description: 'Allows members to be heard more easily' },
    ],
  },
  advanced: {
    label: 'Advanced Permissions',
    icon: <SecurityIcon />,
    permissions: [
      { id: 'ADMINISTRATOR', name: 'Administrator', description: 'Members with this permission have all permissions and bypass channel specific permissions' },
    ],
  },
};

/**
 * Permission Management Interface
 * Allows granular control over role permissions
 */
const PermissionManager = ({ role, onUpdate, onClose }) => {
  const [selectedPermissions, setSelectedPermissions] = useState(role?.permissions || []);
  const [hasAdministrator, setHasAdministrator] = useState(
    role?.permissions?.includes('ADMINISTRATOR') || false
  );

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((p) => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleAdministratorToggle = (event) => {
    const isAdmin = event.target.checked;
    setHasAdministrator(isAdmin);
    
    if (isAdmin) {
      // Add all permissions when administrator is enabled
      const allPermissions = Object.values(permissionCategories)
        .flatMap((category) => category.permissions.map((p) => p.id));
      setSelectedPermissions(allPermissions);
    }
  };

  const handleSave = () => {
    onUpdate({ ...role, permissions: selectedPermissions });
    toast.success('Permissions updated successfully');
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon />
          <Typography variant="h6">
            Edit Permissions for {role?.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Administrator Override */}
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'warning.main', color: 'warning.contrastText' }}>
          <FormControlLabel
            control={
              <Switch
                checked={hasAdministrator}
                onChange={handleAdministratorToggle}
                color="default"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  Administrator
                </Typography>
                <Typography variant="caption">
                  Members with this permission have every permission and also bypass all channel specific permissions.
                </Typography>
              </Box>
            }
          />
        </Paper>

        {/* Permission Categories */}
        <Box sx={{ opacity: hasAdministrator ? 0.5 : 1, pointerEvents: hasAdministrator ? 'none' : 'auto' }}>
          {Object.entries(permissionCategories).map(([key, category]) => {
            if (key === 'advanced') return null; // Skip advanced since we handle it separately
            
            return (
              <Box key={key} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {category.icon}
                  <Typography variant="h6">{category.label}</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                <FormGroup>
                  {category.permissions.map((permission) => (
                    <Box key={permission.id} sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">{permission.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  ))}
                </FormGroup>
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Role Hierarchy Visualization
 * Shows role positions and allows drag-and-drop reordering
 */
const RoleHierarchy = ({ roles, onReorder, onEditRole }) => {
  const [sortedRoles, setSortedRoles] = useState([]);

  useEffect(() => {
    // Sort roles by position (higher position = more powerful)
    const sorted = [...(roles || [])].sort((a, b) => (b.position || 0) - (a.position || 0));
    setSortedRoles(sorted);
  }, [roles]);

  const handleMoveUp = (index) => {
    if (index === 0) return;
    
    const newRoles = [...sortedRoles];
    const temp = newRoles[index - 1];
    newRoles[index - 1] = newRoles[index];
    newRoles[index] = temp;
    
    // Update positions
    newRoles.forEach((role, i) => {
      role.position = newRoles.length - i - 1;
    });
    
    setSortedRoles(newRoles);
    onReorder(newRoles);
  };

  const handleMoveDown = (index) => {
    if (index === sortedRoles.length - 1) return;
    
    const newRoles = [...sortedRoles];
    const temp = newRoles[index + 1];
    newRoles[index + 1] = newRoles[index];
    newRoles[index] = temp;
    
    // Update positions
    newRoles.forEach((role, i) => {
      role.position = newRoles.length - i - 1;
    });
    
    setSortedRoles(newRoles);
    onReorder(newRoles);
  };

  const getPermissionSummary = (role) => {
    if (role.permissions?.includes('ADMINISTRATOR')) {
      return 'Administrator (All Permissions)';
    }
    return `${role.permissions?.length || 0} permissions`;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SecurityIcon />
          <Typography variant="h6">Role Hierarchy</Typography>
          <Tooltip title="Roles higher in the list have more authority. They can manage roles below them.">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50}>Order</TableCell>
                <TableCell>Role Name</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRoles.map((role, index) => (
                <TableRow
                  key={role.id}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        ▲
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === sortedRoles.length - 1}
                      >
                        ▼
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: role.color || '#3498db',
                        }}
                      />
                      <Typography variant="body2" fontWeight="medium">
                        {role.name}
                      </Typography>
                      {role.permissions?.includes('ADMINISTRATOR') && (
                        <Chip label="Admin" size="small" color="error" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {getPermissionSummary(role)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{role.memberCount || 0}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => onEditRole(role)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Channel Permission Overrides
 * Manage specific permissions for channels
 */
const ChannelPermissionOverrides = ({ channel, roles, onUpdate }) => {
  const [overrides, setOverrides] = useState(channel?.permissionOverrides || {});
  const [selectedRole, setSelectedRole] = useState(null);

  const handleOverrideChange = (roleId, permissionId, value) => {
    setOverrides((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: value,
      },
    }));
  };

  const handleSave = () => {
    onUpdate({ ...channel, permissionOverrides: overrides });
    toast.success('Channel permissions updated');
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Channel Permission Overrides
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Override role permissions for this channel. Green = Allow, Red = Deny, Gray = Inherit from role.
        </Typography>

        <Box sx={{ mt: 2 }}>
          {/* Permission override UI would go here */}
          <Typography variant="caption" color="text.secondary">
            Select a role to configure channel-specific permissions
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          sx={{ mt: 2 }}
        >
          Save Overrides
        </Button>
      </CardContent>
    </Card>
  );
};

export { PermissionManager, RoleHierarchy, ChannelPermissionOverrides };
