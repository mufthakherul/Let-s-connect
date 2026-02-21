const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const axios = require('axios');
const net = require('net');
const NodeCache = require('node-cache');
require('dotenv').config();

// Advanced TV services (search, health, recommendations)
const ChannelSearch = require('./channel-search');
const ChannelHealthChecker = require('./channel-health-checker');
const ChannelRecommender = require('./channel-recommender');

// In-memory service instances (initialized after DB sync)
let searchEngine = null;
let healthChecker = null;
let recommender = null;

const app = express();
const PORT = process.env.PORT || 8009;

// Middleware
app.use(cors());
app.use(express.json());

// If requests are proxied through the API Gateway the gateway will
// forward authenticated user info via headers (x-user-id, x-user-role,
// x-user-is-admin). Populate req.user from those headers so internal
// routes can use `req.user.isAdmin` consistently.
app.use((req, res, next) => {
    try {
        if (!req.user && req.headers['x-user-id']) {
            req.user = {
                id: req.headers['x-user-id'],
                role: req.headers['x-user-role'] || null,
                email: req.headers['x-user-email'] || null,
                isAdmin: String(req.headers['x-user-is-admin'] || '').toLowerCase() === 'true'
            };
        }
    } catch (err) {
        // Non-fatal — continue without req.user
    }
    next();
});

// Cache for stream metadata (TTL: 5 minutes)
const streamCache = new NodeCache({ stdTTL: 300 });

// Database connection
const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/streaming',
    {
        dialect: 'postgres',
        logging: false
    }
);

// ==================== MODELS ====================

// Radio Station Model
const RadioStation = sequelize.define('RadioStation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    description: DataTypes.TEXT,
    streamUrl: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    websiteUrl: DataTypes.TEXT,
    genre: DataTypes.TEXT,
    country: DataTypes.TEXT,
    language: DataTypes.TEXT,
    logoUrl: DataTypes.TEXT,
    bitrate: DataTypes.INTEGER,
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    listeners: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    source: {
        type: DataTypes.TEXT,
        defaultValue: 'manual'
    },
    metadata: DataTypes.JSONB, // For additional info like codec, format, etc.
    addedBy: DataTypes.UUID // User who added this station
}, {
    indexes: [
        { fields: ['isActive'] },
        { fields: ['genre'] },
        { fields: ['country'] },
        { fields: ['language'] },
        { fields: ['isActive', 'listeners'] },
        { fields: ['source'] }
    ]
});

// TV Channel Model
const TVChannel = sequelize.define('TVChannel', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    description: DataTypes.TEXT,
    streamUrl: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    epgUrl: DataTypes.TEXT, // Electronic Program Guide URL
    category: DataTypes.STRING, // News, Sports, Entertainment, etc.
    country: DataTypes.TEXT,
    language: DataTypes.TEXT,
    logoUrl: DataTypes.TEXT,
    resolution: DataTypes.STRING, // HD, FHD, 4K
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    viewers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    source: {
        type: DataTypes.TEXT,
        defaultValue: 'manual'
    },
    metadata: DataTypes.JSONB,
    addedBy: DataTypes.UUID
}, {
    indexes: [
        { fields: ['isActive'] },
        { fields: ['category'] },
        { fields: ['country'] },
        { fields: ['language'] },
        { fields: ['isActive', 'viewers'] },
        { fields: ['source'] }
    ]
});

// User Favorites Model
const Favorite = sequelize.define('Favorite', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    itemId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    itemType: {
        type: DataTypes.ENUM('radio', 'tv'),
        allowNull: false
    }
}, {
    indexes: [
        { fields: ['userId'] },
        { fields: ['itemId'] },
        { fields: ['userId', 'itemType'] },
        { unique: true, fields: ['userId', 'itemId', 'itemType'] }
    ]
});

// Playback History Model
const PlaybackHistory = sequelize.define('PlaybackHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    itemId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    itemType: {
        type: DataTypes.ENUM('radio', 'tv'),
        allowNull: false
    },
    duration: DataTypes.INTEGER, // Duration in seconds
    lastPosition: DataTypes.INTEGER // Last playback position in seconds
}, {
    indexes: [
        { fields: ['userId'] },
        { fields: ['itemId'] },
        { fields: ['userId', 'itemType'] },
        { fields: ['userId', 'createdAt'] }
    ]
});

// Telemetry: Fallback events (stores when client switched to alternativeUrl)
const FallbackEvent = sequelize.define('FallbackEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    itemId: { // TVChannel.id or RadioStation.id
        type: DataTypes.UUID,
        allowNull: true
    },
    itemType: {
        type: DataTypes.ENUM('radio', 'tv'),
        allowNull: false,
        defaultValue: 'tv'
    },
    primaryUrl: DataTypes.TEXT,
    usedUrl: DataTypes.TEXT,
    attemptIndex: DataTypes.INTEGER,
    error: DataTypes.TEXT,
    userId: DataTypes.UUID,
    metadata: DataTypes.JSONB
}, {
    indexes: [
        { fields: ['itemId'] },
        { fields: ['itemType'] },
        { fields: ['userId'] },
        { fields: ['createdAt'] },
        { fields: ['itemId', 'itemType'] }
    ]
});

