const express = require('express');
const { 
  Webhook, 
  WebhookDelivery, 
  WEBHOOK_EVENTS, 
  generateWebhookSecret
} = require('./webhooks');

const router = express.Router();

// Middleware to ensure user is authenticated (reuse from server.js)
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: List webhooks
 *     description: Get all webhooks for authenticated user
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Webhook'
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = { userId: req.user.id };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const webhooks = await Webhook.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{
        model: WebhookDelivery,
        as: 'deliveries',
        limit: 5,
        order: [['createdAt', 'DESC']],
        separate: true
      }]
    });

    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Create webhook
 *     description: Create a new webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *               - events
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               headers:
 *                 type: object
 *               retryCount:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 default: 3
 *               timeout:
 *                 type: integer
 *                 minimum: 1000
 *                 maximum: 30000
 *                 default: 10000
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, url, events, description, headers, retryCount, timeout } = req.body;

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ 
        error: 'Name, URL, and at least one event are required' 
      });
    }

    // Validate events
    const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid events',
        invalidEvents,
        validEvents: WEBHOOK_EVENTS
      });
    }

    // Generate secret
    const secret = generateWebhookSecret();

    const webhook = await Webhook.create({
      userId: req.user.id,
      name,
      url,
      secret,
      events,
      description,
      headers: headers || {},
      retryCount: retryCount ?? 3,
      timeout: timeout ?? 10000
    });

    res.status(201).json({
      webhook,
      secret // Return secret only on creation
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/events:
 *   get:
 *     summary: List available events
 *     description: Get list of all available webhook events
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/events', requireAuth, async (req, res) => {
  res.json({
    events: WEBHOOK_EVENTS,
    count: WEBHOOK_EVENTS.length
  });
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   get:
 *     summary: Get webhook
 *     description: Get webhook by ID with recent deliveries
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [{
        model: WebhookDelivery,
        as: 'deliveries',
        limit: 20,
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(webhook);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   put:
 *     summary: Update webhook
 *     description: Update webhook configuration
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const { name, url, events, description, headers, isActive, retryCount, timeout } = req.body;

    // Validate events if provided
    if (events) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'Events must be a non-empty array' });
      }

      const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid events',
          invalidEvents,
          validEvents: WEBHOOK_EVENTS
        });
      }
    }

    await webhook.update({
      ...(name && { name }),
      ...(url && { url }),
      ...(events && { events }),
      ...(description !== undefined && { description }),
      ...(headers && { headers }),
      ...(isActive !== undefined && { isActive }),
      ...(retryCount !== undefined && { retryCount }),
      ...(timeout !== undefined && { timeout })
    });

    res.json(webhook);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Delete webhook
 *     description: Delete a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await webhook.destroy();
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Test webhook
 *     description: Send a test event to the webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        user: {
          id: req.user.id,
          username: req.user.username
        }
      }
    };

    const { deliverWebhook } = require('./webhooks');
    const result = await deliverWebhook(webhook, 'webhook.test', testPayload);

    res.json({
      success: result.success,
      delivery: result.delivery,
      error: result.error
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook deliveries
 *     description: Get delivery history for a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/deliveries', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, success } = req.query;

    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const where = { webhookId: webhook.id };
    if (success !== undefined) {
      where.success = success === 'true';
    }

    const deliveries = await WebhookDelivery.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      deliveries: deliveries.rows,
      total: deliveries.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}/secret/rotate:
 *   post:
 *     summary: Rotate webhook secret
 *     description: Generate a new secret for the webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/secret/rotate', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const newSecret = generateWebhookSecret();
    await webhook.update({ secret: newSecret });

    res.json({
      message: 'Secret rotated successfully',
      secret: newSecret
    });
  } catch (error) {
    console.error('Error rotating secret:', error);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
});

module.exports = router;
