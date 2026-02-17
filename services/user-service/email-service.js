/**
 * Email Notification Service
 * SMTP-based email sending functionality for Let's Connect
 * Phase 7 Feature
 */

const nodemailer = require('nodemailer');
const Mailgun = require('mailgun.js');
const FormData = require('form-data');

// Email transport configuration
let transporter = null;
let mailgunClient = null;
let mailgunDomain = process.env.MAILGUN_DOMAIN || '';

// Initialize email transporter (SMTP)
function initializeEmailTransport() {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || ''
    }
  };

  // Only initialize if SMTP credentials are provided
  if (smtpConfig.auth.user && smtpConfig.auth.pass) {
    transporter = nodemailer.createTransport(smtpConfig);
    console.log('[Email] SMTP transport initialized');
  } else {
    console.warn('[Email] SMTP credentials not configured. SMTP disabled.');
  }

  // Initialize Mailgun client if API key is provided
  const mgKey = process.env.MAILGUN_API_KEY || '';
  if (!mailgunClient && mgKey) {
    try {
      const mg = new Mailgun(FormData);
      mailgunClient = mg.client({ username: 'api', key: mgKey, url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3' });
      mailgunDomain = process.env.MAILGUN_DOMAIN || mailgunDomain;
      console.log('[Email] Mailgun client initialized');
    } catch (err) {
      console.warn('[Email] Mailgun initialization failed:', err.message);
      mailgunClient = null;
    }
  } else if (!mgKey) {
    console.log('[Email] Mailgun API key not configured');
  }
}

// Initialize on module load
initializeEmailTransport();

// Email templates
const emailTemplates = {
  welcome: (userData) => ({
    subject: 'Welcome to Let\'s Connect!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Welcome to Let's Connect!</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Thank you for joining Let's Connect - your unified social collaboration platform.</p>
        <p>Get started by:</p>
        <ul>
          <li>Completing your profile</li>
          <li>Connecting with friends and colleagues</li>
          <li>Exploring groups and communities</li>
          <li>Sharing your first post</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Let's Connect Team</p>
      </div>
    `,
    text: `Welcome to Let's Connect!\n\nHi ${userData.firstName || 'there'},\n\nThank you for joining Let's Connect. Get started by completing your profile and connecting with others.\n\nBest regards,\nThe Let's Connect Team`
  }),

  passwordReset: (userData, resetToken) => ({
    subject: 'Password Reset Request - Let\'s Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Password Reset Request</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>We received a request to reset your password for your Let's Connect account.</p>
        <p>Your password reset token is: <strong>${resetToken}</strong></p>
        <p>This token will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The Let's Connect Team</p>
      </div>
    `,
    text: `Password Reset Request\n\nHi ${userData.firstName || 'there'},\n\nYour password reset token is: ${resetToken}\n\nThis token will expire in 1 hour.\n\nBest regards,\nThe Let's Connect Team`
  }),

  notification: (userData, notificationData) => ({
    subject: notificationData.title || 'New Notification - Let\'s Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">${notificationData.title}</h2>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>${notificationData.body}</p>
        ${notificationData.actionUrl ? `<p><a href="${notificationData.actionUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a></p>` : ''}
        <p>Best regards,<br>The Let's Connect Team</p>
      </div>
    `,
    text: `${notificationData.title}\n\nHi ${userData.firstName || 'there'},\n\n${notificationData.body}\n\nBest regards,\nThe Let's Connect Team`
  }),

  digest: (userData, digestData) => ({
    subject: `Your Let's Connect Digest - ${digestData.period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Your ${digestData.period} Digest</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Here's what happened in your network:</p>
        <ul>
          ${digestData.items?.map(item => `<li>${item}</li>`).join('') || '<li>No new activity</li>'}
        </ul>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Let's Connect</a></p>
        <p>Best regards,<br>The Let's Connect Team</p>
      </div>
    `,
    text: `Your ${digestData.period} Digest\n\nHi ${userData.firstName || 'there'},\n\nHere's what happened in your network:\n${digestData.items?.join('\n') || 'No new activity'}\n\nBest regards,\nThe Let's Connect Team`
  }),

  verification: (userData, verificationCode) => ({
    subject: 'Verify Your Email - Let\'s Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Verify Your Email</h1>
        <p>Hi ${userData.firstName || 'there'},</p>
        <p>Please verify your email address to activate your Let's Connect account.</p>
        <p>Your verification code is: <strong style="font-size: 24px; color: #1976d2;">${verificationCode}</strong></p>
        <p>This code will expire in 24 hours.</p>
        <p>Best regards,<br>The Let's Connect Team</p>
      </div>
    `,
    text: `Verify Your Email\n\nHi ${userData.firstName || 'there'},\n\nYour verification code is: ${verificationCode}\n\nThis code will expire in 24 hours.\n\nBest regards,\nThe Let's Connect Team`
  })
};

/**
 * Send email notification
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

  // 1) Prefer SMTP transporter if available
  if (transporter) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Let\'s Connect" <noreply@letsconnect.com>',
        to,
        subject,
        text,
        html
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('[Email] Sent via SMTP:', result.messageId);
      return { success: true, messageId: result.messageId, provider: 'smtp', template };
    } catch (error) {
      console.error('[Email] SMTP send failed:', error);
      // fallthrough to try Mailgun if configured
    }
  }

  // 2) Fallback to Mailgun (if configured)
  if (mailgunClient && mailgunDomain) {
    try {
      const emailData = {
        from: process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Let\'s Connect" <noreply@letsconnect.com>',
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
      return { success: false, error: err.message };
    }
  }

  // 3) No provider available
  console.warn('[Email] No email provider configured (SMTP or Mailgun)');
  return { success: false, error: 'No email provider configured' };
}

/**
 * Send bulk emails (e.g., for digests)
 * @param {Array} recipients - Array of {email, template, data} objects
 * @returns {Promise<object>} - Bulk send results
 */
async function sendBulkEmails(recipients) {
  if (!transporter) {
    console.warn('[Email] SMTP not configured. Bulk emails not sent.');
    return { success: false, error: 'SMTP not configured' };
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
 * Verify SMTP connection
 * @returns {Promise<boolean>} - Connection status
 */
async function verifyConnection() {
  // Check SMTP first
  if (transporter) {
    try {
      await transporter.verify();
      console.log('[Email] SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[Email] SMTP connection failed:', error.message || error);
      // fall through to mailgun check
    }
  }

  // If Mailgun credentials are present, consider that 'configured'
  if (mailgunClient && mailgunDomain) {
    console.log('[Email] Mailgun configured (connection not actively verified)');
    return true;
  }

  return false;
}

module.exports = {
  sendEmail,
  sendBulkEmails,
  verifyConnection,
  emailTemplates
};