// M3U Playlist Model (for importing/exporting playlists)
const Playlist = sequelize.define('Playlist', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: DataTypes.TEXT,
    type: {
        type: DataTypes.ENUM('radio', 'tv', 'mixed'),
        allowNull: false
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    items: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
});

// Initialize database
const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true' || process.env.NODE_ENV !== 'production';
const shouldForceSchema = process.env.DB_SYNC_FORCE === 'true';

// ==================== HELPER FUNCTIONS ====================

// Extract user ID from request headers
const getUserId = (req) => {
    return req.headers['x-user-id'] || null;
};

// Validate stream URL (basic check)
const validateStreamUrl = async (url) => {
    try {
        const response = await axios.head(url, {
            timeout: 5000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500
        });

        // Accept 2xx and 3xx responses (and 206 Partial Content) as valid
        if (response.status >= 200 && response.status < 400) return true;
        if (response.status === 206) return true;

        // HEAD returned an unexpected status -> try a short GET to detect HLS markers
        try {
            const getRes = await axios.get(url, { timeout: 5000, responseType: 'text', maxRedirects: 5 });
            const ct = (getRes.headers['content-type'] || '').toLowerCase();
            if (ct.includes('mpegurl') || ct.includes('vnd.apple.mpegurl') || ct.includes('m3u8')) return true;
            const body = (typeof getRes.data === 'string') ? getRes.data.slice(0, 2048) : '';
            return body.includes('#EXTM3U') || body.includes('#EXTINF');
        } catch (err) {
            return false;
        }
    } catch (error) {
        // Treat DNS resolution problems as non-fatal for imported playlists
        if (error && error.code && (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN')) {
            return true;
        }
        return false;
    }
};

// Trim and coerce external strings to avoid DB overflow
const sanitizeValue = (value, max = 1024) => {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value.slice(0, max) : String(value).slice(0, max);
};

const isPrivateIpv4 = (ip) => {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
};

const isPrivateIpv6 = (ip) => {
    const lowered = ip.toLowerCase();
    return lowered === '::1' || lowered.startsWith('fe80:') || lowered.startsWith('fc') || lowered.startsWith('fd');
};

const isBlockedHost = (hostname) => {
    if (!hostname) return true;
    const lowered = hostname.toLowerCase();
    if (lowered === 'localhost' || lowered.endsWith('.localhost') || lowered.endsWith('.local')) return true;
    const ipType = net.isIP(lowered);
    if (ipType === 4) return isPrivateIpv4(lowered);
    if (ipType === 6) return isPrivateIpv6(lowered);
    return false;
};

const proxyBase = (req) => `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}?url=`;

const rewritePlaylist = (content, req) => {
    const base = proxyBase(req);
    return content.replace(/http:\/\/[^\s"']+/g, (match) => `${base}${encodeURIComponent(match)}`);
};

// Parse M3U playlist
const parseM3U = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const items = [];
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            // Parse metadata from EXTINF line
            const matches = line.match(/#EXTINF:(-?\d+)\s*(.*),(.+)/);
            if (matches) {
                currentItem.duration = parseInt(matches[1]);
                currentItem.attributes = matches[2];
                currentItem.name = matches[3].trim();

                // Extract logo from attributes if present
                const logoMatch = currentItem.attributes.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) {
                    currentItem.logoUrl = logoMatch[1];
                }

                // Extract group (category/genre)
                const groupMatch = currentItem.attributes.match(/group-title="([^"]+)"/);
                if (groupMatch) {
                    currentItem.category = groupMatch[1];
                }
            }
        } else if (line && !line.startsWith('#')) {
            // This is the stream URL
            currentItem.streamUrl = line;
            items.push({ ...currentItem });
            currentItem = {};
        }
    }

    return items;
};

// ==================== RADIO STATION ROUTES ====================

