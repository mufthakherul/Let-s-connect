import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Avatar,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import {
  Flag,
  CheckCircle,
  Cancel,
  Visibility,
  Delete,
  Warning,
  Info,
  Refresh,
  FilterList,
  Search
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * ModerationQueuePanel - Streamlined content moderation interface
 * Features:
 * - Quick action buttons for approve/reject
 * - Batch operations
 * - Filter by priority, type, status
 * - Preview content before action
 */
const ModerationQueuePanel = () => {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSelected, setBatchSelected] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        status: filterStatus,
        type: filterType !== 'all' ? filterType : undefined,
        search: searchQuery || undefined
      };

      const response = await api.get('/user/admin/flags', { params });
      setFlags(response.data.flags || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch flags:', error);
      toast.error('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [page, rowsPerPage, filterStatus, filterType]);

  const handleResolve = async (flagId, action, resolutionText) => {
    try {
      await api.post(`/user/admin/flags/${flagId}/resolve`, {
        action,
        resolution: resolutionText
      });

      toast.success(`Flag ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchFlags();
      setDialogOpen(false);
      setSelectedFlag(null);
      setResolution('');
    } catch (error) {
      console.error('Failed to resolve flag:', error);
      toast.error('Failed to resolve flag');
    }
  };

  const handleBatchAction = async (action) => {
    if (batchSelected.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      await Promise.all(
        batchSelected.map(id => 
          api.post(`/user/admin/flags/${id}/resolve`, { action })
        )
      );

      toast.success(`${batchSelected.length} flags ${action}d successfully`);
      setBatchSelected([]);
      fetchFlags();
    } catch (error) {
      console.error('Batch action failed:', error);
      toast.error('Batch action failed');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'spam': return '🗑️';
      case 'harassment': return '⚠️';
      case 'inappropriate': return '🚫';
      case 'misinformation': return 'ℹ️';
      case 'copyright': return '©️';
      default: return '🚩';
    }
  };

  const priorityFilters = [
    { label: 'All', value: 'all', count: totalCount },
    { label: 'Pending', value: 'pending', count: flags.filter(f => f.status === 'pending').length },
    { label: 'Resolved', value: 'resolved', count: flags.filter(f => f.status === 'resolved').length }
  ];

  return (
    <Card>
      <CardContent>
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="600">
              Moderation Queue
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchFlags}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
              {batchSelected.length > 0 && (
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleBatchAction('approve')}
                  >
                    Approve ({batchSelected.length})
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleBatchAction('reject')}
                  >
                    Reject ({batchSelected.length})
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          {/* Tabs for quick filtering */}
          <Tabs value={currentTab} onChange={(e, v) => { setCurrentTab(v); setFilterStatus(priorityFilters[v].value); }}>
            {priorityFilters.map((filter, index) => (
              <Tab
                key={index}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {filter.label}
                    <Chip label={filter.count} size="small" />
                  </Box>
                }
              />
            ))}
          </Tabs>

          {/* Filters */}
          <Stack direction="row" spacing={2} mt={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="spam">Spam</MenuItem>
                <MenuItem value="harassment">Harassment</MenuItem>
                <MenuItem value="inappropriate">Inappropriate</MenuItem>
                <MenuItem value="misinformation">Misinformation</MenuItem>
                <MenuItem value="copyright">Copyright</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search by reporter, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchFlags()}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={fetchFlags}>
                    <Search fontSize="small" />
                  </IconButton>
                )
              }}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>

        {/* Flags Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBatchSelected(flags.map(f => f._id));
                      } else {
                        setBatchSelected([]);
                      }
                    }}
                    checked={batchSelected.length === flags.length && flags.length > 0}
                  />
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : flags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="info">No flags found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  flags.map((flag) => (
                    <TableRow
                      key={flag._id}
                      component={motion.tr}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      hover
                    >
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={batchSelected.includes(flag._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchSelected([...batchSelected, flag._id]);
                            } else {
                              setBatchSelected(batchSelected.filter(id => id !== flag._id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <span style={{ fontSize: '1.2em' }}>{getTypeIcon(flag.type)}</span>
                          <Typography variant="body2">{flag.type || 'Unknown'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {flag.content || flag.reason || 'No details'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                            {flag.reporter?.username?.[0] || 'U'}
                          </Avatar>
                          <Typography variant="body2">{flag.reporter?.username || 'Anonymous'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={flag.severity || 'medium'}
                          size="small"
                          color={getSeverityColor(flag.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(flag.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedFlag(flag);
                                setDialogOpen(true);
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {flag.status === 'pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleResolve(flag._id, 'approve', 'Approved')}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleResolve(flag._id, 'reject', 'Rejected')}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </CardContent>

      {/* Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Flag Details</DialogTitle>
        <DialogContent>
          {selectedFlag && (
            <Box>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Chip label={selectedFlag.type} size="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                  <Chip
                    label={selectedFlag.severity}
                    size="small"
                    color={getSeverityColor(selectedFlag.severity)}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                  <Typography variant="body2">{selectedFlag.reason || 'No reason provided'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Content</Typography>
                  <Typography variant="body2">{selectedFlag.content || 'No content'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Reporter</Typography>
                  <Typography variant="body2">{selectedFlag.reporter?.username || 'Anonymous'}</Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Resolution Notes"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Add notes about your decision..."
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {selectedFlag?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleResolve(selectedFlag._id, 'reject', resolution)}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleResolve(selectedFlag._id, 'approve', resolution)}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ModerationQueuePanel;
