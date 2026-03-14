/**
 * Email Notification Service
 * Mailgun-based email sending functionality for Milonexa
 * Phase 7 Feature - SMTP Removed, Mailgun Only
 */

const Mailgun = require('mailgun.js');
const FormData = require('form-data');

// Email transport configuration
let mailgunClient = null;
let mailgunDomain = process.env.MAILGUN_DOMAIN || '';

// Initialize email transporter (Mailgun only)
function initializeEmailTransport() {
  // Initialize Mailgun client if API key is provided
  const mgKey = process.env.MAILGUN_API_KEY || '';
  if (!mailgunClient && mgKey) {
    try {
      const mg = new Mailgun(FormData);
      mailgunClient = mg.client({
        username: 'api',
        key: mgKey,
        url: (process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net').replace(/\/v3\/?$/, '')
      });
      mailgunDomain = process.env.MAILGUN_DOMAIN || mailgunDomain;
      console.log('[Email] Mailgun client initialized successfully');
    } catch (err) {
      console.error('[Email] Mailgun initialization failed:', err.message);
      mailgunClient = null;
    }
  } else if (!mgKey) {
    console.warn('[Email] Mailgun API key not configured. Email functionality disabled.');
  }
}

// Initialize on module load
initializeEmailTransport();

// Email templates
const emailTemplates = {
  welcome: (userData) => ({
    subject: 'Welcome to Milonexa!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Welcome to Milonexa!</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Thank you for joining Milonexa - your next-generation platform for connecting people virtually.</p>
        <p>Get started by:</p>
        <ul>
          <li>Completing your profile</li>
          <li>Connecting with friends and colleagues</li>
          <li>Exploring groups and communities</li>
          <li>Sharing your first post</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Milonexa Team</p>
      </div>
    `,
    text: `Welcome to Milonexa!\n\nHi ${userData.firstName || 'there'},\n\nThank you for joining Milonexa. Get started by completing your profile and connecting with others.\n\nBest regards,\nThe Milonexa Team`
  }),

  passwordReset: (userData, resetToken) => ({
    subject: 'Password Reset Request - Milonexa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Password Reset Request</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>We received a request to reset your password for your Milonexa account.</p>
        <p>Your password reset token is: <strong>${resetToken}</strong></p>
        <p>This token will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The Milonexa Team</p>
      </div>
    `,
    text: `Password Reset Request\n\nHi ${userData.firstName || 'there'},\n\nYour password reset token is: ${resetToken}\n\nThis token will expire in 1 hour.\n\nBest regards,\nThe Milonexa Team`
  }),

  notification: (userData, notificationData) => ({
    subject: notificationData.title || 'New Notification - Milonexa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">${notificationData.title}</h2>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>${notificationData.body}</p>
        ${notificationData.actionUrl ? `<p><a href="${notificationData.actionUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a></p>` : ''}
        <p>Best regards,<br>The Milonexa Team</p>
      </div>
    `,
    text: `${notificationData.title}\n\nHi ${userData.firstName || 'there'},\n\n${notificationData.body}\n\nBest regards,\nThe Milonexa Team`
  }),

  digest: (userData, digestData) => ({
    subject: `Your Milonexa Digest - ${digestData.period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Your ${digestData.period} Digest</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Here's what happened in your network:</p>
        <ul>
          ${digestData.items?.map(item => `<li>${item}</li>`).join('') || '<li>No new activity</li>'}
        </ul>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Milonexa</a></p>
        <p>Best regards,<br>The Milonexa Team</p>
      </div>
    `,
    text: `Your ${digestData.period} Digest\n\nHi ${userData.firstName || 'there'},\n\nHere's what happened in your network:\n${digestData.items?.join('\n') || 'No new activity'}\n\nBest regards,\nThe Milonexa Team`
  }),

  verification: (userData, verification) => {
    const code = verification && typeof verification === 'object' ? verification.code : verification;
    const token = verification && typeof verification === 'object' ? verification.token : null;
    const link = token ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${encodeURIComponent(token)}` : null;

    return {
      subject: 'Verify Your Email - Milonexa',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Verify Your Email</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Please verify your email address to activate your Milonexa account.</p>
        ${code ? `<p>Your verification code is: <strong style="font-size: 24px; color: #1976d2;">${code}</strong></p>` : ''}
        ${link ? `<p><a href="${link}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify email</a></p>` : ''}
        <p>This code will expire in 24 hours.</p>
        <p>Best regards,<br>The Milonexa Team</p>
      </div>
    `,
      text: `Verify Your Email\n\nHi ${userData.firstName || 'there'},\n\n${code ? `Your verification code is: ${code}\n\n` : ''}${link ? `Or click to verify: ${link}\n\n` : ''}This code will expire in 24 hours.\n\nBest regards,\nThe Milonexa Team`
    };
  }
};

/**
 * Send email notification using Mailgun
 * @param {string} to - Recipient email address
 * @param {string} template - Template name (welcome, passwordReset, notification, etc.)
 * @param {object} data - Data to populate template
 * @returns {Promise<object>} - Email send result
 */
async function sendEmail(to, template, data) {
  // Resolve template
  const templateData = emailTemplates[template];
  if (!templateData) {
    return { success: false, error: `Email template '${template}' not found` };
  }

  const { subject, html, text } = typeof templateData === 'function'
    ? templateData(data.user, data.data || data)
    : templateData;

  // Send via Mailgun (only provider)
  if (!mailgunClient || !mailgunDomain) {
    console.error('[Email] Mailgun not configured');
    return { success: false, error: 'Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.' };
  }

  try {
    const emailData = {
      from: process.env.EMAIL_FROM || '"Milonexa" <noreply@milonexa.com>',
      to,
      subject,
      text,
      html
    };

    const result = await mailgunClient.messages.create(mailgunDomain, emailData);
    console.log('[Email] Sent via Mailgun:', result.id);
    return { success: true, messageId: result.id, provider: 'mailgun', template };
  } catch (err) {
    console.error('[Email] Mailgun send failed:', err);
    return { success: false, error: err.message || 'Mailgun send failed' };
  }
}

/**
 * Send bulk emails (e.g., for digests)
 * @param {Array} recipients - Array of {email, template, data} objects
 * @returns {Promise<object>} - Bulk send results
 */
async function sendBulkEmails(recipients) {
  if (!mailgunClient || !mailgunDomain) {
    console.error('[Email] Mailgun not configured. Bulk emails not sent.');
    return { success: false, error: 'Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.' };
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient.email, recipient.template, recipient.data);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ email: recipient.email, error: result.error });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ email: recipient.email, error: error.message });
    }
  }

  return results;
}

/**
 * Verify Mailgun connection
 * @returns {Promise<boolean>} - Connection status
 */
async function verifyConnection() {
  // If Mailgun credentials are present, consider that 'configured'
  if (mailgunClient && mailgunDomain) {
    console.log('[Email] Mailgun configured and ready');
    return true;
  }

  console.error('[Email] Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.');
  return false;
}

module.exports = {
  sendEmail,
  sendBulkEmails,
  verifyConnection,
  emailTemplates
};
