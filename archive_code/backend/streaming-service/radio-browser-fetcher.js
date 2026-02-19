const http = require('http');
const https = require('https');
const dns = require('dns').promises;

/**
 * Fetches radio stations from radio-browser.info API
 * Implements official API recommendations with server discovery
 * Supports 800,000+ stations worldwide
 */
class RadioBrowserFetcher {
    constructor(options = {}) {
        this.apiDomain = 'all.api.radio-browser.info';
        this.fallbackServers = [
            'https://de1.api.radio-browser.info',
            'https://de2.api.radio-browser.info',
            'https://fi1.api.radio-browser.info',
            'https://nl1.api.radio-browser.info',
            'https://at1.api.radio-browser.info'
        ];
        this.servers = [];
        this.currentServerIndex = 0;
        this.timeout = options.timeout || 15000;
        this.retries = options.retries || 3;
        // WORLDWIDE: fetch all countries by not specifying country filter
        this.fetchWorldwide = options.fetchWorldwide !== false;
        // Explicit country codes if needed (all 2-letter ISO codes supported)
        this.countries = options.countries || [];
        this.userAgent = options.userAgent || 'Let-s-Connect-Streaming/2.0';
        this.maxRetries = options.maxRetries || 5;
    }

    /**
     * Initialize API servers via DNS discovery
     */
    async initializeServers() {
        try {
            console.log(`🔍 Discovering radio-browser.info API servers...`);
            const addresses = await dns.resolveSrv(`_api._tcp.${this.apiDomain}`);

            if (addresses && addresses.length > 0) {
                this.servers = addresses
                    .sort(() => Math.random() - 0.5) // Randomize as per API docs
                    .map(addr => `https://${addr.name}`);

                console.log(`✅ Found ${this.servers.length} API servers`);
                return this.servers;
            }
        } catch (error) {
            console.log(`⚠️  DNS discovery failed: ${error.message}`);
        }

        // Fallback to known servers
        this.servers = this.fallbackServers.sort(() => Math.random() - 0.5);
        console.log(`📡 Using ${this.servers.length} fallback servers`);
        return this.servers;
    }

    /**
     * Get current or next API server
     */
    _getCurrentServer() {
        if (this.servers.length === 0) {
            return this.fallbackServers[0];
        }
        return this.servers[this.currentServerIndex % this.servers.length];
    }

    /**
     * Rotate to next server on failure
     */
    _rotateServer() {
        this.currentServerIndex = (this.currentServerIndex + 1) %
            (this.servers.length || this.fallbackServers.length);
    }

    /**
     * Fetch stations by country code
     */
    async fetchByCountry(countryCode) {
        const server = this._getCurrentServer();
        const url = `${server}/json/stations/bycountrycode/${countryCode}`;
        return this._fetchWithRetry(url, this.retries);
    }

    /**
     * Fetch all stations worldwide
     */
    async fetchAllWorldwide(limit = 1000) {
        const server = this._getCurrentServer();
        const url = `${server}/json/stations?hidebroken=true&limit=${limit}`;
        return this._fetchWithRetry(url, this.retries);
    }

    /**
     * Fetch popular stations
     */
    async fetchPopular(limit = 100) {
        const server = this._getCurrentServer();
        const url = `${server}/json/stations/topclick/${limit}`;
        return this._fetchWithRetry(url, this.retries);
    }

    /**
     * Fetch stations by language
     */
    async fetchByLanguage(language) {
        const server = this._getCurrentServer();
        const url = `${server}/json/stations/bylanguage/${language}`;
        return this._fetchWithRetry(url, this.retries);
    }

    /**
     * Report click to station (as per API docs)
     */
    async reportClick(stationUuid) {
        try {
            const server = this._getCurrentServer();
            const url = `${server}/json/url/${stationUuid}`;
            await this._fetch(url);
        } catch (error) {
            // Non-critical, don't throw
            console.log(`  ℹ️  Click report skipped: ${error.message}`);
        }
    }

