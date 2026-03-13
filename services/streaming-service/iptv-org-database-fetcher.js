const https = require('https');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * IPTV-ORG Database CSV Fetcher
 * Fetches and parses ALL CSV files from https://github.com/iptv-org/database/tree/master/data
 * Includes comprehensive channel data, logos, feeds (streams), countries, categories, languages,
 * regions, subdivisions, cities, timezones, and blocklist for complete IPTV database integration
 */
class IPTVOrgDatabaseFetcher {
    constructor(options = {}) {
        this.baseUrl = 'https://raw.githubusercontent.com/iptv-org/database/master/data';
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 3;
        this.cacheDir = options.cacheDir || process.env.STREAMING_CACHE_DIR || path.join('/tmp', 'streaming-service-cache');
        this.cache = new Map();

        // CSV files to fetch from the database
        this.csvFiles = [
            'channels.csv',      // Main channels data
            'countries.csv',     // Country information
            'categories.csv',    // Category definitions
            'languages.csv',     // Language information
            'regions.csv',       // Regional groupings
            'subdivisions.csv',  // Subdivisions within countries
            'streams.csv',       // Legacy stream URLs and metadata
            'feeds.csv',         // Current stream URLs and metadata
            'logos.csv',         // Logo information
            'cities.csv',        // City information
            'timezones.csv',     // Timezone information
            'blocklist.csv'      // Blocked channels
        ];

        // Ensure cache directory exists
        try {
            if (this.cacheDir && !fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
        } catch (error) {
            console.log(`⚠️  Could not initialize IPTV cache dir "${this.cacheDir}": ${error.message}. Continuing without file cache.`);
            this.cacheDir = null;
        }
    }

    /**
     * Fetch all TV channels from IPTV-ORG database CSV files
     */
    async fetchAllChannels() {
        console.log('📊 Fetching channels from IPTV-ORG database (all CSV files)...');

        try {
            // Fetch all CSV data
            const csvData = await this._fetchAllCSVs();

            // Parse and merge the data
            const channels = this._mergeCSVData(csvData);

            console.log(`✅ Successfully parsed ${channels.length} channels from IPTV-ORG database`);

            return channels;
        } catch (error) {
            console.error(`❌ Failed to fetch IPTV-ORG database: ${error.message}`);
            return [];
        }
    }

    /**
     * Fetch channels by category
     */
    async fetchChannelsByCategory(category) {
        const allChannels = await this.fetchAllChannels();
        return allChannels.filter(ch =>
            ch.category?.toLowerCase().includes(category.toLowerCase()) ||
            ch.categories?.some(cat => cat.toLowerCase().includes(category.toLowerCase()))
        );
    }

    /**
     * Fetch channels by country
     */
    async fetchChannelsByCountry(country) {
        const allChannels = await this.fetchAllChannels();
        return allChannels.filter(ch =>
            ch.country?.toLowerCase() === country.toLowerCase() ||
            ch.countryCode?.toLowerCase() === country.toLowerCase()
        );
    }

    /**
     * Fetch all CSV files and parse them
     */
    async _fetchAllCSVs() {
        const results = {};

        for (const csvFile of this.csvFiles) {
            try {
                console.log(`  ⏳ Fetching ${csvFile}...`);
                const url = `${this.baseUrl}/${csvFile}`;
                const csvContent = await this._fetchWithCache(url);

                if (csvContent) {
                    results[csvFile.replace('.csv', '')] = parse(csvContent, {
                        columns: true,
                        skip_empty_lines: true,
                        trim: true
                    });
                    console.log(`  ✅ ${csvFile}: ${results[csvFile.replace('.csv', '')].length} records`);
                } else {
                    console.log(`  ⚠️  ${csvFile}: failed to fetch`);
                }
            } catch (error) {
                console.log(`  ⚠️  ${csvFile}: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Merge CSV data into unified channel objects
     */
    _mergeCSVData(csvData) {
        const channels = [];
        const channelMap = new Map();
        const countryMap = new Map();
        const categoryMap = new Map();
        const languageMap = new Map();
        const feedMap = new Map(); // feeds.csv contains stream data
        const logoMap = new Map();
        const cityMap = new Map();
        const timezoneMap = new Map();
        const blocklist = new Set();

        // Build lookup maps
        if (csvData.countries) {
            csvData.countries.forEach(country => {
                countryMap.set(country.code, country);
            });
        }

        if (csvData.categories) {
            csvData.categories.forEach(category => {
                categoryMap.set(category.id, category);
            });
        }

        if (csvData.languages) {
            csvData.languages.forEach(language => {
                languageMap.set(language.code, language);
            });
        }

        if (csvData.streams) {
            csvData.streams.forEach(stream => {
                if (stream.channel) {
                    if (!feedMap.has(stream.channel)) {
                        feedMap.set(stream.channel, []);
                    }
                    // Mark as legacy streams for comparison
                    feedMap.get(stream.channel).push({ ...stream, source: 'streams.csv' });
                }
            });
        }

        if (csvData.feeds) {
            csvData.feeds.forEach(feed => {
                if (feed.channel) {
                    if (!feedMap.has(feed.channel)) {
                        feedMap.set(feed.channel, []);
                    }
                    // Mark as current feeds
                    feedMap.get(feed.channel).push({ ...feed, source: 'feeds.csv' });
                }
            });
        }

        if (csvData.logos) {
            csvData.logos.forEach(logo => {
                if (logo.channel) {
                    if (!logoMap.has(logo.channel)) {
                        logoMap.set(logo.channel, []);
                    }
                    logoMap.get(logo.channel).push(logo);
                }
            });
        }

        if (csvData.cities) {
            csvData.cities.forEach(city => {
                const key = `${city.country}-${city.subdivision}-${city.code}`;
                cityMap.set(key, city);
            });
        }

        if (csvData.timezones) {
            csvData.timezones.forEach(timezone => {
                timezoneMap.set(timezone.code, timezone);
            });
        }

        if (csvData.blocklist) {
            csvData.blocklist.forEach(blocked => {
                if (blocked.channel) {
                    blocklist.add(blocked.channel);
                }
            });
        }

        // Process main channels
        if (csvData.channels) {
            csvData.channels.forEach(channel => {
                const channelId = channel.id || channel.channel_id;
                if (!channelId) return;

                // Skip blocked channels
                if (blocklist.has(channelId)) {
                    return;
                }

                // Get associated feeds/streams (compare both sources)
                const allStreams = feedMap.get(channelId) || [];
                const feedsStreams = allStreams.filter(s => s.source === 'feeds.csv');
                const legacyStreams = allStreams.filter(s => s.source === 'streams.csv');

                // Choose best streams: prefer feeds.csv, fallback to streams.csv
                let streams = [];
                if (feedsStreams.length > 0) {
                    streams = feedsStreams;
                } else if (legacyStreams.length > 0) {
                    streams = legacyStreams;
                }

                // Get logo information
                const logos = logoMap.get(channelId) || [];

                // Get country info
                const countryInfo = countryMap.get(channel.country) || {};

                // Get category info
                const categoryInfo = channel.category ? categoryMap.get(channel.category) : null;

                // Get language info
                const languageInfo = channel.language ? languageMap.get(channel.language) : null;

                // Create channel object for each stream
                streams.forEach(stream => {
                    const channelObj = {
                        name: channel.name || stream.title || stream.name || 'Unknown',
                        description: channel.description || categoryInfo?.name || '',
                        streamUrl: stream.url || '',
                        epgUrl: channel.guide || stream.guide || '',
                        category: categoryInfo?.name || channel.category || 'Mixed',
                        country: countryInfo.name || channel.country || 'Unknown',
                        countryCode: channel.country || '',
                        language: languageInfo?.name || channel.language || stream.languages || 'Unknown',
                        logoUrl: this._getBestLogo(channel, logos, stream),
                        resolution: stream.quality || stream.format || channel.resolution || 'Unknown',
                        isActive: (stream.status !== 'blocked' && stream.status !== 'error') || (stream.is_main !== 'FALSE'),
                        source: 'iptv-org-database',
                        playlistSource: 'IPTV-ORG Database',
                        viewers: 0,
                        metadata: {
                            channelId: channelId,
                            streamId: stream.id || stream.feed || '',
                            tvgId: channel.tvg_id || '',
                            tvgName: channel.tvg_name || '',
                            originalName: channel.name || '',
                            status: stream.status || 'unknown',
                            quality: stream.quality || stream.format || '',
                            broadcastArea: stream.broadcast_area || '',
                            timezones: stream.timezones || '',
                            languages: stream.languages || '',
                            isMain: stream.is_main === 'TRUE',
                            codec: stream.codec || '',
                            bitrate: stream.bitrate || '',
                            streamSource: stream.source || 'feeds.csv', // Indicate which CSV source
                            website: channel.website || '',
                            email: channel.email || '',
                            categories: channel.category ? [categoryInfo?.name || channel.category] : [],
                            languages: channel.language ? [languageInfo?.name || channel.language] : [],
                            country: channel.country || '',
                            region: channel.region || '',
                            subdivision: channel.subdivision || ''
                        }
                    };

                    // Use channel ID + stream ID as unique key
                    const key = `${channelId}:${stream.id || stream.feed || stream.name}`;
                    if (!channelMap.has(key)) {
                        channelMap.set(key, channelObj);
                        channels.push(channelObj);
                    }
                });

                // If no streams found, create channel with basic info
                if (streams.length === 0) {
                    const channelObj = {
                        name: channel.name || 'Unknown',
                        description: channel.description || categoryInfo?.name || '',
                        streamUrl: '', // No stream URL available
                        epgUrl: channel.guide || '',
                        category: categoryInfo?.name || channel.category || 'Mixed',
                        country: countryInfo.name || channel.country || 'Unknown',
                        countryCode: channel.country || '',
                        language: languageInfo?.name || channel.language || 'Unknown',
                        logoUrl: this._getBestLogo(channel, logos),
                        resolution: 'Unknown',
                        isActive: false, // No stream available
                        source: 'iptv-org-database',
                        playlistSource: 'IPTV-ORG Database (no feeds)',
                        viewers: 0,
                        metadata: {
                            channelId: channelId,
                            tvgId: channel.tvg_id || '',
                            tvgName: channel.tvg_name || '',
                            originalName: channel.name || '',
                            status: 'no_feeds',
                            website: channel.website || '',
                            email: channel.email || '',
                            categories: channel.category ? [categoryInfo?.name || channel.category] : [],
                            languages: channel.language ? [languageInfo?.name || channel.language] : [],
                            country: channel.country || '',
                            region: channel.region || '',
                            subdivision: channel.subdivision || ''
                        }
                    };

                    channels.push(channelObj);
                }
            });
        }

        return channels;
    }

    /**
     * Get the best logo URL from available logo data
     */
    _getBestLogo(channel, logos, feed = null) {
        // If channel has a direct logo URL, use it
        if (channel.logo) {
            return channel.logo;
        }

        // Look for logos matching this channel
        if (logos && logos.length > 0) {
            // Prefer PNG format, then SVG, then others
            const pngLogos = logos.filter(logo => logo.format === 'PNG');
            const svgLogos = logos.filter(logo => logo.format === 'SVG');

            // Use PNG if available, otherwise SVG
            const bestLogos = pngLogos.length > 0 ? pngLogos : svgLogos;

            if (bestLogos.length > 0) {
                // Prefer logos with feed match, or just take the first one
                const feedLogo = feed ? bestLogos.find(logo => logo.feed === feed.id || logo.feed === feed.name) : null;
                return feedLogo ? feedLogo.url : bestLogos[0].url;
            }
        }

        // Fallback to generated logo
        return this._generateLogoUrl(channel);
    }

    /**
     * Generate fallback logo URL
     */
    _generateLogoUrl(channel) {
        const channelName = encodeURIComponent(channel.name || 'TV');
        return `https://ui-avatars.com/api/?name=${channelName}&background=random&rounded=true`;
    }

    /**
     * Fetch with caching
     */
    async _fetchWithCache(url) {
        const cacheFile = this.cacheDir ? path.join(this.cacheDir, this._urlToFilename(url)) : null;

        // Check cache first (24 hour expiry)
        if (cacheFile && fs.existsSync(cacheFile)) {
            const stats = fs.statSync(cacheFile);
            const age = Date.now() - stats.mtime.getTime();
            if (age < 24 * 60 * 60 * 1000) {
                try {
                    return fs.readFileSync(cacheFile, 'utf8');
                } catch (error) {
                    // Cache read failed, fetch fresh
                }
            }
        }

        // Fetch fresh data
        const data = await this._fetch(url);

        // Cache the result
        if (data && cacheFile) {
            try {
                fs.writeFileSync(cacheFile, data, 'utf8');
            } catch (error) {
                console.log(`⚠️  Failed to cache ${url}: ${error.message}`);
            }
        }

        return data;
    }

    /**
     * Convert URL to safe filename
     */
    _urlToFilename(url) {
        return url.replace(/[^a-zA-Z0-9]/g, '_') + '.cache';
    }

    /**
     * Fetch data from URL with retry logic
     */
    async _fetch(url) {
        let lastError;

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                return await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error(`Request timeout after ${this.timeout}ms`));
                    }, this.timeout);

                    https.get(url, {
                        headers: {
                            'User-Agent': 'Let-s-Connect-Streaming/2.0',
                            'Accept': 'text/csv,text/plain,*/*'
                        }
                    }, (res) => {
                        clearTimeout(timeout);

                        if (res.statusCode !== 200) {
                            reject(new Error(`HTTP ${res.statusCode}`));
                            res.resume();
                            return;
                        }

                        let data = '';
                        res.on('data', chunk => {
                            data += chunk;
                        });

                        res.on('end', () => {
                            resolve(data);
                        });
                    }).on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
            } catch (error) {
                lastError = error;
                if (attempt < this.retries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to fetch after ${this.retries} attempts: ${lastError.message}`);
    }
}

module.exports = IPTVOrgDatabaseFetcher;
