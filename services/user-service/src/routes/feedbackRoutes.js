const express = require('express');
const { validate, Joi } = require('../../shared/validation');
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware } = require('../../shared/auth-middleware');

const router = express.Router();

// Public feedback submission
router.post(
    '/feedback',
    validate({
        body: Joi.object({
            category: Joi.string().valid('feature-request', 'bug-report', 'improvement', 'praise', 'other').required(),
            subject: Joi.string().min(3).max(140).required(),
            message: Joi.string().min(10).max(1000).required(),
            displayName: Joi.string().max(60).allow('', null),
            rating: Joi.number().min(0).max(5).optional()
        })
    }),
    feedbackController.submitFeedback
);

// Public approved testimonials
router.get(
    '/feedback/approved',
    validate({
        query: Joi.object({
            limit: Joi.number().integer().min(1).max(20).optional(),
            minRating: Joi.number().min(0).max(5).optional()
        })
    }),
    feedbackController.getApprovedFeedback
);

// Admin moderation endpoints (requires JWT + admin role)
router.get('/admin/feedback/pending', authMiddleware, feedbackController.ensureAdmin, feedbackController.getPendingFeedback);
router.post(
    '/admin/feedback/:id/approve',
    authMiddleware,
    feedbackController.ensureAdmin,
    validate({
        body: Joi.object({
            verified: Joi.boolean().optional(),
            reason: Joi.string().max(250).optional(),
            displayName: Joi.string().max(60).optional()
        })
    }),
    feedbackController.approveFeedback
);
router.post(
    '/admin/feedback/:id/reject',
    authMiddleware,
    feedbackController.ensureAdmin,
    validate({
        body: Joi.object({
            reason: Joi.string().max(250).optional()
        })
    }),
    feedbackController.rejectFeedback
);

module.exports = router;