// Stream proxy (handles http streams on https pages)
app.get('/proxy', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
        return res.status(400).json({ error: 'url query param is required' });
    }

    let target;
    try {
        target = new URL(rawUrl);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid url' });
    }

    if (!['http:', 'https:'].includes(target.protocol)) {
        return res.status(400).json({ error: 'Only http/https protocols are supported' });
    }

    if (isBlockedHost(target.hostname)) {
        return res.status(400).json({ error: 'Blocked target host' });
    }

    const headers = {};
    if (req.headers.range) {
        headers.range = req.headers.range;
    }

    // if the client included basic auth credentials in the original URL (e.g.
    // http://user:pass@host/path), the URL parser will expose them in
    // target.username/target.password.  We need to synthesize an Authorization
    // header for the proxied request; otherwise the upstream will return 401.
    if (target.username || target.password) {
        const buf = Buffer.from(`${target.username}:${target.password}`);
        headers['Authorization'] = `Basic ${buf.toString('base64')}`;
    }

    // also allow callers to supply an explicit Authorization value via query
    // (some clients cannot embed credentials in the URL).  e.g.
    // /proxy?url=...&auth=Basic+xxxx
    if (req.query.auth) {
        headers['Authorization'] = req.query.auth;
    }

    const isPlaylist = target.pathname.toLowerCase().endsWith('.m3u8');

    try {
        if (isPlaylist) {
            const response = await axios.get(target.href, {
                headers,
                timeout: 15000,
                responseType: 'text',
                validateStatus: (status) => status < 500
            });
            res.status(response.status);
            res.set('Content-Type', response.headers['content-type'] || 'application/vnd.apple.mpegurl');
            res.set('Cache-Control', 'no-store');
            res.send(rewritePlaylist(response.data, req));
            return;
        }

        const response = await axios.get(target.href, {
            headers,
            timeout: 15000,
            responseType: 'stream',
            validateStatus: (status) => status < 500
        });

        res.status(response.status);
        ['content-type', 'content-length', 'accept-ranges', 'content-range'].forEach((key) => {
            if (response.headers[key]) {
                res.set(key, response.headers[key]);
            }
        });
        res.set('Cache-Control', 'no-store');
        response.data.pipe(res);
    } catch (error) {
        console.error('[Proxy] Stream error:', error?.message || error);
        res.status(502).json({ error: 'Failed to fetch stream' });
    }
});

// Get all radio stations
app.get('/radio/stations', async (req, res) => {
    try {
        const { genre, country, language, search, limit = 50, offset = 0 } = req.query;

        const where = { isActive: true };

        if (genre) where.genre = genre;
        if (country) where.country = country;
        if (language) where.language = language;
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const stations = await RadioStation.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['listeners', 'DESC'], ['name', 'ASC']]
        });

        const total = await RadioStation.count({ where });

        res.json({
            stations,
            total,
            hasMore: total > parseInt(offset) + stations.length
        });
    } catch (error) {
        console.error('[Radio] Error fetching stations:', error);
        res.status(500).json({ error: 'Failed to fetch radio stations' });
    }
});

// Get single radio station
app.get('/radio/stations/:id', async (req, res) => {
    try {
        const station = await RadioStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ error: 'Radio station not found' });
        }

        res.json(station);
    } catch (error) {
        console.error('[Radio] Error fetching station:', error);
        res.status(500).json({ error: 'Failed to fetch radio station' });
    }
});

// Add new radio station
app.post('/radio/stations', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const {
            name,
            description,
            streamUrl,
            websiteUrl,
            genre,
            country,
            language,
            logoUrl,
            bitrate,
            metadata
        } = req.body;

        if (!name || !streamUrl) {
            return res.status(400).json({ error: 'Name and stream URL are required' });
        }

        // Validate stream URL
        const isValid = await validateStreamUrl(streamUrl);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or unreachable stream URL' });
        }

        const station = await RadioStation.create({
            name,
            description,
            streamUrl,
            websiteUrl,
            genre,
            country,
            language,
            logoUrl,
            bitrate,
            metadata,
            addedBy: userId
        });

        res.status(201).json(station);
    } catch (error) {
        console.error('[Radio] Error creating station:', error);
        res.status(500).json({ error: 'Failed to create radio station' });
    }
});

// Update radio station
app.put('/radio/stations/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const station = await RadioStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ error: 'Radio station not found' });
        }

        // Check if user owns this station or is admin
        if (station.addedBy !== userId) {
            return res.status(403).json({ error: 'Not authorized to update this station' });
        }

        await station.update(req.body);
        res.json(station);
    } catch (error) {
        console.error('[Radio] Error updating station:', error);
        res.status(500).json({ error: 'Failed to update radio station' });
    }
});

// Delete radio station
app.delete('/radio/stations/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const station = await RadioStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ error: 'Radio station not found' });
        }

        // Check if user owns this station or is admin
        if (station.addedBy !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this station' });
        }

        await station.destroy();
        res.json({ message: 'Radio station deleted successfully' });
    } catch (error) {
        console.error('[Radio] Error deleting station:', error);
        res.status(500).json({ error: 'Failed to delete radio station' });
    }
});

// Increment listener count
app.post('/radio/stations/:id/listen', async (req, res) => {
    try {
        const station = await RadioStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ error: 'Radio station not found' });
        }

        await station.increment('listeners');

        // Record playback history if user is authenticated
        const userId = getUserId(req);
        if (userId) {
            await PlaybackHistory.create({
                userId,
                itemId: station.id,
                itemType: 'radio'
            });
        }

        res.json({ message: 'Listening started', listeners: station.listeners + 1 });
    } catch (error) {
        console.error('[Radio] Error incrementing listeners:', error);
        res.status(500).json({ error: 'Failed to start listening' });
    }
});

// Decrement listener count
app.post('/radio/stations/:id/stop', async (req, res) => {
    try {
        const station = await RadioStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ error: 'Radio station not found' });
        }

        if (station.listeners > 0) {
            await station.decrement('listeners');
        }

        res.json({ message: 'Listening stopped', listeners: Math.max(0, station.listeners - 1) });
    } catch (error) {
        console.error('[Radio] Error decrementing listeners:', error);
        res.status(500).json({ error: 'Failed to stop listening' });
    }
});

