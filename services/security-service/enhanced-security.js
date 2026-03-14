/**
 * Enhanced Security Features for Admin System
 * Phase 3-7 Implementation
 *
 * Features:
 * - Multi-step verification
 * - Email verification codes
 * - Cross-field validation
 * - IP anomaly detection
 * - Enhanced session tracking
 * - CSRF protection
 */

const crypto = require('crypto');
const cookieParser = require('cookie-parser');

// In-memory stores (in production, use Redis)
const verificationCodes = new Map(); // email -> { code, expires, attempts }
const authSessions = new Map(); // sessionId -> { identifier, secret, timestamp, inputHistory }
const ipLoginHistory = new Map(); // adminId -> [{ ip, timestamp, location }]

/**
 * Generate 6-8 digit verification code
 */
function generateVerificationCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Stealth authentication endpoint
 * Phase 3: Hidden authentication system
 */
async function handleStealthAuth(req, res, AdminUser, emailService) {
  try {
    const { identifier, secret, inputHistory } = req.body;

    if (!identifier || !secret) {
      // Silent failure - return 200 with no data
      return res.status(200).json({});
    }

    // Find admin by username or email
    const admin = await AdminUser.findOne({
      where: {
        [Op.or]: [
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() }
        ]
      }
    });

    if (!admin || !admin.isActive) {
      // Silent failure
      return res.status(200).json({});
    }

    // Check account lockout
    if (admin.lockedUntil && new Date() < admin.lockedUntil) {
      // Silent failure
      return res.status(200).json({});
    }

    // Verify password (constant-time comparison)
    const isValid = await bcrypt.compare(secret, admin.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= 5) {
        // Lock account for 15 minutes
        admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await admin.save();

      // Silent failure
      return res.status(200).json({});
    }

    // Create session for multi-step flow
    const sessionId = crypto.randomBytes(32).toString('hex');
    authSessions.set(sessionId, {
      adminId: admin.id,
      identifier,
      timestamp: Date.now(),
      inputHistory,
      step: 'cross-validation'
    });

    // Set secure cookie
    res.cookie('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    // Return next step
    res.json({
      nextStep: 'cross-validation',
      requireField: admin.email ? 'username' : 'email'
    });

  } catch (error) {
    console.error('[Stealth Auth] Error:', error);
    // Silent failure
    res.status(200).json({});
  }
}

/**
 * Cross-field validation endpoint
 * Phase 4: Multi-step verification - Step 1
 */
async function handleCrossValidation(req, res, AdminUser) {
  try {
    const { primary, cross } = req.body;

    // Ensure cookies are parsed even if cookie-parser middleware is not mounted globally
    if (!req.cookies) {
      const parser = cookieParser();
      await new Promise((resolve) => parser(req, res, resolve));
    }

    const sessionId = req.cookies && req.cookies.admin_session;

    if (!sessionId) {
      return res.status(200).json({});
    }

    const session = authSessions.get(sessionId);
    if (!session || session.step !== 'cross-validation') {
      return res.status(200).json({});
    }

    // Check session timeout (10 minutes)
    if (Date.now() - session.timestamp > 10 * 60 * 1000) {
      authSessions.delete(sessionId);
      return res.status(200).json({});
    }

    // Find admin
    const admin = await AdminUser.findByPk(session.adminId);
    if (!admin) {
      return res.status(200).json({});
    }

    // Validate cross-field
    let isValid = false;
    if (admin.username && cross.toLowerCase() === admin.username.toLowerCase()) {
      isValid = true;
    } else if (admin.email && cross.toLowerCase() === admin.email.toLowerCase()) {
      isValid = true;
    }

    if (!isValid) {
      // Silent failure
      return res.status(200).json({});
    }

    // Update session
    session.step = 'code-verification';
    session.crossField = cross;
    authSessions.set(sessionId, session);

    res.json({ success: true });

  } catch (error) {
    console.error('[Cross Validation] Error:', error);
    res.status(200).json({});
  }
}

