import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider
} from '@mui/material';
import {
  History,
  RestorePage,
  Visibility,
  CompareArrows,
  Close,
  Edit,
  Person,
  AccessTime
} from '@mui/icons-material';
import { formatRelativeTime } from '../utils/helpers';
import api from '../utils/api';
import toast from 'react-hot-toast';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Universal Content History Viewer
 * Supports: posts, blogs, videos, wikis, docs, projects, pages, images, comments
 */
const ContentHistoryViewer = ({ 
  contentType = 'posts', // posts, blogs, videos, wikis, docs, projects, pages, images
  contentId, 
  open, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [currentContent, setCurrentContent] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState([null, null]);
  const [diff, setDiff] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');

  // Friendly names for content types
  const contentTypeNames = {
    posts: 'Post',
    blogs: 'Blog',
    videos: 'Video',
    wikis: 'Wiki',
    docs: 'Document',
    projects: 'Project',
    pages: 'Page',
    images: 'Image',
    comments: 'Comment'
  };

  const contentTypeName = contentTypeNames[contentType] || 'Content';

  useEffect(() => {
    if (open && contentId) {
      loadVersionHistory();
    }
  }, [open, contentId, contentType]);

  const loadVersionHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/content/${contentType}/${contentId}/versions`);
      setVersions(response.data.versions || []);
      setCurrentContent(response.data.content);
    } catch (error) {
      console.error('Failed to load version history:', error);
      setError(error.response?.data?.error || 'Failed to load version history');
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewVersion = async (versionNumber) => {
    try {
      const response = await api.get(`/content/${contentType}/${contentId}/versions/${versionNumber}`);
      setSelectedVersion(response.data);
      setTabValue(1);
    } catch (error) {
      console.error('Failed to load version:', error);
      toast.error('Failed to load version details');
    }
  };

  const handleCompare = async () => {
    if (!compareVersions[0] || !compareVersions[1]) {
      toast.error('Please select two versions to compare');
      return;
    }

    try {
      const response = await api.get(
        `/content/${contentType}/${contentId}/versions/compare/${compareVersions[0]}/${compareVersions[1]}`
      );
      setDiff(response.data);
      setTabValue(2);
    } catch (error) {
      console.error('Failed to compare versions:', error);
      toast.error('Failed to compare versions');
    }
  };

  const handleRestore = async (versionNumber) => {
    if (!window.confirm(`Are you sure you want to restore version ${versionNumber}? This will create a new version with the restored content.`)) {
      return;
    }

    try {
      await api.post(`/content/${contentType}/${contentId}/versions/${versionNumber}/restore`);
      toast.success('Version restored successfully!');
      loadVersionHistory();
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast.error(error.response?.data?.error || 'Failed to restore version');
    }
  };

  const handleSelectCompareVersion = (versionNumber, slot) => {
    const newCompareVersions = [...compareVersions];
    newCompareVersions[slot] = versionNumber;
    setCompareVersions(newCompareVersions);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History />
            <Typography variant="h6">{contentTypeName} Edit History</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label={`Timeline (${versions.length})`} />
                <Tab label="Version Details" disabled={!selectedVersion} />
                <Tab label="Compare" />
              </Tabs>
            </Box>

            {/* Timeline Tab */}
            <TabPanel value={tabValue} index={0}>
              {versions.length === 0 ? (
                <Alert severity="info">
                  No edit history available. This post has not been edited yet.
                </Alert>
              ) : (
                <Timeline>
                  {/* Current Version */}
                  {currentContent && (
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary">
                        <Typography variant="caption">Current</Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="primary" />
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <Chip label="Latest" color="primary" size="small" />
                            </Stack>
                            <Typography variant="body2" noWrap>
                              {currentContent.currentContent?.substring(0, 100)}...
                            </Typography>
                          </CardContent>
                        </Card>
                      </TimelineContent>
                    </TimelineItem>
                  )}

                  {/* Version History */}
                  {versions.map((version, index) => (
                    <TimelineItem key={version.id}>
                      <TimelineOppositeContent color="text.secondary">
                        <Typography variant="caption">
                          {formatRelativeTime(version.createdAt)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          v{version.versionNumber}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={index === 0 ? 'secondary' : 'grey'} />
                        {index < versions.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <Edit fontSize="small" />
                              <Typography variant="subtitle2">
                                {version.editReason || 'Edit'}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {version.content?.substring(0, 100)}...
                            </Typography>
                            <Stack direction="row" spacing={1} mt={2}>
                              <Tooltip title="View details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewVersion(version.versionNumber)}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Restore this version">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRestore(version.versionNumber)}
                                  color="primary"
                                >
                                  <RestorePage fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {compareMode ? (
                                <>
                                  <Button
                                    size="small"
                                    variant={compareVersions[0] === version.versionNumber ? 'contained' : 'outlined'}
                                    onClick={() => handleSelectCompareVersion(version.versionNumber, 0)}
                                  >
                                    Select A
                                  </Button>
                                  <Button
                                    size="small"
                                    variant={compareVersions[1] === version.versionNumber ? 'contained' : 'outlined'}
                                    onClick={() => handleSelectCompareVersion(version.versionNumber, 1)}
                                  >
                                    Select B
                                  </Button>
                                </>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}

              {!compareMode && versions.length > 1 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    startIcon={<CompareArrows />}
                    onClick={() => setCompareMode(true)}
                    variant="outlined"
                  >
                    Compare Versions
                  </Button>
                </Box>
              )}

              {compareMode && (
                <Box sx={{ textAlign: 'center', mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Select two versions to compare (A and B)
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center" mt={1}>
                    <Button onClick={() => setCompareMode(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      startIcon={<CompareArrows />}
                      onClick={handleCompare}
                      disabled={!compareVersions[0] || !compareVersions[1]}
                    >
                      Compare Selected
                    </Button>
                  </Stack>
                </Box>
              )}
            </TabPanel>

            {/* Version Details Tab */}
            <TabPanel value={tabValue} index={1}>
              {selectedVersion && (
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Version {selectedVersion.versionNumber}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {formatRelativeTime(selectedVersion.createdAt)}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Content:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedVersion.content}
                        </Typography>
                      </Paper>
                    </Box>

                    {selectedVersion.editReason && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Edit Reason:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedVersion.editReason}
                        </Typography>
                      </Box>
                    )}

                    {selectedVersion.changesSummary && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Changes Summary:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedVersion.changesSummary}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setSelectedVersion(null)}
                      >
                        Close
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<RestorePage />}
                        onClick={() => handleRestore(selectedVersion.versionNumber)}
                      >
                        Restore This Version
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              )}
            </TabPanel>

            {/* Compare Tab */}
            <TabPanel value={tabValue} index={2}>
              {diff && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Comparing Version {diff.version1.versionNumber} with Version {diff.version2.versionNumber}
                  </Alert>

                  <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Content Changes:
                      </Typography>
                      {diff.diff.content.changed ? (
                        <Box>
                          <Box sx={{ mb: 2 }}>
                            <Chip label="Version A" size="small" sx={{ mb: 1 }} />
                            <Paper sx={{ p: 2, bgcolor: 'error.lighter' }}>
                              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                {diff.diff.content.old}
                              </Typography>
                            </Paper>
                          </Box>
                          <Box>
                            <Chip label="Version B" size="small" color="primary" sx={{ mb: 1 }} />
                            <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
                              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                {diff.diff.content.new}
                              </Typography>
                            </Paper>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No changes in content
                        </Typography>
                      )}
                    </Paper>

                    {diff.diff.mediaUrls.changed && (
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Media Changes:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Media files changed between versions
                        </Typography>
                      </Paper>
                    )}
                  </Stack>
                </Box>
              )}
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentHistoryViewer;
