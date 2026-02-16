import React, { useState } from 'react';
import {
    Container, Typography, Paper, Box, TextField, Button, Alert,
    FormControl, InputLabel, Select, MenuItem, Chip, LinearProgress
} from '@mui/material';
import { SendOutlined, AttachFile } from '@mui/icons-material';
import toast from 'react-hot-toast';

export default function SupportTicket() {
    const [formData, setFormData] = useState({
        priority: 'medium',
        category: '',
        subject: '',
        description: '',
        email: ''
    });
    const [attachments, setAttachments] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(files);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.category || !formData.subject || !formData.description || !formData.email) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Generate a mock ticket number
        const ticket = `TC-${Date.now().toString().slice(-6)}`;
        setTicketNumber(ticket);

        // Here you would send the ticket to your API
        console.log('Support ticket submitted:', formData, attachments);
        toast.success(`Ticket ${ticket} created successfully!`);
        setSubmitted(true);

        // Reset form after 5 seconds
        setTimeout(() => {
            setFormData({ priority: 'medium', category: '', subject: '', description: '', email: '' });
            setAttachments([]);
            setSubmitted(false);
            setTicketNumber('');
        }, 5000);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Submit a Support Ticket
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    Need help? Our support team is here to assist. Fill out the form below and we'll get back to you soon.
                </Typography>

                {submitted ? (
                    <Box sx={{ mt: 4 }}>
                        <Alert severity="success" sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Ticket Created: {ticketNumber}
                            </Typography>
                            <Typography variant="body2">
                                We've received your support request. You'll receive a confirmation email shortly. Average response time: 24-48 hours.
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Button variant="outlined" onClick={() => setSubmitted(false)}>
                                Submit Another Ticket
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
                        <TextField
                            fullWidth
                            label="Your Email *"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            sx={{ mb: 3 }}
                            placeholder="we'll send updates to this email"
                        />

                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <FormControl fullWidth>
                                <InputLabel>Priority *</InputLabel>
                                <Select
                                    value={formData.priority}
                                    label="Priority *"
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <MenuItem value="low">Low - General question</MenuItem>
                                    <MenuItem value="medium">Medium - Issue affecting work</MenuItem>
                                    <MenuItem value="high">High - Critical issue</MenuItem>
                                    <MenuItem value="urgent">Urgent - Service down</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Category *</InputLabel>
                                <Select
                                    value={formData.category}
                                    label="Category *"
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <MenuItem value="account">Account & Login</MenuItem>
                                    <MenuItem value="technical">Technical Issue</MenuItem>
                                    <MenuItem value="billing">Billing & Payments</MenuItem>
                                    <MenuItem value="feature">Feature Request</MenuItem>
                                    <MenuItem value="security">Security Concern</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <TextField
                            fullWidth
                            label="Subject *"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            sx={{ mb: 3 }}
                            placeholder="Brief description of the issue"
                        />

                        <TextField
                            fullWidth
                            label="Description *"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={6}
                            sx={{ mb: 3 }}
                            placeholder="Please provide detailed information: what happened, when it happened, steps to reproduce..."
                        />

                        <Box sx={{ mb: 3 }}>
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<AttachFile />}
                            >
                                Attach Files (optional)
                                <input
                                    type="file"
                                    hidden
                                    multiple
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                />
                            </Button>
                            {attachments.length > 0 && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {attachments.map((file, idx) => (
                                        <Chip
                                            key={idx}
                                            label={file.name}
                                            size="small"
                                            onDelete={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                        />
                                    ))}
                                </Box>
                            )}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                Max 5 files, 10MB each. Supported: images, PDFs, docs
                            </Typography>
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            startIcon={<SendOutlined />}
                            fullWidth
                        >
                            Submit Ticket
                        </Button>
                    </Box>
                )}

                <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Before submitting:</strong> Check our <a href="/helpcenter/faq">FAQ</a> and{' '}
                        <a href="/helpcenter/manuals">user manuals</a> for quick answers.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
