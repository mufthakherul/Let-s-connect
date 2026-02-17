const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Fetches TV playlists from various public sources
 * Includes GitHub IPTV repositories and M3U parsing
 */
class TVPlaylistFetcher {
    constructor(options = {}) {
        this.timeout = options.timeout || 20000;
        this.retries = options.retries || 3;
        this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB per source
        this.maxPlaylistDepth = options.maxPlaylistDepth || 2; // follow nested playlists up to this depth

        // Official IPTV sources - worldwide coverage
        // NOTE: add iptv-org API streams.json (provides direct stream URLs) and keep M3U fallbacks
        this.sources = [
            {
                name: 'IPTV ORG (API - streams.json)',
                url: 'https://iptv-org.github.io/api/streams.json',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 1
            },
            {
                name: 'IPTV ORG (Primary M3U Pages)',
                url: 'https://iptv-org.github.io/ip-tv/in-dex.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 2
            }
        ];
    }

    /**
     * Fetch TV channels from all sources
     */
    async fetchAllSources() {
        const allChannels = new Map(); // Use Map to avoid duplicates by URL
        let successCount = 0;
        let errorCount = 0;

        console.log(`📺 Fetching TV playlists from ${this.sources.length} sources (500K+ worldwide)...`);

        // Sort by priority
        const sortedSources = [...this.sources].sort((a, b) => (a.priority || 999) - (b.priority || 999));

        for (const source of sortedSources) {
            try {
                console.log(`  ⏳ Fetching from ${source.name} (priority: ${source.priority})...`);
                const channels = await this.fetchPlaylist(source.url, source);

                if (Array.isArray(channels) && channels.length > 0) {
                    let sourceAdded = 0;
                    for (const channel of channels) {
                        if (channel.streamUrl) {
                            const key = channel.streamUrl.toLowerCase();
                            if (!allChannels.has(key)) {
                                allChannels.set(key, channel);
                                sourceAdded++;
                            }
                        }
                    }
                    successCount++;
                    console.log(`  ✅ ${source.name}: ${sourceAdded} new channels added (total: ${allChannels.size})`);
                } else {
                    console.log(`  ⚠️  ${source.name}: No channels found`);
                }
            } catch (error) {
                errorCount++;
                console.log(`  ⚠️  ${source.name}: ${error.message}`);
            }
        }

        // Attempt to include local YouTube Live JSON into results (if present)
        try {
            const youtubePath = path.join(__dirname, 'data', 'Youtube-Tv.json');
            if (fs.existsSync(youtubePath)) {
                const youtubeRaw = JSON.parse(fs.readFileSync(youtubePath, 'utf8'));
                const ytChannels = this.parseYouTubeChannels(youtubeRaw, {
                    name: 'YouTube Live (local)',
                    category: 'Mixed',
                    country: 'Worldwide'
                });
                let added = 0;
                for (const ch of ytChannels) {
                    if (ch.streamUrl) {
                        const key = ch.streamUrl.toLowerCase();
                        if (!allChannels.has(key)) {
                            allChannels.set(key, ch);
                            added++;
                        }
                    }
                }
                console.log(`  ✅ Loaded ${added} YouTube channels from local data (total: ${allChannels.size})`);
            }
        } catch (err) {
            console.log(`  ⚠️  Failed to load local YouTube channels: ${err.message}`);
        }

        console.log(`\n📊 TV Playlist Summary:`);
        console.log(`  - Total unique channels: ${allChannels.size}`);
        console.log(`  - Sources succeeded: ${successCount}/${this.sources.length}`);
        console.log(`  - Sources failed: ${errorCount}/${this.sources.length}`);

        return Array.from(allChannels.values());
    }

    /**
     * Fetch and parse M3U8 playlist
     */
    async fetchPlaylist(url, sourceInfo = {}, depth = 0) {
        const content = await this._fetchWithRetry(url, this.retries);

        // If JSON (API) — parse streams.json or generic JSON arrays
        const trimmed = (content || '').trim();
        if (url.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                return this._parseStreamsJSON(trimmed, sourceInfo);
            } catch (err) {
                // fallback to attempting M3U parse if JSON parse fails
                console.log(`  ⚠️  JSON parse failed for ${url}: ${err.message}`);
            }
        }

        // Parse M3U content
        let channels = this._parseM3U(content, sourceInfo);