    /**
     * Fetch stations from multiple countries or worldwide
     * As per API docs: Use countrycode instead of country
     */
    async fetchMultipleCountries(countries = null) {
        const allStations = new Map();
        let fetchedCount = 0;
        let errorCount = 0;

        // Initialize servers if not done
        if (this.servers.length === 0) {
            await this.initializeServers();
        }

        if (this.fetchWorldwide && (!countries || countries.length === 0)) {
            // Fetch worldwide in batches
            console.log(`🌍 Fetching radio stations WORLDWIDE (800,000+ available)...`);

            try {
                let offset = 0;
                const batchSize = 10000;
                let hasMore = true;
                let batchCount = 0;

                while (hasMore && batchCount < 80) { // Safety limit: 800k stations
                    try {
                        const url = `${this._getCurrentServer()}/json/stations?hidebroken=true&limit=${batchSize}&offset=${offset}`;
                        const stations = await this._fetchWithRetry(url, this.retries);

                        if (!Array.isArray(stations) || stations.length === 0) {
                            hasMore = false;
                            break;
                        }

                        let batchAdded = 0;
                        for (const station of stations) {
                            // Use UUID as per API docs (not id)
                            if (station.url_resolved && station.name && station.stationuuid) {
                                const key = station.url_resolved.toLowerCase();
                                if (!allStations.has(key)) {
                                    allStations.set(key, {
                                        name: station.name,
                                        description: station.countrycode || '', // Use countrycode as per docs
                                        streamUrl: station.url_resolved,
                                        websiteUrl: station.homepage || '',
                                        genre: station.tags ? station.tags.split(',')[0] : 'Mixed',
                                        country: station.country || 'Unknown',
                                        countrycode: station.countrycode || '',
                                        language: station.language || 'Unknown',
                                        logoUrl: station.favicon || '',
                                        bitrate: this._estimateBitrate(station.bitrate) || 128,
                                        isActive: true,
                                        source: 'radio-browser',
                                        radioBrowserId: station.stationuuid, // Use UUID not ID
                                        metadata: {
                                            clicks: station.clicks || 0,
                                            votes: station.votes || 0,
                                            lastCheckTime: station.lastcheckok || 0,
                                            lastCheckStatus: station.lastcheckstatus || 'unknown'
                                        }
                                    });
                                    batchAdded++;
                                }
                            }
                        }

                        if (batchAdded > 0) {
                            batchCount++;
                            console.log(`  ⏳ Batch ${batchCount}: added ${batchAdded} stations (total: ${allStations.size})`);
                        }

                        offset += batchSize;
                        hasMore = stations.length === batchSize;
                    } catch (error) {
                        this._rotateServer();
                        console.log(`  ⚠️  Batch failed, rotating server: ${error.message}`);
                        // Continue to next batch
                    }
                }

                console.log(`\n✅ Worldwide fetch complete: ${allStations.size} unique stations`);
                return Array.from(allStations.values());
            } catch (error) {
                console.error(`❌ Worldwide fetch failed after retries: ${error.message}`);
                return Array.from(allStations.values());
            }
        } else {
            // Fetch specific countries
            const targetCountries = countries || this.countries;
            console.log(`🌍 Fetching radio stations from ${targetCountries.length} countries...`);

            for (const countryCode of targetCountries) {
                try {
                    const stations = await this.fetchByCountry(countryCode);
                    if (Array.isArray(stations)) {
                        let countryAdded = 0;
                        for (const station of stations) {
                            if (station.url_resolved && station.name && station.stationuuid) {
                                const key = station.url_resolved.toLowerCase();
                                if (!allStations.has(key)) {
                                    allStations.set(key, {
                                        name: station.name,
                                        description: station.countrycode || '',
                                        streamUrl: station.url_resolved,
                                        websiteUrl: station.homepage || '',
                                        genre: station.tags ? station.tags.split(',')[0] : 'Mixed',
                                        country: station.country || 'Unknown',
                                        countrycode: station.countrycode || '',
                                        language: station.language || 'Unknown',
                                        logoUrl: station.favicon || '',
                                        bitrate: this._estimateBitrate(station.bitrate) || 128,
                                        isActive: true,
                                        source: 'radio-browser',
                                        radioBrowserId: station.stationuuid,
                                        metadata: {
                                            clicks: station.clicks || 0,
                                            votes: station.votes || 0,
                                            lastCheckTime: station.lastcheckok || 0
                                        }
                                    });
                                    countryAdded++;
                                }
                            }
                        }
                        fetchedCount += countryAdded;
                        console.log(`  ✅ ${countryCode}: ${countryAdded} new stations added`);
                    }
                } catch (error) {
                    errorCount++;
                    this._rotateServer();
                    console.log(`  ⚠️  ${countryCode}: ${error.message} (rotating server)`);
                }
            }

            console.log(`\n📊 Radio Browser Summary:`);
            console.log(`  - Total unique stations: ${allStations.size}`);
            console.log(`  - Countries processed: ${targetCountries.length - errorCount}/${targetCountries.length}`);
            console.log(`  - Failed: ${errorCount}`);

            return Array.from(allStations.values());
        }
    }

    /**
     * Estimate bitrate from API data
     */
    _estimateBitrate(bitrate) {
        if (!bitrate) return 128;
        const parsed = parseInt(bitrate);
        return isNaN(parsed) ? 128 : Math.min(Math.max(parsed, 32), 320);
    }

    /**
     * Fetch with retry logic and server rotation
     * As per API docs: retry with different servers
     */
    async _fetchWithRetry(url, retries = 3) {
        let lastError;
        let attemptCount = 0;
        const maxAttempts = Math.min(retries * (this.servers.length || 1), this.maxRetries);

        while (attemptCount < maxAttempts) {
            attemptCount++;
            try {
                const data = await this._fetch(url);
                return data;
            } catch (error) {
                lastError = error;

                // Rotate to next server on failure
                this._rotateServer();

                if (attemptCount < maxAttempts) {
                    // Exponential backoff: 1s, 2s, 4s, 8s
                    const delay = Math.pow(2, Math.min(attemptCount - 1, 3)) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Failed to fetch after ${attemptCount} attempts: ${lastError.message}`);
    }

    /**
     * Make HTTP/HTTPS request with proper User-Agent
     * As per API docs: Send a speaking http agent string
     */
    async _fetch(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            protocol.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            }, (res) => {
                clearTimeout(timeoutId);
                let body = '';
                let size = 0;
                const maxSize = 100 * 1024 * 1024; // 100MB safety limit

                if (res.statusCode !== 200) {
                    reject(new Error(`API returned status ${res.statusCode}`));
                    res.resume();
                    return;
                }

                res.on('data', chunk => {
                    size += chunk.length;
                    if (size > maxSize) {
                        res.destroy();
                        reject(new Error(`Response exceeds ${maxSize / 1024 / 1024}MB limit`));
                        return;
                    }
                    body += chunk;
                });

                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        resolve(data);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                });
            }).on('error', reject);
        });
    }
}

module.exports = RadioBrowserFetcher;

module.exports = RadioBrowserFetcher;
