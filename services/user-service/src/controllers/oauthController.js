'use strict';

/**
 * OAuth Controller — Google, GitHub, Discord, Apple
 *
 * Implements the OAuth 2.0 authorization code flow using axios for token
 * exchange and provider API calls (no third-party OAuth library required).
 * Each provider flow:
 *   1. GET /oauth/:provider/authorize  → redirect to provider
 *   2. GET /oauth/:provider/callback   → exchange code → upsert user → issue JWT
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { User, Profile, RefreshToken } = require('../models');
const { getRequiredEnv } = require('../../../shared/security-utils');
const { catchAsync, AppError } = require('../../../shared/errorHandling');
const logger = require('../../../shared/logger');

const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Token helpers ─────────────────────────────────────────────────────────────

function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// ─── Provider config ──────────────────────────────────────────────────────────

function getProviderConfig(provider) {
    switch (provider) {
        case 'google':
            return {
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                scope: 'openid email profile',
                redirectUri: `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/oauth/google/callback`
            };
        case 'github':
            return {
                authorizationUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                userInfoUrl: 'https://api.github.com/user',
                userEmailUrl: 'https://api.github.com/user/emails',
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                scope: 'read:user user:email',
                redirectUri: `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/oauth/github/callback`
            };
        case 'discord':
            return {
                authorizationUrl: 'https://discord.com/api/oauth2/authorize',
                tokenUrl: 'https://discord.com/api/oauth2/token',
                userInfoUrl: 'https://discord.com/api/users/@me',
                clientId: process.env.DISCORD_CLIENT_ID,
                clientSecret: process.env.DISCORD_CLIENT_SECRET,
                scope: 'identify email',
                redirectUri: `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/oauth/discord/callback`
            };
        case 'apple':
            return {
                authorizationUrl: 'https://appleid.apple.com/auth/authorize',
                tokenUrl: 'https://appleid.apple.com/auth/token',
                clientId: process.env.APPLE_CLIENT_ID,
                clientSecret: process.env.APPLE_CLIENT_SECRET,
                scope: 'name email',
                redirectUri: `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/oauth/apple/callback`,
                responseMode: 'form_post'
            };
        default:
            return null;
    }
}

// ─── Upsert OAuth user ────────────────────────────────────────────────────────

async function upsertOAuthUser({ provider, providerId, email, firstName, lastName, avatar }) {
    // 1. Find by provider ID
    let user = await User.findOne({ where: { oauthProvider: provider, oauthProviderId: String(providerId) } });

    // 2. Or find by email (link accounts)
    if (!user && email) {
        user = await User.findOne({ where: { email } });
        if (user) {
            await user.update({ oauthProvider: provider, oauthProviderId: String(providerId) });
        }
    }

    // 3. Create new user
    if (!user) {
        const baseUsername = (email ? email.split('@')[0] : `${provider}_${providerId}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .substring(0, 20);
        let username = baseUsername;
        let suffix = 1;
        while (await User.findOne({ where: { username } })) {
            username = `${baseUsername}${suffix++}`;
        }

        user = await User.create({
            email: email || `${provider}_${providerId}@oauth.milonexa.com`,
            password: crypto.randomBytes(32).toString('hex'),
            username,
            firstName: firstName || username,
            lastName: lastName || '',
            avatar: avatar || null,
            isEmailVerified: !!email,
            isActive: true,
            oauthProvider: provider,
            oauthProviderId: String(providerId)
        });

        await Profile.create({ userId: user.id, displayName: `${firstName || ''} ${lastName || ''}`.trim() || username });
    }

    return user;
}

// ─── Controller methods ───────────────────────────────────────────────────────

/**
 * GET /oauth/:provider/authorize
 * Builds the provider authorization URL and redirects the browser.
 */
exports.authorize = (req, res) => {
    const { provider } = req.params;
    const config = getProviderConfig(provider);

    if (!config || !config.clientId) {
        return res.status(400).json({ error: `OAuth provider "${provider}" is not configured` });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const returnUrl = req.query.returnUrl || FRONTEND_URL;

    // Build authorization URL
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        response_type: 'code',
        state: `${state}:${encodeURIComponent(returnUrl)}`,
        ...(config.responseMode ? { response_mode: config.responseMode } : {})
    });

    res.redirect(`${config.authorizationUrl}?${params.toString()}`);
};