// ==================== TV CHANNEL ROUTES ====================

// Get all TV channels
app.get('/tv/channels', async (req, res) => {
    try {
        const { category, country, language, search, source, limit = 50, offset = 0 } = req.query;

        const where = { isActive: true };

        if (category) where.category = category;
        if (country) where.country = country;
        if (language) where.language = language;
        if (source) {
            if (source === 'iptv') {
                where.source = { [Op.in]: ['playlist', 'iptv-org-api'] };
            } else if (source === 'youtube') {
                where.source = 'youtube';
            } else if (source === 'custom') {
                where.source = 'custom';
            } else {
                where.source = source;
            }
        }
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const channels = await TVChannel.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['viewers', 'DESC'], ['name', 'ASC']]
        });

        const total = await TVChannel.count({ where });

        res.json({
            channels,
            total,
            hasMore: total > parseInt(offset) + channels.length
        });
    } catch (error) {
        console.error('[TV] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch TV channels' });
    }
});

// Import custom TV playlist (M3U/M3U8)
app.post('/tv/import', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { url, content, name } = req.body;
        if (!url && !content) {
            return res.status(400).json({ error: 'Playlist url or content is required' });
        }

        let playlistContent = content;
        if (url) {
            const response = await axios.get(url, { timeout: 15000, responseType: 'text' });
            playlistContent = response.data;
        }

        const items = parseM3U(playlistContent || '');
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No channels found in playlist' });
        }

        const chunkSize = items.length > 2000 ? 200 : 500;
        let created = 0;
        let skipped = 0;

        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            for (const item of chunk) {
                if (!item.streamUrl) {
                    continue;
                }

                const existing = await TVChannel.findOne({ where: { streamUrl: item.streamUrl } });
                if (existing) {
                    skipped++;
                    continue;
                }

                await TVChannel.create({
                    name: sanitizeValue(item.name || 'Unknown', 512),
                    description: sanitizeValue(item.category || '', 1024),
                    streamUrl: sanitizeValue(item.streamUrl || '', 2048),
                    epgUrl: sanitizeValue(item.epgUrl || '', 1024),
                    category: sanitizeValue(item.category || 'Mixed', 256),
                    country: 'Unknown',
                    language: 'Unknown',
                    logoUrl: sanitizeValue(item.logoUrl || '', 1024),
                    resolution: 'Unknown',
                    isActive: true,
                    source: 'custom',
                    metadata: {
                        playlistName: sanitizeValue(name || '', 256),
                        sourceUrl: sanitizeValue(url || '', 2048),
                        importedBy: userId
                    }
                });
                created++;
            }
        }

        res.status(201).json({
            message: 'Playlist imported',
            created,
            skipped,
            total: created + skipped
        });
    } catch (error) {
        console.error('[TV] Error importing playlist:', error);
        res.status(500).json({ error: 'Failed to import TV playlist' });
    }
});

// Get single TV channel
app.get('/tv/channels/:id', async (req, res) => {
    try {
        const channel = await TVChannel.findByPk(req.params.id);

        if (!channel) {
            return res.status(404).json({ error: 'TV channel not found' });
        }

        res.json(channel);
    } catch (error) {
        console.error('[TV] Error fetching channel:', error);
        res.status(500).json({ error: 'Failed to fetch TV channel' });
    }
});

// Add new TV channel
app.post('/tv/channels', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const {
            name,
            description,
            streamUrl,
            epgUrl,
            category,
            country,
            language,
            logoUrl,
            resolution,
            metadata
        } = req.body;

        if (!name || !streamUrl) {
            return res.status(400).json({ error: 'Name and stream URL are required' });
        }

        // Validate stream URL
        const isValid = await validateStreamUrl(streamUrl);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or unreachable stream URL' });
        }

        const channel = await TVChannel.create({
            name,
            description,
            streamUrl,
            epgUrl,
            category,
            country,
            language,
            logoUrl,
            resolution,
            metadata,
            addedBy: userId
        });

        res.status(201).json(channel);
    } catch (error) {
        console.error('[TV] Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create TV channel' });
    }
});

// Update TV channel
app.put('/tv/channels/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const channel = await TVChannel.findByPk(req.params.id);

        if (!channel) {
            return res.status(404).json({ error: 'TV channel not found' });
        }

        // Check if user owns this channel or is admin
        if (channel.addedBy !== userId) {
            return res.status(403).json({ error: 'Not authorized to update this channel' });
        }

        await channel.update(req.body);
        res.json(channel);
    } catch (error) {
        console.error('[TV] Error updating channel:', error);
        res.status(500).json({ error: 'Failed to update TV channel' });
    }
});

// Delete TV channel
app.delete('/tv/channels/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const channel = await TVChannel.findByPk(req.params.id);

        if (!channel) {
            return res.status(404).json({ error: 'TV channel not found' });
        }

        // Check if user owns this channel or is admin
        if (channel.addedBy !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this channel' });
        }

        await channel.destroy();
        res.json({ message: 'TV channel deleted successfully' });
    } catch (error) {
        console.error('[TV] Error deleting channel:', error);
        res.status(500).json({ error: 'Failed to delete TV channel' });
    }
});

