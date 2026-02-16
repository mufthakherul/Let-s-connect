const http = require('http');
const https = require('https');

/**
 * Fetches TV playlists from various public sources
 * Includes GitHub IPTV repositories and M3U parsing
 */
class TVPlaylistFetcher {
    constructor(options = {}) {
        this.timeout = options.timeout || 20000;
        this.retries = options.retries || 3;
        this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB per source
        // Official IPTV sources - worldwide coverage
        this.sources = [
            {
                name: 'IPTV ORG (Primary)',
                url: 'https://iptv-org.github.io/iptv-org/iptv/index.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 1
            },
            {
                name: 'IPTV ORG (Fallback - GitHub)',
                url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 2
            },
            {
                name: 'M3U Extended',
                url: 'https://raw.githubusercontent.com/m3u8-xtream/m3u8-xtream-playlist/main/playlist.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 3
            },
            {
                name: 'IPTV2',
                url: 'https://raw.githubusercontent.com/freiptv/IPTV2/master/playlist.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 4
            },
            {
                name: 'Public IPTV',
                url: 'https://publiciptv.com/iptv.m3u',
                category: 'Mixed',
                country: 'Worldwide',
                priority: 5
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

        console.log(`\n📊 TV Playlist Summary:`);
        console.log(`  - Total unique channels: ${allChannels.size}`);
        console.log(`  - Sources succeeded: ${successCount}/${this.sources.length}`);
        console.log(`  - Sources failed: ${errorCount}/${this.sources.length}`);

        return Array.from(allChannels.values());
    }

    /**
     * Fetch and parse M3U8 playlist
     */
    async fetchPlaylist(url, sourceInfo = {}) {
        const content = await this._fetchWithRetry(url, this.retries);
        return this._parseM3U(content, sourceInfo);
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