/**
 * GET /oauth/:provider/callback
 * Receives the authorization code, exchanges for tokens, upserts user, issues JWT.
 */
exports.callback = catchAsync(async (req, res) => {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;
    const config = getProviderConfig(provider);

    if (!config) return res.status(400).json({ error: `Unknown OAuth provider: ${provider}` });

    if (oauthError) {
        logger.warn(`[OAuth ${provider}] authorization denied: ${oauthError}`);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
    }

    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    // Parse returnUrl from state
    let returnUrl = FRONTEND_URL;
    if (state && state.includes(':')) {
        returnUrl = decodeURIComponent(state.split(':').slice(1).join(':')) || FRONTEND_URL;
    }

    // Exchange code for access token
    let tokenData;
    try {
        const tokenParams = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code'
        });

        const tokenResp = await axios.post(config.tokenUrl, tokenParams.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            timeout: 10000
        });
        tokenData = tokenResp.data;
    } catch (err) {
        logger.error(`[OAuth ${provider}] token exchange failed:`, err.message);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_token_failed`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
        logger.error(`[OAuth ${provider}] no access_token in response`);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_token_failed`);
    }

    // Fetch user profile from provider
    let profile;
    try {
        if (provider === 'google') {
            const resp = await axios.get(config.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
            const d = resp.data;
            profile = { providerId: d.sub, email: d.email, firstName: d.given_name, lastName: d.family_name, avatar: d.picture };
        } else if (provider === 'github') {
            const [userResp, emailsResp] = await Promise.all([
                axios.get(config.userInfoUrl, { headers: { Authorization: `token ${accessToken}` } }),
                axios.get(config.userEmailUrl, { headers: { Authorization: `token ${accessToken}` } })
            ]);
            const d = userResp.data;
            const primaryEmail = emailsResp.data.find((e) => e.primary && e.verified)?.email || emailsResp.data[0]?.email;
            const [firstName, ...rest] = (d.name || d.login || '').split(' ');
            profile = { providerId: String(d.id), email: primaryEmail, firstName, lastName: rest.join(' '), avatar: d.avatar_url };
        } else if (provider === 'discord') {
            const resp = await axios.get(config.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
            const d = resp.data;
            profile = {
                providerId: d.id,
                email: d.email,
                firstName: d.global_name || d.username,
                lastName: '',
                avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png` : null
            };
        } else if (provider === 'apple') {
            // Apple sends user info in the first authorization only (id_token JWT payload)
            if (tokenData.id_token) {
                const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
                profile = { providerId: payload.sub, email: payload.email, firstName: req.body?.user?.name?.firstName || '', lastName: req.body?.user?.name?.lastName || '', avatar: null };
            } else {
                return res.redirect(`${FRONTEND_URL}/login?error=apple_no_id_token`);
            }
        }
    } catch (err) {
        logger.error(`[OAuth ${provider}] profile fetch failed:`, err.message);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_profile_failed`);
    }

    if (!profile || !profile.providerId) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_profile_empty`);
    }

    // Upsert user
    let user;
    try {
        user = await upsertOAuthUser({ provider, ...profile });
    } catch (err) {
        logger.error(`[OAuth ${provider}] upsert failed:`, err.message);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_upsert_failed`);
    }

    // Issue application JWT
    const jwtToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    try {
        await RefreshToken.create({ userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    } catch (err) {
        logger.warn(`[OAuth ${provider}] refresh token save failed:`, err.message);
    }

    // Redirect back to frontend with tokens in URL fragment (SPA pattern)
    const redirectTarget = new URL('/oauth-callback', FRONTEND_URL);
    redirectTarget.searchParams.set('token', jwtToken);
    redirectTarget.searchParams.set('refresh_token', refreshToken);
    redirectTarget.searchParams.set('returnUrl', returnUrl);

    res.redirect(redirectTarget.toString());
});