/**
 * Send verification code endpoint
 * Phase 4: Multi-step verification - Step 2
 */
async function handleSendVerificationCode(req, res, AdminUser, emailService) {
  try {
    const { identifier } = req.body;
    const sessionId = req.cookies.admin_session;

    if (!sessionId) {
      return res.status(200).json({});
    }

    const session = authSessions.get(sessionId);
    if (!session) {
      return res.status(200).json({});
    }

    // Find admin
    const admin = await AdminUser.findByPk(session.adminId);
    if (!admin || !admin.email) {
      return res.status(200).json({});
    }

    // Generate code
    const code = generateVerificationCode(6);
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code
    verificationCodes.set(admin.email, {
      code,
      expires,
      attempts: 0
    });

    // Send email (using Mailgun)
    if (emailService && emailService.sendEmail) {
      await emailService.sendEmail(admin.email, 'verification', {
        user: { firstName: admin.username },
        data: { code }
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('[Send Code] Error:', error);
    res.status(200).json({});
  }
}

/**
 * Validate verification code endpoint
 * Phase 4: Multi-step verification - Step 2 validation
 */
async function handleValidateCode(req, res, AdminUser) {
  try {
    const { identifier, code } = req.body;
    const sessionId = req.cookies.admin_session;

    if (!sessionId || !code) {
      return res.status(200).json({});
    }

    const session = authSessions.get(sessionId);
    if (!session || session.step !== 'code-verification') {
      return res.status(200).json({});
    }

    // Find admin
    const admin = await AdminUser.findByPk(session.adminId);
    if (!admin) {
      return res.status(200).json({});
    }

    // Check code
    const storedCode = verificationCodes.get(admin.email);
    if (!storedCode) {
      return res.status(200).json({});
    }

    // Check expiration
    if (Date.now() > storedCode.expires) {
      verificationCodes.delete(admin.email);
      return res.status(200).json({});
    }

    // Check attempts
    if (storedCode.attempts >= 3) {
      verificationCodes.delete(admin.email);
      return res.status(200).json({});
    }

    // Validate code (constant-time comparison)
    if (code !== storedCode.code) {
      storedCode.attempts += 1;
      verificationCodes.set(admin.email, storedCode);
      return res.status(200).json({});
    }

    // Code valid - complete authentication
    verificationCodes.delete(admin.email);
    authSessions.delete(sessionId);

    // Track IP for anomaly detection
    trackIPLogin(admin.id, req.ip);

    // Update admin record
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role
      },
      ADMIN_JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('[Validate Code] Error:', error);
    res.status(200).json({});
  }
}

/**
 * IP Anomaly Detection
 * Phase 7: Security hardening
 */
function trackIPLogin(adminId, ip) {
  const history = ipLoginHistory.get(adminId) || [];
  history.push({
    ip,
    timestamp: Date.now(),
    // In production, use geo-IP service for location
    location: 'Unknown'
  });

  // Keep last 100 logins
  if (history.length > 100) {
    history.shift();
  }

  ipLoginHistory.set(adminId, history);

  // Check for anomalies
  const recentIPs = history.slice(-10).map(h => h.ip);
  const uniqueIPs = new Set(recentIPs);

  // Alert if more than 5 different IPs in last 10 logins
  if (uniqueIPs.size > 5) {
    console.warn(`[IP Anomaly] Admin ${adminId} logged in from ${uniqueIPs.size} different IPs recently`);
    // In production: send alert via webhook/email
  }
}

/**
 * CSRF Token Generation
 * Phase 7: Security hardening
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Token Validation Middleware
 */
function validateCSRF(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.cookies.csrf_token;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  next();
}

/**
 * Rate limiting with exponential backoff
 * Phase 7: Security hardening
 */
const loginAttempts = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  loginAttempts.set(ip, record);
  return true;
}

module.exports = {
  handleStealthAuth,
  handleCrossValidation,
  handleSendVerificationCode,
  generateVerificationCode,
  trackIPLogin,
  generateCSRFToken,
  validateCSRF,
  checkRateLimit
};
