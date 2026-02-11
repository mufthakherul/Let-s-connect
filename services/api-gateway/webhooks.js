const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Sequelize, DataTypes } = require('sequelize');

// Database setup (reuse from user-service)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'letsconnect_webhooks',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'postgres',
    dialect: 'postgres',
    logging: false
  }
);

// Webhook Model
const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  secret: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  events: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  headers: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  timeout: {
    type: DataTypes.INTEGER,
    defaultValue: 10000 // 10 seconds
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['isActive'] },
    { fields: ['events'], using: 'gin' }
  ]
});

// WebhookDelivery Model - Log of webhook deliveries
const WebhookDelivery = sequelize.define('WebhookDelivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  webhookId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Webhooks',
      key: 'id'
    },
    index: true
  },
  event: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  responseStatus: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  responseBody: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['webhookId'] },
    { fields: ['event'] },
    { fields: ['success'] },
    { fields: ['createdAt'] }
  ]
});

// Associations
Webhook.hasMany(WebhookDelivery, { foreignKey: 'webhookId', as: 'deliveries' });
WebhookDelivery.belongsTo(Webhook, { foreignKey: 'webhookId', as: 'webhook' });

// Sync database
sequelize.sync();

// Max response body length for logging (5KB)
const MAX_RESPONSE_BODY_LENGTH = 5000;

// Available webhook events
const WEBHOOK_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'post.created',
  'post.updated',
  'post.deleted',
  'post.liked',
  'comment.created',
  'comment.deleted',
  'blog.published',
  'blog.unpublished',
  'message.sent',
  'message.received',
  'call.started',
  'call.ended',
  'notification.sent',
  'group.created',
  'group.member_added',
  'group.member_removed',
  'payment.succeeded',
  'payment.failed'
];

// Generate webhook secret
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate webhook signature
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Trigger webhook delivery
async function deliverWebhook(webhook, event, payload) {
  const delivery = await WebhookDelivery.create({
    webhookId: webhook.id,
    event,
    payload,
    attempts: 1
  });

  let attempt = 0;
  const maxAttempts = webhook.retryCount + 1;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const signature = generateSignature(payload, webhook.secret);
      const startTime = Date.now();

      const response = await axios.post(webhook.url, payload, {
        timeout: webhook.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery': delivery.id,
          'User-Agent': 'LetsConnect-Webhooks/4.0',
          ...webhook.headers
        }
      });

      const responseTime = Date.now() - startTime;

      // Update delivery as successful
      await delivery.update({
        success: true,
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data).substring(0, MAX_RESPONSE_BODY_LENGTH),
        responseTime,
        attempts: attempt
      });

      // Update webhook stats
      await webhook.update({
        lastTriggeredAt: new Date(),
        successCount: webhook.successCount + 1
      });

      return { success: true, delivery };
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      const nextRetryAt = isLastAttempt ? null : new Date(Date.now() + Math.pow(2, attempt) * 1000);

      await delivery.update({
        success: false,
        error: error.message,
        responseStatus: error.response?.status,
        responseBody: error.response?.data ? JSON.stringify(error.response.data).substring(0, MAX_RESPONSE_BODY_LENGTH) : null,
        attempts: attempt,
        nextRetryAt
      });

      if (isLastAttempt) {
        // Update webhook stats on final failure
        await webhook.update({
          lastTriggeredAt: new Date(),
          failureCount: webhook.failureCount + 1
        });

        return { success: false, delivery, error: error.message };
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Trigger webhooks for an event
async function triggerWebhooks(userId, event, payload) {
  try {
    const webhooks = await Webhook.findAll({
      where: {
        userId,
        isActive: true,
        events: { [Sequelize.Op.contains]: [event] }
      }
    });

    const deliveries = await Promise.all(
      webhooks.map(webhook => deliverWebhook(webhook, event, payload))
    );

    return {
      triggered: webhooks.length,
      successful: deliveries.filter(d => d.success).length,
      failed: deliveries.filter(d => !d.success).length
    };
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    return { triggered: 0, successful: 0, failed: 0, error: error.message };
  }
}

module.exports = {
  Webhook,
  WebhookDelivery,
  WEBHOOK_EVENTS,
  generateWebhookSecret,
  generateSignature,
  deliverWebhook,
  triggerWebhooks,
  sequelize
};
