import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Gavel as GavelIcon,
    Security as SecurityIcon,
    Verified as VerifiedIcon,
    Warning as WarningIcon,
    FileDownload as DownloadIcon,
    Shield as ShieldIcon,
    Assignment as AssignmentIcon,
    Flag as FlagIcon,
} from '@mui/icons-material';
import api from '../../utils/api';

function GovernanceTools({ meetingId, user, participant }) {
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // State for each section
    const [rolePermissions, setRolePermissions] = useState([]);
    const [auditTrail, setAuditTrail] = useState([]);
    const [redactions, setRedactions] = useState([]);
    const [consents, setConsents] = useState([]);
    const [rulesets, setRulesets] = useState([]);
    const [moderationActions, setModerationActions] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [exports, setExports] = useState([]);

    // Dialog states
    const [permissionDialog, setPermissionDialog] = useState(false);
    const [redactionDialog, setRedactionDialog] = useState(false);
    const [consentDialog, setConsentDialog] = useState(false);
    const [rulesetDialog, setRulesetDialog] = useState(false);
    const [moderationDialog, setModerationDialog] = useState(false);
    const [disputeDialog, setDisputeDialog] = useState(false);
    const [exportDialog, setExportDialog] = useState(false);

    // Form states
    const [permissionForm, setPermissionForm] = useState({
        role: 'participant',
        permissions: [],
        restrictions: {}
    });

    const [redactionForm, setRedactionForm] = useState({
        contentType: 'transcript',
        contentId: '',
        reason: '',
        redactionType: 'partial',
        originalContent: '',
        redactedContent: ''
    });

    const [consentForm, setConsentForm] = useState({
        consentType: 'recording',
        granted: true
    });

    const [rulesetForm, setRulesetForm] = useState({
        name: '',
        description: '',
        rules: {
            timeLimits: { speakingTime: 300, questionTime: 120 },
            civilityRules: { warningsBeforeRemoval: 3 },
            evidenceRules: { requireSources: true }
        },
        isActive: true
    });

    const [moderationForm, setModerationForm] = useState({
        targetUserId: '',
        actionType: 'warning',
        reason: '',
        duration: 0,
        newRole: ''
    });

    const [disputeForm, setDisputeForm] = useState({
        targetType: 'participant',
        targetId: '',
        reason: '',
        description: ''
    });

    const [exportForm, setExportForm] = useState({
        exportType: 'full',
        format: 'bundle',
        includeRedactions: true,
        includeAuditTrail: true
    });

    const isModeratorOrHost = participant && ['host', 'moderator'].includes(participant.role);

    useEffect(() => {
        if (meetingId) {
            loadData();
        }
    }, [meetingId, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            switch (activeTab) {
                case 0: // Permissions
                    const permsRes = await api.get(`/collaboration/meetings/${meetingId}/role-permissions`);
                    setRolePermissions(permsRes.data);
                    break;
                case 1: // Audit Trail
                    const auditRes = await api.get(`/collaboration/meetings/${meetingId}/audit-trail`);
                    setAuditTrail(auditRes.data.trail || []);
                    break;
                case 2: // Redactions
                    const redactRes = await api.get(`/collaboration/meetings/${meetingId}/redactions`);
                    setRedactions(redactRes.data);
                    break;
                case 3: // Consents
                    const consentRes = await api.get(`/collaboration/meetings/${meetingId}/consent`);
                    setConsents(consentRes.data);
                    break;
                case 4: // Rulesets
                    const rulesetRes = await api.get(`/collaboration/meetings/${meetingId}/rulesets`);
                    setRulesets(rulesetRes.data);
                    break;
                case 5: // Moderation
                    const modRes = await api.get(`/collaboration/meetings/${meetingId}/moderation/actions`);
                    setModerationActions(modRes.data);
                    break;
                case 6: // Disputes
                    const disputeRes = await api.get(`/collaboration/meetings/${meetingId}/disputes`);
                    setDisputes(disputeRes.data);
                    break;
                case 7: // Templates (global)
                    const templateRes = await api.get('/collaboration/meeting-templates');
                    setTemplates(templateRes.data);
                    break;
                case 8: // Exports
                    const exportRes = await api.get(`/collaboration/meetings/${meetingId}/compliance-exports`);
                    setExports(exportRes.data);
                    break;
                default:
                    break;
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePermission = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/role-permissions`, permissionForm);
            setSuccess('Permission updated successfully');
            setPermissionDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update permission');
        }
    };

    const handleCreateRedaction = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/redactions`, redactionForm);
            setSuccess('Content redacted successfully');
            setRedactionDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create redaction');
        }
    };

    const handleUpdateConsent = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/consent`, consentForm);
            setSuccess('Consent updated successfully');
            setConsentDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update consent');
        }
    };

    const handleCreateRuleset = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/rulesets`, rulesetForm);
            setSuccess('Ruleset created successfully');
            setRulesetDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create ruleset');
        }
    };

    const handleIssueModeration = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/moderation/actions`, moderationForm);
            setSuccess('Moderation action issued successfully');
            setModerationDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to issue moderation action');
        }
    };

    const handleCreateDispute = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/disputes`, disputeForm);
            setSuccess('Dispute flag created successfully');
            setDisputeDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create dispute');
        }
    };

    const handleRequestExport = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/compliance-export`, exportForm);
            setSuccess('Export requested successfully');
            setExportDialog(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request export');
        }
    };

    const handleResolveDispute = async (disputeId, status, resolution) => {
        try {
            setError('');
            await api.put(`/collaboration/meetings/${meetingId}/disputes/${disputeId}`, {
                status,
                resolution
            });
            setSuccess('Dispute resolved successfully');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resolve dispute');
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                <ShieldIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Governance & Safety Tools
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

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }} variant="scrollable">
                <Tab label="Permissions" />
                <Tab label="Audit Trail" />
                <Tab label="Redactions" />
                <Tab label="Consents" />
                <Tab label="Rulesets" />
                <Tab label="Moderation" />
                <Tab label="Disputes" />
                <Tab label="Templates" />
                <Tab label="Exports" />
            </Tabs>

            {/* Permissions Tab */}
            {activeTab === 0 && (
                <Box>
                    {isModeratorOrHost && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setPermissionDialog(true)}
                            sx={{ mb: 2 }}
                        >
                            Set Role Permissions
                        </Button>
                    )}
                    <Grid container spacing={2}>
                        {rolePermissions.map((perm) => (
                            <Grid item xs={12} md={6} key={perm.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">{perm.role}</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                            {perm.permissions.map((p) => (
                                                <Chip key={p} label={p} size="small" color="primary" />
                                            ))}
                                        </Stack>
                                        {perm.restrictions && Object.keys(perm.restrictions).length > 0 && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Restrictions: {JSON.stringify(perm.restrictions)}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 1 && (
                <Box>
                    <Stack spacing={1}>
                        {auditTrail.length > 0 && (
                            <Alert severity="info" icon={<VerifiedIcon />}>
                                Trail Integrity: Verified ({auditTrail.length} entries)
                            </Alert>
                        )}
                        {auditTrail.map((entry) => (
                            <Paper key={entry.id} sx={{ p: 2 }}>
                                <Grid container alignItems="center" spacing={2}>
                                    <Grid item xs={1}>
                                        <Chip label={`#${entry.sequenceNumber}`} size="small" />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="body2" fontWeight="bold">
                                            {entry.action}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={5}>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.entityType && `${entry.entityType}: ${entry.entityId}`}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(entry.timestamp).toLocaleString()}
                                        </Typography>
                                    </Grid>
                                </Grid>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontFamily: 'monospace' }}>
                                    Hash: {entry.currentHash?.substring(0, 16)}...
                                </Typography>
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Redactions Tab */}
            {activeTab === 2 && (
                <Box>
                    {isModeratorOrHost && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setRedactionDialog(true)}
                            sx={{ mb: 2 }}
                        >
                            Create Redaction
                        </Button>
                    )}
                    <Grid container spacing={2}>
                        {redactions.map((redaction) => (
                            <Grid item xs={12} key={redaction.id}>
                                <Card>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="h6">
                                                    {redaction.contentType} - {redaction.redactionType}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Reason: {redaction.reason}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Redacted: {new Date(redaction.redactedAt).toLocaleString()}
                                                </Typography>
                                            </Box>
                                            <Chip label={redaction.contentType} color="warning" />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Consents Tab */}
            {activeTab === 3 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setConsentDialog(true)}
                        sx={{ mb: 2 }}
                    >
                        Manage Consent
                    </Button>
                    <Grid container spacing={2}>
                        {consents.map((consent) => (
                            <Grid item xs={12} md={6} key={consent.id}>
                                <Card>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="h6">{consent.consentType}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Granted: {new Date(consent.grantedAt).toLocaleString()}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={consent.granted ? 'Granted' : 'Revoked'}
                                                color={consent.granted ? 'success' : 'error'}
                                                icon={consent.granted ? <CheckIcon /> : <CloseIcon />}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Rulesets Tab */}
            {activeTab === 4 && (
                <Box>
                    {isModeratorOrHost && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setRulesetDialog(true)}
                            sx={{ mb: 2 }}
                        >
                            Create Ruleset
                        </Button>
                    )}
                    <Grid container spacing={2}>
                        {rulesets.map((ruleset) => (
                            <Grid item xs={12} key={ruleset.id}>
                                <Card>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="h6">{ruleset.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {ruleset.description}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Rules: {JSON.stringify(ruleset.rules)}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={ruleset.isActive ? 'Active' : 'Inactive'}
                                                color={ruleset.isActive ? 'success' : 'default'}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Moderation Tab */}
            {activeTab === 5 && (
                <Box>
                    {isModeratorOrHost && (
                        <Button
                            variant="contained"
                            startIcon={<GavelIcon />}
                            onClick={() => setModerationDialog(true)}
                            sx={{ mb: 2 }}
                            color="warning"
                        >
                            Issue Moderation Action
                        </Button>
                    )}
                    <Stack spacing={2}>
                        {moderationActions.map((action) => (
                            <Card key={action.id}>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={3}>
                                            <Chip label={action.actionType} color="warning" icon={<WarningIcon />} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2">
                                                <strong>Reason:</strong> {action.reason}
                                            </Typography>
                                            {action.duration && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Duration: {action.duration}s
                                                </Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(action.issuedAt).toLocaleString()}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Disputes Tab */}
            {activeTab === 6 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<FlagIcon />}
                        onClick={() => setDisputeDialog(true)}
                        sx={{ mb: 2 }}
                        color="error"
                    >
                        Flag Dispute
                    </Button>
                    <Stack spacing={2}>
                        {disputes.map((dispute) => (
                            <Card key={dispute.id}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6">{dispute.reason}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {dispute.description}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Target: {dispute.targetType} ({dispute.targetId})
                                            </Typography>
                                        </Box>
                                        <Stack direction="column" spacing={1} alignItems="flex-end">
                                            <Chip label={dispute.status} color={dispute.status === 'resolved' ? 'success' : 'warning'} />
                                            {isModeratorOrHost && dispute.status === 'pending' && (
                                                <Button
                                                    size="small"
                                                    onClick={() => {
                                                        const resolution = prompt('Enter resolution:');
                                                        if (resolution) {
                                                            handleResolveDispute(dispute.id, 'resolved', resolution);
                                                        }
                                                    }}
                                                >
                                                    Resolve
                                                </Button>
                                            )}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Templates Tab */}
            {activeTab === 7 && (
                <Box>
                    <Grid container spacing={2}>
                        {templates.map((template) => (
                            <Grid item xs={12} md={6} key={template.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">{template.name}</Typography>
                                        <Chip label={template.category} size="small" sx={{ mt: 1 }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {template.description}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Used {template.usageCount} times
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Exports Tab */}
            {activeTab === 8 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => setExportDialog(true)}
                        sx={{ mb: 2 }}
                    >
                        Request Export
                    </Button>
                    <Stack spacing={2}>
                        {exports.map((exp) => (
                            <Card key={exp.id}>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6">
                                                {exp.exportType} ({exp.format})
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Chip label={exp.status} color={exp.status === 'completed' ? 'success' : 'info'} />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            {exp.status === 'completed' && exp.fileUrl && (
                                                <Button size="small" href={exp.fileUrl} download>
                                                    Download
                                                </Button>
                                            )}
                                        </Grid>
                                    </Grid>
                                    <Typography variant="caption" color="text.secondary">
                                        Requested: {new Date(exp.createdAt).toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Dialogs */}
            
            {/* Permission Dialog */}
            <Dialog open={permissionDialog} onClose={() => setPermissionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Set Role Permissions</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={permissionForm.role}
                            onChange={(e) => setPermissionForm({ ...permissionForm, role: e.target.value })}
                        >
                            <MenuItem value="host">Host</MenuItem>
                            <MenuItem value="moderator">Moderator</MenuItem>
                            <MenuItem value="participant">Participant</MenuItem>
                            <MenuItem value="guest">Guest</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Permissions (comma-separated)"
                        value={permissionForm.permissions.join(', ')}
                        onChange={(e) => setPermissionForm({
                            ...permissionForm,
                            permissions: e.target.value.split(',').map(p => p.trim()).filter(p => p)
                        })}
                        sx={{ mt: 2 }}
                        helperText="e.g., speak, submit_evidence, vote, moderate"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermissionDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreatePermission} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Redaction Dialog */}
            <Dialog open={redactionDialog} onClose={() => setRedactionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Redaction</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Content Type</InputLabel>
                        <Select
                            value={redactionForm.contentType}
                            onChange={(e) => setRedactionForm({ ...redactionForm, contentType: e.target.value })}
                        >
                            <MenuItem value="transcript">Transcript</MenuItem>
                            <MenuItem value="recording">Recording</MenuItem>
                            <MenuItem value="note">Note</MenuItem>
                            <MenuItem value="evidence">Evidence</MenuItem>
                            <MenuItem value="message">Message</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Content ID"
                        value={redactionForm.contentId}
                        onChange={(e) => setRedactionForm({ ...redactionForm, contentId: e.target.value })}
                        sx={{ mt: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Reason"
                        value={redactionForm.reason}
                        onChange={(e) => setRedactionForm({ ...redactionForm, reason: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Redaction Type</InputLabel>
                        <Select
                            value={redactionForm.redactionType}
                            onChange={(e) => setRedactionForm({ ...redactionForm, redactionType: e.target.value })}
                        >
                            <MenuItem value="full">Full</MenuItem>
                            <MenuItem value="partial">Partial</MenuItem>
                            <MenuItem value="blur">Blur</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRedactionDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateRedaction} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Consent Dialog */}
            <Dialog open={consentDialog} onClose={() => setConsentDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Manage Consent</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Consent Type</InputLabel>
                        <Select
                            value={consentForm.consentType}
                            onChange={(e) => setConsentForm({ ...consentForm, consentType: e.target.value })}
                        >
                            <MenuItem value="recording">Recording</MenuItem>
                            <MenuItem value="transcript">Transcript</MenuItem>
                            <MenuItem value="export">Export</MenuItem>
                            <MenuItem value="sharing">Sharing</MenuItem>
                            <MenuItem value="archival">Archival</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={consentForm.granted}
                                onChange={(e) => setConsentForm({ ...consentForm, granted: e.target.checked })}
                            />
                        }
                        label="Grant Consent"
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConsentDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateConsent} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Ruleset Dialog */}
            <Dialog open={rulesetDialog} onClose={() => setRulesetDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Ruleset</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Name"
                        value={rulesetForm.name}
                        onChange={(e) => setRulesetForm({ ...rulesetForm, name: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={rulesetForm.description}
                        onChange={(e) => setRulesetForm({ ...rulesetForm, description: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={2}
                    />
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Time Limits (seconds)</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Speaking Time"
                                type="number"
                                value={rulesetForm.rules.timeLimits.speakingTime}
                                onChange={(e) => setRulesetForm({
                                    ...rulesetForm,
                                    rules: {
                                        ...rulesetForm.rules,
                                        timeLimits: { ...rulesetForm.rules.timeLimits, speakingTime: parseInt(e.target.value) }
                                    }
                                })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Question Time"
                                type="number"
                                value={rulesetForm.rules.timeLimits.questionTime}
                                onChange={(e) => setRulesetForm({
                                    ...rulesetForm,
                                    rules: {
                                        ...rulesetForm.rules,
                                        timeLimits: { ...rulesetForm.rules.timeLimits, questionTime: parseInt(e.target.value) }
                                    }
                                })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRulesetDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateRuleset} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Moderation Dialog */}
            <Dialog open={moderationDialog} onClose={() => setModerationDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Issue Moderation Action</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Target User ID"
                        value={moderationForm.targetUserId}
                        onChange={(e) => setModerationForm({ ...moderationForm, targetUserId: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Action Type</InputLabel>
                        <Select
                            value={moderationForm.actionType}
                            onChange={(e) => setModerationForm({ ...moderationForm, actionType: e.target.value })}
                        >
                            <MenuItem value="warning">Warning</MenuItem>
                            <MenuItem value="mute">Mute</MenuItem>
                            <MenuItem value="unmute">Unmute</MenuItem>
                            <MenuItem value="role_change">Role Change</MenuItem>
                            <MenuItem value="remove">Remove</MenuItem>
                            <MenuItem value="timeout">Timeout</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Reason"
                        value={moderationForm.reason}
                        onChange={(e) => setModerationForm({ ...moderationForm, reason: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                        multiline
                        rows={2}
                    />
                    {['mute', 'timeout'].includes(moderationForm.actionType) && (
                        <TextField
                            fullWidth
                            label="Duration (seconds)"
                            type="number"
                            value={moderationForm.duration}
                            onChange={(e) => setModerationForm({ ...moderationForm, duration: parseInt(e.target.value) })}
                            sx={{ mt: 2 }}
                        />
                    )}
                    {moderationForm.actionType === 'role_change' && (
                        <TextField
                            fullWidth
                            label="New Role"
                            value={moderationForm.newRole}
                            onChange={(e) => setModerationForm({ ...moderationForm, newRole: e.target.value })}
                            sx={{ mt: 2 }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModerationDialog(false)}>Cancel</Button>
                    <Button onClick={handleIssueModeration} variant="contained" color="warning">Issue</Button>
                </DialogActions>
            </Dialog>

            {/* Dispute Dialog */}
            <Dialog open={disputeDialog} onClose={() => setDisputeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Flag Dispute</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Target Type</InputLabel>
                        <Select
                            value={disputeForm.targetType}
                            onChange={(e) => setDisputeForm({ ...disputeForm, targetType: e.target.value })}
                        >
                            <MenuItem value="participant">Participant</MenuItem>
                            <MenuItem value="content">Content</MenuItem>
                            <MenuItem value="evidence">Evidence</MenuItem>
                            <MenuItem value="ruling">Ruling</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Target ID"
                        value={disputeForm.targetId}
                        onChange={(e) => setDisputeForm({ ...disputeForm, targetId: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Reason"
                        value={disputeForm.reason}
                        onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={disputeForm.description}
                        onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisputeDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateDispute} variant="contained" color="error">Flag</Button>
                </DialogActions>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Compliance Export</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Export Type</InputLabel>
                        <Select
                            value={exportForm.exportType}
                            onChange={(e) => setExportForm({ ...exportForm, exportType: e.target.value })}
                        >
                            <MenuItem value="full">Full</MenuItem>
                            <MenuItem value="summary">Summary</MenuItem>
                            <MenuItem value="evidence_only">Evidence Only</MenuItem>
                            <MenuItem value="transcript_only">Transcript Only</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Format</InputLabel>
                        <Select
                            value={exportForm.format}
                            onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}
                        >
                            <MenuItem value="pdf">PDF</MenuItem>
                            <MenuItem value="json">JSON</MenuItem>
                            <MenuItem value="bundle">Bundle (PDF + JSON)</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={exportForm.includeRedactions}
                                onChange={(e) => setExportForm({ ...exportForm, includeRedactions: e.target.checked })}
                            />
                        }
                        label="Include Redactions"
                        sx={{ mt: 2 }}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={exportForm.includeAuditTrail}
                                onChange={(e) => setExportForm({ ...exportForm, includeAuditTrail: e.target.checked })}
                            />
                        }
                        label="Include Audit Trail"
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportDialog(false)}>Cancel</Button>
                    <Button onClick={handleRequestExport} variant="contained">Request</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default GovernanceTools;
