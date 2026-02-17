const https = require('https');
const http = require('http');

/**
 * TV Channel Enrichment Service
 * Validates stream URLs, fetches logos from multiple sources, and deduplicates channels
 */
class ChannelEnricher {
    constructor(options = {}) {
        this.timeout = options.timeout || 5000;
        this.maxConcurrent = options.maxConcurrent || 10;
        this.logoCache = new Map();
        this.validateStreams = options.validateStreams !== false; // default true
    }

    /**
     * Enrich and validate a list of channels
     */
    async enrichChannels(channels, options = {}) {
        if (!Array.isArray(channels)) return [];

        console.log(`🔧 Enriching ${channels.length} channels...`);

        const enriched = [];
        const errors = [];

        // Process in batches to avoid overwhelming the system
        for (let i = 0; i < channels.length; i += this.maxConcurrent) {
            const batch = channels.slice(i, i + this.maxConcurrent);
            const batchResults = await Promise.allSettled(
                batch.map(ch => this.enrichChannel(ch, options))
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    if (result.value) {
                        enriched.push(result.value);
                    }
                } else {
                    errors.push(result.reason);
                }
            }
        }

        console.log(`✅ Enriched ${enriched.length} channels`);
        if (errors.length > 0) {
            console.log(`⚠️ ${errors.length} channels failed enrichment`);
        }

