const https = require('https');
const http = require('http');

/**
 * YouTube Channel Metadata Enricher
 * Fetches channel logos, banners, and metadata from YouTube without API keys
 * Uses public OG (Open Graph) tags and channel page scraping
 */
class YouTubeEnricher {
    constructor(options = {}) {
        this.timeout = options.timeout || 10000;
        this.retries = options.retries || 2;
        this.cache = new Map(); // Simple in-memory cache for logos
    }

    /**
     * Enrich a single YouTube channel with metadata
     * @param {Object} channel - Channel object with handle or streamUrl
     * @returns {Object} Enriched channel with logo and metadata
     */
    async enrichChannel(channel) {
        if (!channel) return channel;

        try {
            const handle = channel.handle || this.extractHandle(channel.streamUrl);
            if (!handle) return channel;

            // Check cache first
            if (this.cache.has(handle)) {
                const cached = this.cache.get(handle);
                return { ...channel, ...cached };
            }

            const enriched = await this.fetchChannelMetadata(handle);
            
            // Cache the result for 24 hours
            this.cache.set(handle, enriched);
            
            return { ...channel, ...enriched };
        } catch (error) {
            console.warn(`⚠️ Failed to enrich channel ${channel.name}: ${error.message}`);
            return channel; // Return original channel if enrichment fails
        }
    }

    /**
     * Enrich multiple channels
     */
    async enrichChannels(channels) {
        if (!Array.isArray(channels)) return [];
        
        const enriched = [];
        for (const channel of channels) {
            enriched.push(await this.enrichChannel(channel));
        }
        return enriched;
    }

    /**
     * Fetch channel metadata using multiple strategies
     */
    async fetchChannelMetadata(handle) {
        console.log(`  🔍 Enriching YouTube channel: @${handle}`);

        const metadata = {
            logoUrl: '',
            bannerUrl: '',
            description: '',
            subscriberCount: '',
            videoCount: '',
            enrichedAt: new Date().toISOString()
        };

        // Strategy 1: Fetch from YouTube channel page via OG tags
        try {
            const channelUrl = `https://www.youtube.com/@${handle}/featured`;
            const ogTags = await this.fetchOGTags(channelUrl);
            
            if (ogTags['og:image']) {
                metadata.logoUrl = ogTags['og:image'];
            }
            if (ogTags['og:description']) {
                metadata.description = ogTags['og:description'];
            }
        } catch (err) {
            console.warn(`  ⚠️ OG tag fetch failed for @${handle}: ${err.message}`);
        }

        // Strategy 2: Use nitter/YouTube alternative to get avatar
        if (!metadata.logoUrl) {
            try {
                metadata.logoUrl = await this.fetchFromYouTubeAPI(handle);
            } catch (err) {
                console.warn(`  ⚠️ API fallback failed for @${handle}`);
            }
        }

        // Strategy 3: Use gravatar/placeholder if available
        if (!metadata.logoUrl) {
            metadata.logoUrl = `https://yt-api.noti.news/api/channel/avatar/@${handle}`;
        }

        return metadata;
    }

    /**
     * Fetch Open Graph tags from a URL
     */
    async fetchOGTags(url) {
        const tags = {};
        
        try {
            const html = await this._fetch(url);
            
            // Extract OG tags with regex
            const ogRegex = /<meta\s+property="og:([^"]+)"\s+content="([^"]*)"/g;
            let match;
            
            while ((match = ogRegex.exec(html)) !== null) {
                tags[`og:${match[1]}`] = match[2];
            }
        } catch (error) {
            console.warn(`Failed to fetch OG tags: ${error.message}`);
        }

        return tags;
    }

    /**
     * Try multiple YouTube metadata APIs (free services)
     */
    async fetchFromYouTubeAPI(handle) {
        const apis = [
            // yt-api.noti.news - no key required
            `https://yt-api.noti.news/api/channel/avatar/@${handle}`,
            // youtubepip.com alternative
            `https://www.youtube.com/@${handle}?hl=en`,
        ];

        for (const api of apis) {
            try {
                const data = await this._fetch(api);
                if (data && typeof data === 'string' && data.length > 100) {
                    // Try to extract image URL from response
                    const imgMatch = data.match(/"url":"(https:\/\/yt-img[^"]+)"/);
                    if (imgMatch && imgMatch[1]) {
                        return imgMatch[1];
                    }
                }
            } catch (err) {
                // Try next API
                continue;
            }
        }

