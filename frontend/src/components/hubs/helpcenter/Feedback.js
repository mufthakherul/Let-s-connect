import React, { useState } from 'react';
import {
    Container, Typography, Paper, Box, TextField, Button, Alert,
    FormControl, InputLabel, Select, MenuItem, Rating, FormControlLabel, Checkbox
} from '@mui/material';
import { Send } from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

export default function Feedback() {
    const [formData, setFormData] = useState({
        category: '',
        rating: 0,
        subject: '',
        message: '',
        displayName: '',
        allowPublicDisplay: false
    });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category || !formData.subject || !formData.message) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            await api.post('/api/public/feedback', {
                category: formData.category,
                rating: formData.rating || 0,
                subject: formData.subject,
                message: formData.message,
                displayName: formData.allowPublicDisplay
                    ? (formData.displayName || 'Community Member')
                    : 'Community Member'
            });

            toast.success('Thank you for your feedback!');
            setSubmitted(true);
        } catch (error) {
            const message = error?.response?.data?.error?.message || 'Could not submit feedback right now. Please try again.';
            toast.error(message);
            setSubmitted(false);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);

        // Reset form after 3 seconds
        setTimeout(() => {
            setFormData({
                category: '',
                rating: 0,
                subject: '',
                message: '',
                displayName: '',
                allowPublicDisplay: false
            });
            setSubmitted(false);
        }, 3000);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Share Your Feedback
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    Your input helps us improve. Tell us what you love, what needs work, or suggest new features.
                </Typography>

                {submitted ? (
                    <Alert severity="success" sx={{ mt: 3 }}>
                        Thank you! Your feedback has been received. We review all submissions and appreciate your time.
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Feedback Category *</InputLabel>
                            <Select
                                value={formData.category}
                                label="Feedback Category *"
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <MenuItem value="feature-request">Feature Request</MenuItem>
                                <MenuItem value="bug-report">Bug Report</MenuItem>
                                <MenuItem value="improvement">Improvement Suggestion</MenuItem>
                                <MenuItem value="praise">Something you love</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ mb: 3 }}>
                            <Typography component="legend" gutterBottom>
                                Overall Experience (optional)
                            </Typography>
                            <Rating
                                value={formData.rating}
                                onChange={(event, newValue) => setFormData({ ...formData, rating: newValue })}
                                size="large"
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="Subject *"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            sx={{ mb: 3 }}
                            placeholder="Brief summary of your feedback"
                        />

                        <TextField
                            fullWidth
                            label="Your Feedback *"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            multiline
                            rows={6}
                            sx={{ mb: 3 }}
                            placeholder="Please provide as much detail as possible..."
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.allowPublicDisplay}
                                    onChange={(e) => setFormData({ ...formData, allowPublicDisplay: e.target.checked })}
                                />
                            }
                            label="I allow this feedback to be considered for public testimonials after moderator approval"
                            sx={{ mb: 1 }}
                        />

                        {formData.allowPublicDisplay && (
                            <TextField
                                fullWidth
                                label="Display Name (optional)"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                sx={{ mb: 3 }}
                                placeholder="How your name should appear publicly"
                            />
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            startIcon={<Send />}
                            fullWidth
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </Box>
                )}

                <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Note:</strong> For urgent technical issues, please{' '}
                        <a href="/helpcenter/tickets">submit a support ticket</a> instead.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
