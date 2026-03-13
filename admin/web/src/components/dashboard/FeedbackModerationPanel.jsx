import React, { useEffect, useState } from 'react';
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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Stack,
    Chip,
    Tooltip
} from '@mui/material';
import { CheckCircle, Cancel, Refresh, Verified } from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const FeedbackModerationPanel = () => {
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('approve');
    const [reason, setReason] = useState('');
    const [markVerified, setMarkVerified] = useState(true);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const res = await api.get('/user/admin/feedback/pending', {
                params: { page: page + 1, limit: rowsPerPage }
            });
            setFeedback(res.data.data.pending || []);
            setTotal(res.data.data.total || 0);
        } catch (err) {
            console.error('Failed to load feedback moderation queue:', err);
            toast.error('Failed to load feedback queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, [page, rowsPerPage]);

    const openActionDialog = (item, type) => {
        setSelectedItem(item);
        setActionType(type);
        setReason('');
        setMarkVerified(true);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setSelectedItem(null);
    };

    const handleConfirm = async () => {
        if (!selectedItem) return;

        const endpoint = `/user/admin/feedback/${selectedItem.id}/${actionType}`;
        const payload = {};

        if (actionType === 'approve') {
            payload.verified = markVerified;
            payload.reason = reason || 'Approved by moderator';
        } else {
            payload.reason = reason || 'Rejected by moderator';
        }

        try {
            await api.post(endpoint, payload);
            toast.success(`Feedback ${actionType}d successfully`);
            fetchFeedback();
            closeDialog();
        } catch (err) {
            console.error(`Failed to ${actionType} feedback:`, err);
            toast.error(`Failed to ${actionType} feedback`);
        }
    };

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Feedback Moderation
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={fetchFeedback}>
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Chip label={`Pending: ${total}`} color="primary" size="small" />
                    </Stack>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Submitted</TableCell>
                                <TableCell>From</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Message</TableCell>
                                <TableCell>Rating</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(loading ? Array.from({ length: rowsPerPage }) : feedback).map((item, idx) => {
                                if (loading) {
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading...
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            {new Date(item.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {item.displayName || 'Community Member'}
                                            {item.userId && (
                                                <Tooltip title="Submitted by registered user">
                                                    <Verified fontSize="small" sx={{ ml: 0.5, color: 'success.main' }} />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={item.category} size="small" />
                                        </TableCell>
                                        <TableCell>{item.subject}</TableCell>
                                        <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.message}
                                        </TableCell>
                                        <TableCell>{typeof item.rating === 'number' ? item.rating.toFixed(1) : '-'}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckCircle fontSize="small" />}
                                                    onClick={() => openActionDialog(item, 'approve')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<Cancel fontSize="small" />}
                                                    onClick={() => openActionDialog(item, 'reject')}
                                                >
                                                    Reject
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(event, value) => setPage(value)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                />

                <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                    <DialogTitle>{actionType === 'approve' ? 'Approve Feedback' : 'Reject Feedback'}</DialogTitle>
                    <DialogContent>
                        {selectedItem && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    {selectedItem.subject}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {selectedItem.message}
                                </Typography>
                            </Box>
                        )}
                        {actionType === 'approve' && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Verified fontSize="small" />
                                    <Typography variant="body2" fontWeight={600}>
                                        Mark as verified
                                    </Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Verified testimonials appear with a badge on the landing page.
                                </Typography>
                                <Button
                                    size="small"
                                    variant={markVerified ? 'contained' : 'outlined'}
                                    onClick={() => setMarkVerified((v) => !v)}
                                >
                                    {markVerified ? 'Verified' : 'Not verified'}
                                </Button>
                            </Box>
                        )}
                        <TextField
                            label="Moderator note"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Optional note (e.g., why this was approved/rejected)"
                            variant="outlined"
                            sx={{ mt: 1 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDialog}>Cancel</Button>
                        <Button variant="contained" onClick={handleConfirm}>
                            {actionType === 'approve' ? 'Approve' : 'Reject'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default FeedbackModerationPanel;