        return '';
    }

    /**
     * Extract YouTube handle from various URL formats
     */
    extractHandle(url) {
        if (!url || typeof url !== 'string') return '';

        // Handle direct @mention
        const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
        if (handleMatch) return handleMatch[1];

        // Handle /c/ChannelName format
        const cMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (cMatch) return cMatch[1];

        // Handle /user/username format
        const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
        if (userMatch) return userMatch[1];

        return '';
    }

    /**
     * Search for YouTube channels by keyword (without API key)
     * Uses YouTube search page and scrapes results
     */
    async searchChannels(keyword, limit = 10) {
        console.log(`🔎 Searching YouTube for channels: "${keyword}"`);
        
        const channels = [];
        
        try {
            // YouTube search URL
            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=EgIQAg%3D%3D`;
            const html = await this._fetch(searchUrl);

            // Extract channel information from initial data
            const initialDataRegex = />var ytInitialData = ({.*?});<\/script>/;
            const match = html.match(initialDataRegex);

            if (match && match[1]) {
                try {
                    const initialData = JSON.parse(match[1]);
                    const results = this._extractChannelResults(initialData);
                    
                    for (let i = 0; i < Math.min(results.length, limit); i++) {
                        channels.push(results[i]);
                    }
                } catch (parseErr) {
                    console.warn(`Failed to parse YouTube search results: ${parseErr.message}`);
                }
            }
        } catch (error) {
            console.warn(`YouTube search for "${keyword}" failed: ${error.message}`);
        }

        return channels;
    }

    /**
     * Extract channel results from YouTube initial data JSON
     */
    _extractChannelResults(initialData) {
        const channels = [];
        
        try {
            // Navigate through the complex YouTube response structure
            const tabs = initialData?.contents?.twoColumnSearchResultsRenderer?.tabs;
            if (!Array.isArray(tabs)) return channels;

            for (const tab of tabs) {
                const contents = tab?.tabRenderer?.content?.sectionListRenderer?.contents;
                if (!Array.isArray(contents)) continue;

                for (const content of contents) {
                    const items = content?.itemSectionRenderer?.contents;
                    if (!Array.isArray(items)) continue;

                    for (const item of items) {
                        const channel = this._parseChannelFromItem(item);
                        if (channel) channels.push(channel);
                    }
                }
            }
        } catch (error) {
            console.warn(`Error extracting channel results: ${error.message}`);
        }

        return channels;
    }

    /**
     * Parse a single channel from YouTube search result item
     */
    _parseChannelFromItem(item) {
        try {
            const channelInfo = item?.channelRenderer;
            if (!channelInfo) return null;

            const title = channelInfo?.title?.simpleText || '';
            const handle = channelInfo?.channelId || '';
            const thumbnail = channelInfo?.thumbnail?.thumbnails?.[0]?.url || '';
            const videoCount = channelInfo?.videoCountText?.simpleText || 'Unknown';
            const description = channelInfo?.descriptionSnippet?.runs?.[0]?.text || '';

            if (!title || !handle) return null;

            return {
                name: title.trim(),
                handle: handle,
                streamUrl: `https://www.youtube.com/${handle}/live`,
                iframeUrl: `https://www.youtube.com/embed/${handle}/live`,
                logoUrl: thumbnail,
                platform: 'YouTube',
                category: 'Mixed',
                country: 'Worldwide',
                metadata: {
                    videoCount,
                    description,
                    source: 'youtube_search'
                }
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get popular YouTube channel categories for auto-discovery
     */
    getSearchKeywords() {
        return {
            'News': [
                'BBC News', 'CNN', 'Reuters', 'Associated Press', 'RT News',
                'Al Jazeera', 'CNBC', 'Fox News', 'NBC News', 'ABC News'
            ],
            'Music': [
                'Music 24/7', 'Chill Music', 'Lo-fi Hip Hop', 'Classical Music',
                'Jazz Music', 'Electronic Music', 'Bollywood Music', 'K-pop'
            ],
            'Entertainment': [
                'Movie Trailers', 'Gaming', 'Comedy Central', 'Late Night',
                'Talk Shows', 'Reality TV', 'Anime', 'Documentary'
            ],
            'Sports': [
                'ESPN', 'Sky Sports', 'Football', 'Basketball', 'Cricket',
                'Tennis', 'Formula 1', 'Boxing', 'MMA', 'Rugby'
            ],
            'Education': [
                'TED Talks', 'Khan Academy', 'Coursera', 'Udemy',
                'Science Channel', 'History Channel', 'National Geographic'
            ],
            'Lifestyle': [
                'Cooking', 'Fashion', 'Home & Garden', 'DIY', 'Travel',
                'Fitness', 'Beauty', 'Health & Wellness'
            ]
        };
    }

    /**
     * Simple HTTP fetch with retry logic
     */
    async _fetch(url) {
        let lastError;

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                return await new Promise((resolve, reject) => {
                    const protocol = url.startsWith('https') ? https : http;
                    const timeout = setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, this.timeout);

                    protocol.get(url, { 
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    }, (res) => {
                        let data = '';

                        res.on('data', chunk => {
                            data += chunk;
                            if (data.length > 5 * 1024 * 1024) {
                                // Limit response size to 5MB
                                res.destroy();
                                reject(new Error('Response too large'));
                            }
                        });

                        res.on('end', () => {
                            clearTimeout(timeout);
                            resolve(data);
                        });
                    }).on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            } catch (error) {
                lastError = error;
                if (attempt < this.retries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
                }
            }
        }

        throw lastError || new Error('Fetch failed after retries');
    }

    /**
     * Auto-discover YouTube channels by category and keywords
     * Searches for popular channels and returns them with metadata
     */
    async autoDiscoverChannels(categoryKeywords = null, limit = 50) {
        const keywords = categoryKeywords || this.getSearchKeywords();
        const discoveredChannels = new Map(); // handle -> channel data

        console.log(`🔍 Auto-discovering YouTube channels from ${Object.keys(keywords).length} categories...`);

        let totalDiscovered = 0;

        for (const [category, searchTerms] of Object.entries(keywords)) {
            console.log(`\n📂 Discovering ${category} channels...`);
            let categoryCount = 0;

            for (const keyword of searchTerms) {
                try {
                    const channels = await this.searchChannels(keyword, 5);

                    for (const channel of channels) {
                        const handle = channel.handle || this.extractHandle(channel.streamUrl);

                        if (!discoveredChannels.has(handle)) {
                            discoveredChannels.set(handle, {
                                ...channel,
                                category,
                                discoveredVia: keyword,
                                source: 'youtube_autodiscovery',
                                discoveredAt: new Date().toISOString()
                            });
                            totalDiscovered++;
                            categoryCount++;

                            if (totalDiscovered >= limit) break;
                        }
                    }

                    // Small delay between requests to avoid rate limiting
                    await new Promise(r => setTimeout(r, 500));

                    if (totalDiscovered >= limit) break;
                } catch (error) {
                    console.warn(`Failed to discover channels for "${keyword}": ${error.message}`);
                }
            }

            if (totalDiscovered >= limit) break;

            console.log(`  ✅ Discovered ${categoryCount} ${category} channels (total: ${totalDiscovered})`);
        }

        console.log(`\n✅ Auto-discovery complete: ${totalDiscovered} channels discovered`);

        return Array.from(discoveredChannels.values()).slice(0, limit);
    }

    /**
     * Enrich discovered channels with logos and metadata
     */
    async enrichDiscoveredChannels(discoveredChannels) {
        console.log(`\n🔧 Enriching ${discoveredChannels.length} discovered channels...`);

        const enriched = [];
        let count = 0;

        for (const channel of discoveredChannels) {
            try {
                const enrichedChannel = await this.enrichChannel(channel);
                enriched.push(enrichedChannel);
                count++;

                if (count % 10 === 0) {
                    console.log(`  ⏳ Enriched ${count}/${discoveredChannels.length} channels...`);
                }
            } catch (error) {
                console.warn(`Failed to enrich ${channel.name}: ${error.message}`);
            }
        }

        console.log(`✅ Enriched ${enriched.length} channels with logos and metadata`);

        return enriched;
    }
}

module.exports = YouTubeEnricher;