        // Expand nested playlists (if any) up to maxPlaylistDepth
        if (depth < this.maxPlaylistDepth) {
            const expanded = [];
            for (const ch of channels) {
                if (this._isPlaylistUrl(ch.streamUrl)) {
                    try {
                        const inner = await this.fetchPlaylist(ch.streamUrl, sourceInfo, depth + 1);
                        // preserve parent metadata where possible
                        if (Array.isArray(inner) && inner.length > 0) {
                            expanded.push(...inner);
                            continue;
                        }
                    } catch (err) {
                        console.log(`  ⚠️  Nested playlist fetch failed for ${ch.streamUrl}: ${err.message}`);
                    }
                }
                expanded.push(ch);
            }
            channels = expanded;
        }

        return channels;
    }

    /**
     * Parse M3U8 playlist format
     * Format: #EXTINF:-1,[metadata]
     *         http://stream.url
     */
    _parseM3U(content, sourceInfo = {}) {
        const channels = [];
        const lines = content.split('\n');

        let currentChannel = null;
        let extinfLine = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and playlist header
            if (!trimmed || trimmed === '#EXTM3U') {
                continue;
            }

            // Parse EXTINF metadata line
            if (trimmed.startsWith('#EXTINF:')) {
                extinfLine = trimmed;
                continue;
            }

            // Parse stream URL
            if (trimmed && !trimmed.startsWith('#') && extinfLine) {
                const streamUrl = trimmed;

                // Parse metadata from EXTINF line
                const metadata = this._parseEXTINF(extinfLine);

                // Create channel object
                const channel = {
                    name: metadata.name || sourceInfo.name || 'Unknown',
                    description: metadata.group || sourceInfo.name || '',
                    streamUrl: streamUrl,
                    epgUrl: metadata.epgUrl || '',
                    category: metadata.group || sourceInfo.category || 'Mixed',
                    country: sourceInfo.country || 'Unknown',
                    language: this._detectLanguage(metadata) || 'Unknown',
                    logoUrl: metadata.logo || '',
                    resolution: this._detectResolution(metadata) || 'Unknown',
                    isActive: true,
                    source: 'playlist',
                    playlistSource: sourceInfo.name || 'unknown',
                    metadata: {
                        tvgId: metadata.tvgId || '',
                        tvgName: metadata.tvgName || '',
                        originalLine: extinfLine
                    }
                };

                // Basic platform tagging for non-HLS sources (e.g. YouTube)
                const su = (streamUrl || '').toLowerCase();
                if (su.includes('youtube.com') || su.includes('youtu.be')) {
                    channel.metadata.platform = 'youtube';
                    channel.source = 'youtube';
                }

                channels.push(channel);
                extinfLine = null;
                currentChannel = null;
            }
        }

        return channels;
    }

    /**
     * Parse EXTINF metadata line
     * Format: #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",[Channel Name]
     */
    _parseEXTINF(line) {
        const metadata = {
            name: '',
            group: '',
            logo: '',
            tvgId: '',
            tvgName: '',
            epgUrl: ''
        };

        // Extract channel name (after the last comma)
        const nameMatch = line.match(/,(.+?)$/);
        if (nameMatch) {
            metadata.name = nameMatch[1].trim();
        }

        // Extract attributes
        const tvgIdMatch = line.match(/tvg-id="([^"]*?)"/);
        if (tvgIdMatch) metadata.tvgId = tvgIdMatch[1];

        const tvgNameMatch = line.match(/tvg-name="([^"]*?)"/);
        if (tvgNameMatch) metadata.tvgName = tvgNameMatch[1];

        const logoMatch = line.match(/tvg-logo="([^"]*?)"/);
        if (logoMatch) metadata.logo = logoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*?)"/);
        if (groupMatch) metadata.group = groupMatch[1];

        const epgMatch = line.match(/x-tvg-url="([^"]*?)"/);
        if (epgMatch) metadata.epgUrl = epgMatch[1];

        return metadata;
    }

    /**
     * Detect language from metadata
     */
    _detectLanguage(metadata) {
        const name = metadata.name?.toLowerCase() || '';
        const group = metadata.group?.toLowerCase() || '';

        const languages = {
            'en': ['english', 'bbc', 'cnn', 'abc', 'cbs', 'nbc', 'sky', 'itv'],
            'fr': ['france', 'fr', 'français'],
            'de': ['deutsch', 'german', 'dw', 'ard', 'zdf'],
            'es': ['español', 'spanish', 'spain', 'rtve'],
            'it': ['italiano', 'italy', 'rai'],
            'pt': ['português', 'portuguese', 'rtp'],
            'nl': ['nederlands', 'dutch', 'npo', 'rtl'],
            'ja': ['日本', 'japanese', 'japan', 'nhk'],
            'zh': ['中文', 'chinese', 'cctv', 'china'],
            'ru': ['русский', 'russian', 'russia', 'rtv'],
            'ar': ['عربي', 'arabic', 'aljazeera']
        };

        for (const [lang, keywords] of Object.entries(languages)) {
            if (keywords.some(kw => name.includes(kw) || group.includes(kw))) {
                return lang;
            }
        }

        return null;
    }

    /**
     * Detect resolution from metadata or URL
     */
    _detectResolution(metadata) {
        const combined = (metadata.name + metadata.group + (metadata.originalLine || '')).toLowerCase();

        if (combined.includes('4k') || combined.includes('2160p')) return '4K';
        if (combined.includes('1080')) return 'Full HD';
        if (combined.includes('720p') || combined.includes('720')) return 'HD';
        if (combined.includes('480') || combined.includes('480p')) return 'SD';

        return 'Unknown';
    }

    /**
     * Parse iptv-org `streams.json` (or similar JSON arrays containing stream entries)
     */
    _parseStreamsJSON(content, sourceInfo = {}) {
        let data;
        try {
            data = JSON.parse(content);
        } catch (err) {
            throw new Error('Invalid JSON');
        }

        const channels = [];
        if (!Array.isArray(data)) return channels;

        for (const s of data) {
            // Streams JSON format (iptv-org): { channel, feed, title, url, referrer, user_agent, quality }
            if (!s.url) continue;

            const name = s.title || s.channel || sourceInfo.name || 'Unknown';

            channels.push({
                name: String(name).slice(0, 512),
                description: '',
                streamUrl: String(s.url),
                epgUrl: '',
                category: sourceInfo.category || 'Mixed',
                country: sourceInfo.country || 'Unknown',
                language: 'Unknown',
                logoUrl: '',
                resolution: s.quality || 'Unknown',
                isActive: true,
                source: 'iptv-org-api',
                playlistSource: sourceInfo.name || 'streams.json',
                metadata: {
                    channelId: s.channel || '',
                    feed: s.feed || '',
                    referrer: s.referrer || ''
                }
            });
        }

        return channels;
    }

    /**
     * Parse YouTube live channel JSON entries
     */
    parseYouTubeChannels(entries, sourceInfo = {}) {
        if (!Array.isArray(entries)) return [];

        const channels = [];
        for (const entry of entries) {
            const name = entry.name || sourceInfo.name || 'Unknown';
            const liveUrl = entry.liveUrl || '';
            const iframeUrl = entry.iframeUrl || '';

            if (!liveUrl) continue;

            channels.push({
                name: String(name).slice(0, 512),
                description: entry.categoryFull || entry.category || '',
                streamUrl: String(liveUrl),
                epgUrl: '',
                category: entry.category || sourceInfo.category || 'Mixed',
                country: entry.country || sourceInfo.country || 'Unknown',
                language: 'Unknown',
                logoUrl: entry.logoUrl || '',
                resolution: 'Unknown',
                isActive: true,
                source: 'youtube',
                playlistSource: sourceInfo.name || 'YouTube Live',
                metadata: {
                    platform: entry.platform || 'YouTube',
                    handle: entry.handle || '',
                    iframeUrl: iframeUrl || '',
                    categoryFull: entry.categoryFull || ''
                }
            });
        }

        return channels;
    }

    /**
     * Heuristic: does this URL look like a playlist (m3u/m3u8) rather than a direct media stream?
     */
    _isPlaylistUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const u = url.split('?')[0].toLowerCase();
        return u.endsWith('.m3u') || u.endsWith('.m3u8') || u.includes('playlist');
    }

    /**
     * Fetch with retry logic
     */
    async _fetchWithRetry(url, retries = 2) {
        let lastError;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const data = await this._fetch(url);
                return data;
            } catch (error) {
                lastError = error;
                if (attempt < retries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to fetch after ${retries} attempts: ${lastError.message}`);
    }

    /**
     * Make HTTP/HTTPS request with streaming support
     */
    async _fetch(url, maxSize = 50 * 1024 * 1024) { // 50MB limit
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            let body = '';
            let size = 0;

            protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Let-s-Connect-Streaming/1.0)'
                }
            }, (res) => {
                clearTimeout(timeoutId);

                if (res.statusCode !== 200) {
                    reject(new Error(`API returned status ${res.statusCode}`));
                    res.resume();
                    return;
                }

                res.on('data', chunk => {
                    size += chunk.length;
                    if (size > maxSize) {
                        res.destroy();
                        reject(new Error(`Playlist exceeds ${maxSize / 1024 / 1024}MB limit`));
                        return;
                    }
                    body += chunk;
                });

                res.on('end', () => {
                    clearTimeout(timeoutId);
                    resolve(body);
                });
            }).on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
}

module.exports = TVPlaylistFetcher;
