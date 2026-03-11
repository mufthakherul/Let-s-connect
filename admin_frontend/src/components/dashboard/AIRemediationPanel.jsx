import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Chip, Alert, Button, IconButton, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Accordion, AccordionSummary, AccordionDetails, Stepper,
    Step, StepLabel, StepContent
} from '@mui/material';
import {
    SmartToy, Refresh, ExpandMore, BugReport, Warning,
    Info, CheckCircle, Psychology, AutoFixHigh
} from '@mui/icons-material';
import api from '../../utils/api';

const severityConfig = {
    critical: { color: 'error', icon: <BugReport />, label: 'CRITICAL' },
    warning: { color: 'warning', icon: <Warning />, label: 'WARNING' },
    info: { color: 'info', icon: <Info />, label: 'INFO' },
};

/**
 * AI Remediation Panel — Phase E
 * Shows AI-generated remediation suggestions with guided steps.
 */
const AIRemediationPanel = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [activeSteps, setActiveSteps] = useState({});

    const fetchRules = useCallback(async () => {
        try {
            const res = await api.get('/api/admin/remediate/rules');
            setRules(res.data?.rules || []);
        } catch (_) { /* non-critical */ }
    }, []);

    const runAnalysis = useCallback(async () => {
        setAnalyzing(true);
        setError(null);
        try {
            const res = await api.post('/api/admin/remediate');
            setSuggestions(res.data?.suggestions || []);
        } catch (err) {
            setError(err.message);
            // Show demo data
            setSuggestions([
                {
                    id: 'demo-1',
                    title: 'System Analysis Complete',
                    source: 'rule-engine',
                    severity: 'info',
                    steps: [
                        'No critical issues detected in current state',
                        'Monitor SLA metrics for potential degradation',
                        'Review compliance status regularly',
                        'Configure webhooks for proactive alerting',
                    ],
                }
            ]);
        } finally {
            setAnalyzing(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
        runAnalysis();
    }, [fetchRules, runAnalysis]);

    const handleStepClick = (suggestionId, step) => {
        setActiveSteps(prev => ({ ...prev, [suggestionId]: step }));
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                    <SmartToy color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                        AI-Assisted Guided Remediation
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant="contained"
                        startIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <Psychology />}
                        onClick={runAnalysis}
                        disabled={analyzing}
                    >
                        {analyzing ? 'Analyzing...' : 'Run Analysis'}
                    </Button>
                    <IconButton onClick={() => { fetchRules(); runAnalysis(); }} disabled={loading || analyzing}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    API unavailable — showing demo data. Error: {error}
                </Alert>
            )}

            {/* Analysis Results */}
            {suggestions.length === 0 && !analyzing ? (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                    ✓ No critical issues identified — system appears healthy
                </Alert>
            ) : (
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        {analyzing ? 'Running analysis...' : `${suggestions.length} Remediation Suggestion(s)`}
                    </Typography>

                    {suggestions.map((suggestion, idx) => {
                        const sevCfg = severityConfig[suggestion.severity] || severityConfig.info;
                        const activeStep = activeSteps[suggestion.id] || 0;

                        return (
                            <Accordion key={suggestion.id} defaultExpanded={idx === 0} sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                        <Chip
                                            label={sevCfg.label}
                                            color={sevCfg.color}
                                            size="small"
                                            icon={sevCfg.icon}
                                        />
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {suggestion.title}
                                        </Typography>
                                        {suggestion.source === 'llm' && (
                                            <Chip label="🧠 AI" size="small" color="secondary" variant="outlined" />
                                        )}
                                        {suggestion.trigger && (
                                            <Chip
                                                label={`trigger: ${suggestion.trigger.type}`}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {suggestion.summary && (
                                        <Alert severity="info" sx={{ mb: 2 }}>{suggestion.summary}</Alert>
                                    )}

                                    <Typography variant="subtitle2" gutterBottom>
                                        <AutoFixHigh fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                        Remediation Steps:
                                    </Typography>

                                    <Stepper activeStep={activeStep} orientation="vertical">
                                        {(suggestion.steps || []).map((step, stepIdx) => (
                                            <Step key={stepIdx} completed={stepIdx < activeStep}>
                                                <StepLabel
                                                    onClick={() => handleStepClick(suggestion.id, stepIdx)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <Typography variant="body2">Step {stepIdx + 1}</Typography>
                                                </StepLabel>
                                                <StepContent>
                                                    <Typography variant="body2">{step}</Typography>
                                                    <Box mt={1}>
                                                        {stepIdx < (suggestion.steps.length - 1) && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleStepClick(suggestion.id, stepIdx + 1)}
                                                            >
                                                                Mark Done & Next
                                                            </Button>
                                                        )}
                                                        {stepIdx === (suggestion.steps.length - 1) && (
                                                            <Chip label="All steps complete ✓" color="success" size="small" />
                                                        )}
                                                    </Box>
                                                </StepContent>
                                            </Step>
                                        ))}
                                    </Stepper>

                                    {suggestion.references && suggestion.references.length > 0 && (
                                        <Box mt={2}>
                                            <Typography variant="caption" color="text.secondary">
                                                References: {suggestion.references.join(', ')}
                                            </Typography>
                                        </Box>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Box>
            )}

            {/* Available Rules */}
            {rules.length > 0 && (
                <Card>
                    <CardHeader
                        title="Knowledge Base"
                        subheader={`${rules.length} built-in remediation rules`}
                    />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rule ID</TableCell>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Severity</TableCell>
                                    <TableCell>Steps</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rules.map((rule) => (
                                    <TableRow key={rule.id} hover>
                                        <TableCell>
                                            <Typography variant="caption" fontFamily="monospace">{rule.id}</Typography>
                                        </TableCell>
                                        <TableCell>{rule.title}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={rule.severity}
                                                color={severityConfig[rule.severity]?.color || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{rule.steps?.length || 0} steps</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}
        </Box>
    );
};

export default AIRemediationPanel;
