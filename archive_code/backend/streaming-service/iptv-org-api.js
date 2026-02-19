const https = require('https');

/**
 * IPTV-ORG API Integration
 * Fetches TV channels, categories, and languages from official IPTV-ORG API
 * Reference: https://github.com/iptv-org/api
 */
class IPTVOrgAPI {
    constructor(options = {}) {
        this.baseUrl = 'https://iptv-org.github.io/api';
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 3;
        this.cacheDir = options.cacheDir || './cache';
        this.cache = new Map();
    }

    /**
     * Fetch all TV channels from IPTV-ORG
     * Supports filtering by country, category, language
     */
    async fetchChannels(filters = {}) {
        console.log('📡 Fetching channels from IPTV-ORG...');

        try {
            const channelsUrl = `${this.baseUrl}/channels.json`;
            const allChannels = await this._fetchWithCache(channelsUrl);

            if (!Array.isArray(allChannels)) {
                throw new Error('Invalid channels format');
            }

            console.log(`✅ Fetched ${allChannels.length} total channels from IPTV-ORG`);

            // Apply filters
            let filtered = allChannels;

            if (filters.country) {
                filtered = filtered.filter(ch =>
                    ch.country?.toLowerCase() === filters.country.toLowerCase()
                );
                console.log(`  📍 Filtered to ${filtered.length} channels for ${filters.country}`);
            }

            if (filters.category) {
                const category = filters.category.toLowerCase();
                filtered = filtered.filter(ch =>
                    ch.categories?.some(c => c.toLowerCase() === category)
                );
                console.log(`  📂 Filtered to ${filtered.length} channels in ${filters.category}`);
            }

            if (filters.language) {
                filtered = filtered.filter(ch =>
                    ch.languages?.some(l => l.toLowerCase() === filters.language.toLowerCase())
                );
                console.log(`  🗣️ Filtered to ${filtered.length} channels for ${filters.language}`);
            }

            // Convert to internal format
            return filtered.map(ch => this._normalizeChannel(ch));
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG channels: ${error.message}`);
            return [];
        }
    }

    /**
     * Get available categories from IPTV-ORG
     */
    async getCategories() {
        console.log('📂 Fetching IPTV-ORG categories...');

        try {
            const categoriesUrl = `${this.baseUrl}/categories.json`;
            const categories = await this._fetchWithCache(categoriesUrl);

            if (!Array.isArray(categories)) {
                throw new Error('Invalid categories format');
            }

            console.log(`✅ Found ${categories.length} categories`);

            // Extract category names
            return categories.map(c => ({
                id: c.id,
                name: c.name,
                channelCount: 0
            }));
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG categories: ${error.message}`);
            return [];
        }
    }

    /**
     * Get available countries from IPTV-ORG
     */
    async getCountries() {
        console.log('🌍 Fetching IPTV-ORG countries...');

        try {
            const countriesUrl = `${this.baseUrl}/countries.json`;
            const countries = await this._fetchWithCache(countriesUrl);

            if (!Array.isArray(countries)) {
                throw new Error('Invalid countries format');
            }

            console.log(`✅ Found ${countries.length} countries`);

            return countries.map(c => ({
                code: c.code,
                name: c.name,
                channelCount: 0
            }));
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG countries: ${error.message}`);
            return [];
        }
    }

    /**
     * Get available languages from IPTV-ORG
     */
    async getLanguages() {
        console.log('🗣️ Fetching IPTV-ORG languages...');

        try {
            const languagesUrl = `${this.baseUrl}/languages.json`;
            const languages = await this._fetchWithCache(languagesUrl);

            if (!Array.isArray(languages)) {
                throw new Error('Invalid languages format');
            }

            console.log(`✅ Found ${languages.length} languages`);

            return languages.map(l => ({
                code: l.code,
                name: l.name,
                channelCount: 0
            }));
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG languages: ${error.message}`);
            return [];
        }
    }

    /**
     * Get regional collections from IPTV-ORG
     */
    async getRegions() {
        console.log('🗺️ Fetching IPTV-ORG regions...');

        try {
            const regionsUrl = `${this.baseUrl}/regions.json`;
            const regions = await this._fetchWithCache(regionsUrl);

            if (!Array.isArray(regions)) {
                throw new Error('Invalid regions format');
            }

            console.log(`✅ Found ${regions.length} regions`);

            return regions;
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG regions: ${error.message}`);
            return [];
        }
    }

    /**
     * Get streams from IPTV-ORG streams.json
     */
    async getStreams(filters = {}) {
        console.log('🌊 Fetching streams from IPTV-ORG...');

        try {
            const streamsUrl = `${this.baseUrl}/streams.json`;
            const streams = await this._fetchWithCache(streamsUrl);

            if (!Array.isArray(streams)) {
                throw new Error('Invalid streams format');
            }

            console.log(`✅ Fetched ${streams.length} total streams`);

            // Apply filters
            let filtered = streams;

            if (filters.status) {
                filtered = filtered.filter(s =>
                    s.status?.toLowerCase() === filters.status.toLowerCase()
                );
            }

            if (filters.resolution) {
                filtered = filtered.filter(s =>
                    s.resolution?.toLowerCase() === filters.resolution.toLowerCase()
                );
            }

            return filtered;
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG streams: ${error.message}`);
            return [];
        }
    }

    /**
     * Get a single channel by IPTV-ORG id (uses internal cache when available)
     */
    async getChannelById(channelId) {
        if (!channelId) return null;
        // Ensure cache is populated
        const channels = await this.fetchChannels();
        return channels.find(c => c.id === channelId || (c.tvg && c.tvg.id === channelId)) || null;
    }

    /**
     * Fetch with intelligent caching
     */
    async _fetchWithCache(url) {
        // Check if already cached
        if (this.cache.has(url)) {
            const cached = this.cache.get(url);
            if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                // Cache valid for 24 hours
                return cached.data;
            }
        }

        const data = await this._fetch(url);

        // Store in cache
        this.cache.set(url, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Normalizes IPTV-ORG channel format to internal format
     */
    _normalizeChannel(channel) {
        return {
            name: channel.name || 'Unknown',
            description: channel.description || '',
            streamUrl: channel.url || '',
            epgUrl: channel.guide || '',
            category: (channel.categories && channel.categories[0]) || 'Mixed',
            country: channel.country || 'Unknown',
            language: (channel.languages && channel.languages[0]) || 'Unknown',
            logoUrl: channel.logo || this._generateLogoUrl(channel),
            resolution: channel.resolution || 'Unknown',
            isActive: true,
            source: 'iptv-org',
            playlistSource: 'IPTV-ORG',
            viewers: 0,
            metadata: {
                channelId: channel.id || '',
                tvgId: channel.tvg?.id || '',
                tvgName: channel.tvg?.name || '',
                originalName: channel.name || '',
                status: channel.status || 'ok',
                website: channel.website || '',
                email: channel.email || '',
                categories: channel.categories || [],
                languages: channel.languages || [],
                country: channel.country || ''
            }
        };
    }

    /**
     * Generate a fallback logo URL if not provided
     */
    _generateLogoUrl(channel) {
        // Try to use DuckDuckGo's search-based image API as fallback
        const channelName = encodeURIComponent(channel.name || 'TV');
        return `https://ui-avatars.com/api/?name=${channelName}&background=random&rounded=true`;
    }

    /**
     * Fetch JSON from URL with retry logic
     */
    async _fetch(url) {
        let lastError;

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                return await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, this.timeout);

                    https.get(url, {
                        headers: {
                            'User-Agent': 'TV-App/1.0 (+https://letsconnect.app)',
                            'Accept': 'application/json'
                        }
                    }, (res) => {
                        let data = '';

                        if (res.statusCode !== 200) {
                            clearTimeout(timeout);
                            reject(new Error(`HTTP ${res.statusCode}`));
                            return;
                        }

                        res.on('data', chunk => {
                            data += chunk;
                            if (data.length > 100 * 1024 * 1024) {
                                // Limit to 100MB
                                res.destroy();
                                reject(new Error('Response too large'));
                            }
                        });

                        res.on('end', () => {
                            clearTimeout(timeout);
                            try {
                                const parsed = JSON.parse(data);
                                resolve(parsed);
                            } catch (parseErr) {
                                reject(parseErr);
                            }
                        });
                    }).on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            } catch (error) {
                lastError = error;
                if (attempt < this.retries) {
                    // Exponential backoff
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
                }
            }
        }

        throw lastError || new Error('Fetch failed after retries');
    }

    /**
     * Summary stats about available channels
     */
    async getStats() {
        console.log('📊 Calculating IPTV-ORG statistics...');

        const [channels, categories, countries, languages] = await Promise.all([
            this.fetchChannels(),
            this.getCategories(),
            this.getCountries(),
            this.getLanguages()
        ]);

        // Count channels per category
        const categoryCount = {};
        for (const channel of channels) {
            const cat = channel.category || 'Unknown';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }

        // Count channels per country
        const countryCount = {};
        for (const channel of channels) {
            const country = channel.country || 'Unknown';
            countryCount[country] = (countryCount[country] || 0) + 1;
        }

        return {
            totalChannels: channels.length,
            totalCategories: categories.length,
            totalCountries: countries.length,
            totalLanguages: languages.length,
            channelsByCategory: categoryCount,
            channelsByCountry: countryCount,
            topCountries: Object.entries(countryCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            topCategories: Object.entries(categoryCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
        };
    }
}

module.exports = IPTVOrgAPI;
