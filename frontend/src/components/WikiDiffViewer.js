import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import CompareIcon from '@mui/icons-material/Compare';
import DiffIcon from '@mui/icons-material/Difference';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const WikiDiffViewer = () => {
    const [wikiId, setWikiId] = useState('');
    const [versions, setVersions] = useState([]);
    const [selectedFromVersion, setSelectedFromVersion] = useState(null);
    const [selectedToVersion, setSelectedToVersion] = useState(null);
    const [diff, setDiff] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('split'); // 'split' or 'unified'

    const handleCompareDiff = async () => {
        if (!wikiId || !selectedFromVersion || !selectedToVersion) {
            alert('Please select wiki and versions to compare');
            return;
        }

        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(
                `http://localhost:8000/wikis/${wikiId}/diff?from=${selectedFromVersion}&to=${selectedToVersion}`,
                {
                    headers: { 'x-user-id': userId }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setDiff(data);
            }
        } catch (error) {
            console.error('Failed to fetch diff:', error);
        } finally {
            setLoading(false);
        }
    };

    const DiffLine = ({ operation, text }) => {
        if (operation === 'equal') {
            return (
                <Box sx={{ p: 1, backgroundColor: '#fafafa', borderLeft: '3px solid #ddd' }}>
                    {text}
                </Box>
            );
        } else if (operation === 'insert') {
            return (
                <Box sx={{ p: 1, backgroundColor: '#c8e6c9', borderLeft: '3px solid #4caf50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AddIcon fontSize="small" sx={{ color: 'green' }} />
                        <span>{text}</span>
                    </Box>
                </Box>
            );
        } else if (operation === 'delete') {
            return (
                <Box sx={{ p: 1, backgroundColor: '#ffcdd2', borderLeft: '3px solid #f44336' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RemoveIcon fontSize="small" sx={{ color: 'red' }} />
                        <span style={{ textDecoration: 'line-through' }}>{text}</span>
                    </Box>
                </Box>
            );
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <DiffIcon sx={{ fontSize: 32 }} />
                <Typography variant="h4">Wiki Version Comparison</Typography>
            </Box>

            {/* Selection Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Compare Versions
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Wiki ID"
                            value={wikiId}
                            onChange={(e) => setWikiId(e.target.value)}
                            placeholder="Enter wiki ID to compare"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="From Version ID"
                            value={selectedFromVersion}
                            onChange={(e) => setSelectedFromVersion(e.target.value)}
                            placeholder="Earlier version"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="To Version ID"
                            value={selectedToVersion}
                            onChange={(e) => setSelectedToVersion(e.target.value)}
                            placeholder="Later version"
                        />
                    </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        startIcon={<CompareIcon />}
                        onClick={handleCompareDiff}
                        disabled={loading || !wikiId || !selectedFromVersion || !selectedToVersion}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Compare'}
                    </Button>

                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>View Mode</InputLabel>
                        <Select
                            value={viewMode}
                            label="View Mode"
                            onChange={(e) => setViewMode(e.target.value)}
                        >
                            <MenuItem value="split">Side-by-Side</MenuItem>
                            <MenuItem value="unified">Unified</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* Results Section */}
            {diff && (
                <Stack spacing={3}>
                    {/* Statistics */}
                    <Card>
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Chip
                                            icon={<AddIcon />}
                                            label={`${diff.stats.additions} Added`}
                                            color="success"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Chip
                                            icon={<RemoveIcon />}
                                            label={`${diff.stats.deletions} Removed`}
                                            color="error"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Chip
                                            label={`${diff.stats.changes} Total Changes`}
                                            variant="outlined"
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="body2" color="textSecondary">
                                            {(
                                                (diff.stats.deletions + diff.stats.additions) /
                                                (diff.stats.additions + diff.stats.deletions + 100 || 1)
                                            ).toFixed(1)}
                                            % Changed
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Diff View */}
                    {viewMode === 'unified' && (
                        <Paper elevation={2} sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                Unified Diff View
                            </Typography>
                            <Box
                                sx={{
                                    fontFamily: '"Courier New", monospace',
                                    fontSize: '0.9rem',
                                    overflowX: 'auto',
                                    maxHeight: '600px',
                                    overflowY: 'auto',
                                    backgroundColor: '#fafafa'
                                }}
                            >
                                <Stack spacing={0}>
                                    {diff.diffs.map((change, idx) => (
                                        <DiffLine key={idx} operation={change.type} text={change.text} />
                                    ))}
                                </Stack>
                            </Box>
                        </Paper>
                    )}

                    {viewMode === 'split' && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Paper elevation={2} sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'error.main' }}>
                                        Original Version (Removed)
                                    </Typography>
                                    <Box
                                        sx={{
                                            fontFamily: '"Courier New", monospace',
                                            fontSize: '0.85rem',
                                            overflowX: 'auto',
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            backgroundColor: '#ffebee'
                                        }}
                                    >
                                        <Stack spacing={0}>
                                            {diff.diffs
                                                .filter(change => change.type !== 'insert')
                                                .map((change, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            p: 1,
                                                            backgroundColor: change.type === 'delete' ? '#ffcdd2' : '#fafafa',
                                                            borderLeft: change.type === 'delete' ? '3px solid #f44336' : '3px solid #ddd',
                                                            textDecoration: change.type === 'delete' ? 'line-through' : 'none'
                                                        }}
                                                    >
                                                        {change.text}
                                                    </Box>
                                                ))}
                                        </Stack>
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Paper elevation={2} sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'success.main' }}>
                                        New Version (Added)
                                    </Typography>
                                    <Box
                                        sx={{
                                            fontFamily: '"Courier New", monospace',
                                            fontSize: '0.85rem',
                                            overflowX: 'auto',
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            backgroundColor: '#f1f8e9'
                                        }}
                                    >
                                        <Stack spacing={0}>
                                            {diff.diffs
                                                .filter(change => change.type !== 'delete')
                                                .map((change, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            p: 1,
                                                            backgroundColor: change.type === 'insert' ? '#c8e6c9' : '#fafafa',
                                                            borderLeft: change.type === 'insert' ? '3px solid #4caf50' : '3px solid #ddd'
                                                        }}
                                                    >
                                                        {change.text}
                                                    </Box>
                                                ))}
                                        </Stack>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}

                    {/* Detailed Changes Table */}
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Change Details
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell>Operation</TableCell>
                                        <TableCell>Text</TableCell>
                                        <TableCell align="right">Length</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {diff.diffs.map((change, idx) => (
                                        <TableRow
                                            key={idx}
                                            sx={{
                                                backgroundColor:
                                                    change.type === 'insert'
                                                        ? '#c8e6c9'
                                                        : change.type === 'delete'
                                                            ? '#ffcdd2'
                                                            : '#fafafa'
                                            }}
                                        >
                                            <TableCell>
                                                <Chip
                                                    label={change.type.toUpperCase()}
                                                    size="small"
                                                    color={
                                                        change.type === 'insert' ? 'success' : change.type === 'delete' ? 'error' : 'default'
                                                    }
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <code>{change.text.substring(0, 100)}</code>
                                            </TableCell>
                                            <TableCell align="right">{change.text.length}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}

            {!diff && !loading && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <DiffIcon sx={{ fontSize: 48, color: 'textSecondary', mb: 1 }} />
                    <Typography color="textSecondary">
                        Select versions and click "Compare" to see the differences
                    </Typography>
                </Paper>
            )}
        </Container>
    );
};

export default WikiDiffViewer;