        return enriched;
    }

    /**
     * Enrich a single channel
     */
    async enrichChannel(channel, options = {}) {
        if (!channel || !channel.streamUrl) return null;

        try {
            // Validate stream URL if enabled
            if (this.validateStreams && options.validateStreams !== false) {
                const isValid = await this.validateStreamUrl(channel.streamUrl);
                if (!isValid) {
                    console.warn(`⚠️ Invalid stream: ${channel.name} (${channel.streamUrl})`);
                    if (options.skipInvalid) {
                        return null;
                    }
                    channel.isActive = false;
                }
            }

            // Enrich logo
            if (!channel.logoUrl || !this.isValidImageUrl(channel.logoUrl)) {
                const logo = await this.findBestLogo(channel);
                if (logo) {
                    channel.logoUrl = logo;
                }
            }

            // Add enrichment metadata
            channel.metadata = channel.metadata || {};
            channel.metadata.enrichedAt = new Date().toISOString();
            channel.metadata.enrichedVersion = '2.0';

            return channel;
        } catch (error) {
            console.warn(`Failed to enrich channel ${channel.name}: ${error.message}`);
            return channel; // Return with original data if enrichment fails
        }
    }

    /**
     * Find the best available logo for a channel
     */
    async findBestLogo(channel) {
        const logoSources = [];

        // Priority 1: Existing valid logo
        if (channel.logoUrl && this.isValidImageUrl(channel.logoUrl)) {
            logoSources.push(channel.logoUrl);
        }

        // Priority 2: Platform-specific logo fetchers
        if (channel.source === 'youtube' || channel.metadata?.platform === 'YouTube') {
            logoSources.push(await this.fetchYouTubeLogo(channel));
        }

        // Priority 3: Web-based logo searches
        logoSources.push(await this.fetchWebLogo(channel));

        // Priority 4: Generate fallback
        logoSources.push(this.generateFallbackLogo(channel));

        // Return first valid logo found
        for (const logo of logoSources) {
            if (logo && this.isValidImageUrl(logo)) {
                if (await this.verifyImageUrl(logo)) {
                    return logo;
                }
            }
        }

        // Final fallback
        return this.generateFallbackLogo(channel);
    }

    /**
     * Fetch YouTube channel logo
     */
    async fetchYouTubeLogo(channel) {
        try {
            const handle = channel.metadata?.handle ||
                this.extractYouTubeHandle(channel.streamUrl);

            if (!handle) return null;

            // YouTube channel avatar API (no auth required)
            // https://www.youtube.com/@[handle]/featured?v=[video_id] contains OG:image
            const url = `https://www.youtube.com/@${handle}/featured`;
            const ogImage = await this.fetchOGImage(url);

            return ogImage;
        } catch (error) {
            return null;
        }
    }

    /**
     * Fetch Open Graph image from URL
     */
    async fetchOGImage(url) {
        try {
            const html = await this._fetch(url, { timeout: 3000 });

            // Extract og:image
            const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            if (match && match[1]) {
                return match[1];
            }

            // Alternative: Try twitter:image
            const twitterMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
            if (twitterMatch && twitterMatch[1]) {
                return twitterMatch[1];
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Fetch logo using web search fallback
     */
    async fetchWebLogo(channel) {
        try {
            const channelName = channel.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);

            // Use ui-avatars.com as a reliable fallback
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}&background=random&rounded=true&bold=true`;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate fallback logo URL
     */
    generateFallbackLogo(channel) {
        const name = (channel.name || 'TV').slice(0, 50);

        // Use different sources in priority order
        const options = [
            // UI Avatars - very reliable
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&rounded=true`,

            // DiceBear - another reliable option
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,

            // LetterAvatar
            `https://www.gravatar.com/avatar/${this._md5(name)}?d=identicon&s=256`,

            // Simple gradient background
            `https://via.placeholder.com/300x140?text=${encodeURIComponent(name.slice(0, 20))}`
        ];

        // Return first option or randomize
        return options[0];
    }

    /**
     * Validate if URL is in valid image format
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;

        // Check for valid protocols
        if (!url.match(/^https?:\/\//i) && !url.match(/^data:image\//i)) {
            return false;
        }

        // Check for valid image extensions
        const path = url.split('?')[0].toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

        if (!imageExts.some(ext => path.endsWith(ext)) && !url.includes('avatar') && !url.includes('image')) {
            return false;
        }

        return true;
    }

    /**
     * Verify if image URL is actually accessible
     */
    async verifyImageUrl(url) {
        if (!url) return false;

        try {
            return await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 2000);

                const protocol = url.startsWith('https') ? https : http;
                protocol.head(url, { timeout: 2000 }, (res) => {
                    clearTimeout(timeout);
                    resolve(res.statusCode >= 200 && res.statusCode < 300);
                }).on('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate if a stream URL is accessible
     */
    async validateStreamUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            // For YouTube streams, consider them valid by default
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                return true;
            }

            // For IPTV streams, do a quick HEAD request
            return await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), this.timeout);

                const protocol = url.startsWith('https') ? https : http;
                const req = protocol.head(url, { timeout: this.timeout, maxRedirects: 3 }, (res) => {
                    clearTimeout(timeout);
                    // Accept 2xx, 3xx, and some 4xx (404 might be temporary)
                    // Reject only clear errors like 403, 410, 451
                    const code = res.statusCode;
                    resolve(!(code === 403 || code === 410 || code === 451 || code >= 500));
                });

                req.on('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });

                req.end();
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Deduplicate channels by stream URL
     */
    deduplicateChannels(channels) {
        const seen = new Map();
        const deduplicated = [];
        let duplicates = 0;

        for (const channel of channels) {
            const streamUrl = (channel.streamUrl || '').toLowerCase().trim();

            if (!streamUrl) {
                continue; // Skip channels without stream URL
            }

            if (seen.has(streamUrl)) {
                // Keep the one with better data (has logo, etc)
                const existing = seen.get(streamUrl);
                if (channel.logoUrl && !existing.logoUrl) {
                    seen.set(streamUrl, channel);
                    duplicates++;
                } else {
                    duplicates++;
                }
            } else {
                seen.set(streamUrl, channel);
                deduplicated.push(channel);
            }
        }

        if (duplicates > 0) {
            console.log(`🔄 Removed ${duplicates} duplicate channels`);
        }

        return deduplicated;
    }

    /**
     * Extract YouTube handle from URL
     */
    extractYouTubeHandle(url) {
        if (!url || typeof url !== 'string') return '';

        const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
        if (handleMatch) return handleMatch[1];

        const cMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (cMatch) return cMatch[1];

        const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
        if (userMatch) return userMatch[1];

        return '';
    }

    /**
     * Simple MD5-like hash for gravatar
     */
    _md5(str) {
        // Simple hash for gravatar (not cryptographic)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return (hash >>> 0).toString(16).padStart(32, '0');
    }

    /**
     * Fetch with timeout
     */
    async _fetch(url, options = {}) {
        const timeout = options.timeout || this.timeout;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Timeout'));
            }, timeout);

            const protocol = url.startsWith('https') ? https : http;

            protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout
            }, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                    if (data.length > 1024 * 1024) {
                        res.destroy();
                        clearTimeout(timer);
                        reject(new Error('Response too large'));
                    }
                });

                res.on('end', () => {
                    clearTimeout(timer);
                    resolve(data);
                });
            }).on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
}

module.exports = ChannelEnricher;