// Increment viewer count
app.post('/tv/channels/:id/watch', async (req, res) => {
    try {
        const channel = await TVChannel.findByPk(req.params.id);

        if (!channel) {
            return res.status(404).json({ error: 'TV channel not found' });
        }

        await channel.increment('viewers');

        // Record playback history if user is authenticated
        const userId = getUserId(req);
        if (userId) {
            await PlaybackHistory.create({
                userId,
                itemId: channel.id,
                itemType: 'tv'
            });
        }

        res.json({ message: 'Watching started', viewers: channel.viewers + 1 });
    } catch (error) {
        console.error('[TV] Error incrementing viewers:', error);
        res.status(500).json({ error: 'Failed to start watching' });
    }
});

// Decrement viewer count
app.post('/tv/channels/:id/stop', async (req, res) => {
    try {
        const channel = await TVChannel.findByPk(req.params.id);

        if (!channel) {
            return res.status(404).json({ error: 'TV channel not found' });
        }

        if (channel.viewers > 0) {
            await channel.decrement('viewers');
        }

        res.json({ message: 'Watching stopped', viewers: Math.max(0, channel.viewers - 1) });
    } catch (error) {
        console.error('[TV] Error decrementing viewers:', error);
        res.status(500).json({ error: 'Failed to stop watching' });
    }
});

// ==================== FAVORITES ROUTES ====================

// Get user favorites
app.get('/favorites', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { type } = req.query;
        const where = { userId };

        if (type) where.itemType = type;

        const favorites = await Favorite.findAll({ where });

        // Fix N+1 query: Batch load all items at once
        const radioIds = favorites.filter(f => f.itemType === 'radio').map(f => f.itemId);
        const tvIds = favorites.filter(f => f.itemType === 'tv').map(f => f.itemId);

        let radioStations = [];
        let tvChannels = [];

        // Only fetch if we have IDs
        if (radioIds.length > 0 || tvIds.length > 0) {
            const results = await Promise.all([
                radioIds.length > 0 ? RadioStation.findAll({ where: { id: { [Op.in]: radioIds } } }) : [],
                tvIds.length > 0 ? TVChannel.findAll({ where: { id: { [Op.in]: tvIds } } }) : []
            ]);
            radioStations = results[0];
            tvChannels = results[1];
        }

        // Create lookup maps for O(1) access
        const radioMap = new Map(radioStations.map(s => [s.id, s]));
        const tvMap = new Map(tvChannels.map(c => [c.id, c]));

        // Map favorites to their items
        const results = favorites.map(fav => {
            const item = fav.itemType === 'radio' 
                ? radioMap.get(fav.itemId)
                : tvMap.get(fav.itemId);
            return { ...fav.toJSON(), item };
        }).filter(r => r.item !== null);

        res.json(results);
    } catch (error) {
        console.error('[Favorites] Error fetching:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

// Add to favorites
app.post('/favorites', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { itemId, itemType } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ error: 'itemId and itemType are required' });
        }

        // Check if already favorited
        const existing = await Favorite.findOne({
            where: { userId, itemId, itemType }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already in favorites' });
        }

        const favorite = await Favorite.create({ userId, itemId, itemType });
        res.status(201).json(favorite);
    } catch (error) {
        console.error('[Favorites] Error adding:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

// Remove from favorites
app.delete('/favorites/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const favorite = await Favorite.findOne({
            where: { id: req.params.id, userId }
        });

        if (!favorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }

        await favorite.destroy();
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        console.error('[Favorites] Error removing:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

// ==================== PLAYLIST ROUTES ====================

// Get user playlists
app.get('/playlists', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const playlists = await Playlist.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.json(playlists);
    } catch (error) {
        console.error('[Playlists] Error fetching:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Create playlist
app.post('/playlists', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { name, description, type, isPublic, items } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const playlist = await Playlist.create({
            userId,
            name,
            description,
            type,
            isPublic: isPublic || false,
            items: items || []
        });

        res.status(201).json(playlist);
    } catch (error) {
        console.error('[Playlists] Error creating:', error);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

// Import M3U playlist
app.post('/playlists/import', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { name, content, type } = req.body;

        if (!name || !content || !type) {
            return res.status(400).json({ error: 'Name, content, and type are required' });
        }

        const items = parseM3U(content);

        const playlist = await Playlist.create({
            userId,
            name,
            type,
            items
        });

        res.status(201).json({ playlist, imported: items.length });
    } catch (error) {
        console.error('[Playlists] Error importing:', error);
        res.status(500).json({ error: 'Failed to import playlist' });
    }
});

// Export playlist as M3U
app.get('/playlists/:id/export', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const playlist = await Playlist.findOne({
            where: { id: req.params.id, userId }
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Generate M3U content
        let m3u = '#EXTM3U\n';

        for (const item of playlist.items) {
            const logoAttr = item.logoUrl ? ` tvg-logo="${item.logoUrl}"` : '';
            const categoryAttr = item.category ? ` group-title="${item.category}"` : '';
            m3u += `#EXTINF:-1${logoAttr}${categoryAttr},${item.name}\n`;
            m3u += `${item.streamUrl}\n`;
        }

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', `attachment; filename="${playlist.name}.m3u"`);
        res.send(m3u);
    } catch (error) {
        console.error('[Playlists] Error exporting:', error);
        res.status(500).json({ error: 'Failed to export playlist' });
    }
});

// ==================== PLAYBACK HISTORY ROUTES ====================

// Get user playback history
app.get('/history', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { type, limit = 50 } = req.query;
        const where = { userId };

        if (type) where.itemType = type;

        const history = await PlaybackHistory.findAll({
            where,
            limit: parseInt(limit),
            order: [['createdAt', 'DESC']]
        });

        // Fix N+1 query: Batch load all items at once
        const radioIds = history.filter(h => h.itemType === 'radio').map(h => h.itemId);
        const tvIds = history.filter(h => h.itemType === 'tv').map(h => h.itemId);

        let radioStations = [];
        let tvChannels = [];

        // Only fetch if we have IDs
        if (radioIds.length > 0 || tvIds.length > 0) {
            const results = await Promise.all([
                radioIds.length > 0 ? RadioStation.findAll({ where: { id: { [Op.in]: radioIds } } }) : [],
                tvIds.length > 0 ? TVChannel.findAll({ where: { id: { [Op.in]: tvIds } } }) : []
            ]);
            radioStations = results[0];
            tvChannels = results[1];
        }

        // Create lookup maps for O(1) access
        const radioMap = new Map(radioStations.map(s => [s.id, s]));
        const tvMap = new Map(tvChannels.map(c => [c.id, c]));

        // Map history items to their details
        const results = history.map(item => {
            const details = item.itemType === 'radio'
                ? radioMap.get(item.itemId)
                : tvMap.get(item.itemId);
            return { ...item.toJSON(), item: details };
        }).filter(r => r.item !== null);

        res.json(results);
    } catch (error) {
        console.error('[History] Error fetching:', error);
        res.status(500).json({ error: 'Failed to fetch playback history' });
    }
});

// ==================== STATS AND DISCOVERY ====================

// Get popular radio stations
app.get('/radio/popular', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const stations = await RadioStation.findAll({
            where: { isActive: true },
            limit: parseInt(limit),
            order: [['listeners', 'DESC']]
        });

        res.json(stations);
    } catch (error) {
        console.error('[Radio] Error fetching popular stations:', error);
        res.status(500).json({ error: 'Failed to fetch popular stations' });
    }
});

// Get popular TV channels
app.get('/tv/popular', async (req, res) => {
    try {
        const { limit = 20, source } = req.query;

        const where = { isActive: true };
        if (source) {
            if (source === 'iptv') {
                where.source = { [Op.in]: ['playlist', 'iptv-org-api'] };
            } else if (source === 'youtube') {
                where.source = 'youtube';
            } else if (source === 'custom') {
                where.source = 'custom';
            } else {
                where.source = source;
            }
        }

        const channels = await TVChannel.findAll({
            where,
            limit: parseInt(limit),
            order: [['viewers', 'DESC']]
        });

        res.json(channels);
    } catch (error) {
        console.error('[TV] Error fetching popular channels:', error);
        res.status(500).json({ error: 'Failed to fetch popular channels' });
    }
});

// Get available genres/categories (with caching)
app.get('/radio/genres', async (req, res) => {
    try {
        // Check cache first (5 minute TTL)
        const cached = streamCache.get('radio:genres');
        if (cached) {
            return res.json(cached);
        }

        const result = await sequelize.query(
            'SELECT DISTINCT genre FROM "RadioStations" WHERE genre IS NOT NULL AND "isActive" = true ORDER BY genre',
            { type: Sequelize.QueryTypes.SELECT }
        );

        const genres = result.map(r => r.genre);
        streamCache.set('radio:genres', genres);
        res.json(genres);
    } catch (error) {
        console.error('[Radio] Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

app.get('/tv/categories', async (req, res) => {
    try {
        const { source } = req.query;
        const cacheKey = `tv:categories:${source || 'all'}`;
        
        // Check cache first (5 minute TTL)
        const cached = streamCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        let query = 'SELECT DISTINCT category FROM "TVChannels" WHERE category IS NOT NULL AND "isActive" = true';
        const replacements = {};

        if (source === 'youtube') {
            query += ' AND source = :source';
            replacements.source = 'youtube';
        } else if (source === 'custom') {
            query += ' AND source = :source';
            replacements.source = 'custom';
        } else if (source === 'iptv') {
            query += ' AND source IN (:iptvSources)';
            replacements.iptvSources = ['playlist', 'iptv-org-api'];
        } else if (source) {
            query += ' AND source = :source';
            replacements.source = source;
        }

        query += ' ORDER BY category';

        const result = await sequelize.query(query, {
            type: Sequelize.QueryTypes.SELECT,
            replacements
        });

        const categories = result.map(r => r.category);
        streamCache.set(cacheKey, categories);
        res.json(categories);
    } catch (error) {
        console.error('[TV] Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ========== ADVANCED TV SERVICES (Search, Health, Recommendations) ==========

// Initialize in-memory services (call after DB sync)
async function initializeTVServices() {
    try {
        const channels = await TVChannel.findAll();
        searchEngine = new ChannelSearch(channels.map(c => c.toJSON()));
        healthChecker = new ChannelHealthChecker({ timeout: 5000 });
        recommender = new ChannelRecommender(channels.map(c => c.toJSON()));
        console.log('✅ TV services initialized');
    } catch (err) {
        console.error('❌ Failed to initialize TV services:', err.message);
    }
}

// Helper to ensure services are ready
const servicesReady = () => searchEngine && healthChecker && recommender;

// ========== CHANNEL SEARCH ==========
app.get('/api/channels/search', (req, res) => {
    if (!searchEngine) return res.status(503).json({ error: 'Search service not ready' });

    try {
        const {
            q = '',
            limit = 50,
            offset = 0,
            category,
            country,
            language,
            source,
            sortBy = 'relevance'
        } = req.query;

        const results = searchEngine.search(q, {
            limit: Math.min(parseInt(limit), 250),
            offset: Math.max(0, parseInt(offset)),
            category,
            country,
            language,
            source,
            sortBy
        });

        res.json({ success: true, total: results.total, limit: results.limit, offset: results.offset, results: results.results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/search/suggestions', (req, res) => {
    if (!searchEngine) return res.status(503).json({ error: 'Search service not ready' });

    try {
        const { q = '', limit = 10 } = req.query;
        const suggestions = searchEngine.getSuggestions(q, Math.min(parseInt(limit), 50));
        res.json({ success: true, suggestions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/search/filters', (req, res) => {
    if (!searchEngine) return res.status(503).json({ error: 'Search service not ready' });

    try {
        res.json({
            categories: searchEngine.getCategories(),
            countries: searchEngine.getCountries(),
            languages: searchEngine.getLanguages(),
            stats: searchEngine.getStats()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== CHANNEL HEALTH ==========
app.get('/api/channels/health', (req, res) => {
    if (!healthChecker) return res.status(503).json({ error: 'Health service not ready' });

    try {
        const health = healthChecker.getSystemHealth();
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/:channelId/health', (req, res) => {
    if (!healthChecker) return res.status(503).json({ error: 'Health service not ready' });

    try {
        const health = healthChecker.getCachedHealth(req.params.channelId);
        if (!health) return res.status(404).json({ error: 'No health data for channel' });
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/health/problems', (req, res) => {
    if (!healthChecker) return res.status(503).json({ error: 'Health service not ready' });

    try {
        const minUptime = parseInt(req.query.minUptime || 95);
        const problems = healthChecker.getProblemChannels(Math.max(0, Math.min(100, minUptime)));
        res.json({ success: true, problems, count: problems.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/health/report', (req, res) => {
    if (!healthChecker) return res.status(503).json({ error: 'Health service not ready' });

    try {
        const report = healthChecker.generateReport();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger health check (admin only — requires gateway-auth to populate `req.user.isAdmin`)
app.post('/api/channels/health/check', async (req, res) => {
    if (!healthChecker) return res.status(503).json({ error: 'Health service not ready' });

    try {
        // Require real authenticated user from API Gateway
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const channels = await TVChannel.findAll({ limit: 100 }); // quick test
        const result = await healthChecker.checkMultipleChannels(channels, { progress: false });

        res.json({ success: true, checked: result.totalChecked, summary: result.summary });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RECOMMENDATIONS ==========
app.get('/api/recommendations', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const { userId, limit = 20, category, country } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        let recommendations;
        if (category) {
            recommendations = recommender.getRecommendationsByCategory(userId, category, parseInt(limit));
        } else if (country) {
            recommendations = recommender.getRecommendationsByCountry(userId, country, parseInt(limit));
        } else {
            recommendations = recommender.getRecommendations(userId, Math.min(parseInt(limit), 100));
        }

        res.json({ success: true, recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/channels/view', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const { userId, channelId, watchDurationMs = 0 } = req.body;
        if (!userId || !channelId) return res.status(400).json({ error: 'userId and channelId required' });

        recommender.trackView(userId, channelId, parseInt(watchDurationMs));
        res.json({ success: true, message: 'View tracked' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/channels/rate', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const { userId, channelId, rating } = req.body;
        if (!userId || !channelId || rating === undefined) return res.status(400).json({ error: 'userId, channelId, and rating required' });

        const ratingNum = parseInt(rating);
        if (ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

        recommender.rateChannel(userId, channelId, ratingNum);
        res.json({ success: true, message: 'Rating saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/channels/:channelId/similar', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const { limit = 10 } = req.query;
        const similar = recommender.getSimilarChannels(req.params.channelId, parseInt(limit));
        res.json({ success: true, similar });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recommendations/stats/:userId', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const stats = recommender.getUserStats(req.params.userId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recommendations/system-stats', (req, res) => {
    if (!recommender) return res.status(503).json({ error: 'Recommender not ready' });

    try {
        const stats = recommender.getSystemStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Schedule periodic health checks (runs every 6 hours)
function scheduleHealthChecks() {
    const HEALTH_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

    setInterval(async () => {
        try {
            if (!healthChecker) return;
            const channels = await TVChannel.findAll({ limit: 1000 });
            const toCheck = healthChecker.getChannelsNeedingRecheck(channels);

            if (toCheck.length === 0) {
                console.log('✓ All channels have recent health data');
                return;
            }

            console.log(`🏥 Running health check on ${toCheck.length} channels...`);
            const result = await healthChecker.checkMultipleChannels(toCheck, { progress: false });

            console.log(`📊 Health check complete: ${result.summary.healthy}/${result.summary.healthy + result.summary.warning + result.summary.error} healthy`);
        } catch (error) {
            console.error('❌ Health check error:', error.message);
        }
    }, HEALTH_CHECK_INTERVAL);

    console.log('✅ Health check scheduler started (every 6 hours)');
}


// ==================== TELEMETRY: FALLBACK EVENTS ==========

/**
 * Record a fallback usage event
 * POST /telemetry/fallbacks
 * Body: { itemId, itemType, primaryUrl, usedUrl, attemptIndex, error, metadata }
 */
app.post('/telemetry/fallbacks', async (req, res) => {
    try {
        const {
            itemId = null,
            itemType = 'tv',
            primaryUrl = null,
            usedUrl = null,
            attemptIndex = 0,
            error = null,
            metadata = {}
        } = req.body || {};

        const userId = req.user?.id || req.body.userId || null;

        const ev = await FallbackEvent.create({
            itemId,
            itemType,
            primaryUrl,
            usedUrl,
            attemptIndex,
            error,
            userId,
            metadata
        });

        res.status(201).json({ success: true, event: ev });
    } catch (err) {
        console.error('[Telemetry] Failed to record fallback event:', err.message);
        res.status(500).json({ error: 'Failed to record fallback event' });
    }
});

/**
 * Query fallback events
 * GET /telemetry/fallbacks?itemId=&itemType=&limit=100&sinceDays=7
 */
app.get('/telemetry/fallbacks', async (req, res) => {
    try {
        const { itemId, itemType, limit = 100, sinceDays = 30 } = req.query;
        const where = {};
        if (itemId) where.itemId = itemId;
        if (itemType) where.itemType = itemType;
        if (sinceDays) where.createdAt = { [Op.gte]: new Date(Date.now() - Math.max(1, parseInt(sinceDays)) * 24 * 60 * 60 * 1000) };

        const events = await FallbackEvent.findAll({ where, limit: Math.min(parseInt(limit), 1000), order: [['createdAt', 'DESC']] });
        res.json({ success: true, events });
    } catch (err) {
        console.error('[Telemetry] Failed to query fallback events:', err.message);
        res.status(500).json({ error: 'Failed to query fallback events' });
    }
});

/**
 * Aggregated fallback report (top channels, counts)
 * GET /telemetry/fallbacks/report?days=7&limit=20
 */
app.get('/telemetry/fallbacks/report', async (req, res) => {
    try {
        const days = Math.max(1, parseInt(req.query.days || '7'));
        const limit = Math.min(100, parseInt(req.query.limit || '20'));
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const rows = await sequelize.query(
            `SELECT "itemId", "itemType", COUNT(*) AS count
             FROM "FallbackEvents"
             WHERE "createdAt" >= :since
             GROUP BY "itemId", "itemType"
             ORDER BY count DESC
             LIMIT :limit`,
            { replacements: { since, limit }, type: Sequelize.QueryTypes.SELECT }
        );

        res.json({ success: true, top: rows });
    } catch (err) {
        console.error('[Telemetry] Failed to generate fallback report:', err.message);
        res.status(500).json({ error: 'Failed to generate fallback report' });
    }
});


// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();

        const radioCount = await RadioStation.count({ where: { isActive: true } });
        const tvCount = await TVChannel.count({ where: { isActive: true } });

        res.json({
            status: 'healthy',
            service: 'streaming-service',
            database: 'connected',
            stats: {
                radioStations: radioCount,
                tvChannels: tvCount
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'streaming-service',
            error: error.message
        });
    }
});

// ==================== START SERVER ====================

async function startServer() {
    try {
        await sequelize.sync({ alter: shouldAlterSchema, force: shouldForceSchema });
        console.log('[Streaming] Database synced');

        // Initialize search / health / recommender services now that DB is ready
        await initializeTVServices();

        // Start periodic health checks
        setTimeout(scheduleHealthChecks, 5000);

        app.listen(PORT, () => {
            console.log(`[Streaming] Service running on port ${PORT}`);
            console.log(`[Streaming] IPFM (Radio) and IPTV service ready`);
        });
    } catch (err) {
        console.error('[Streaming] Database sync error:', err);
        process.exit(1);
    }
}

startServer();
