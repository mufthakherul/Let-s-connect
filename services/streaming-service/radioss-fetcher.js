const https = require('https');

/**
 * Radioss.app Fetcher
 * - Attempts to fetch JSON list from https://stations.radioss.app/json/stations
 * - Gracefully handles Cloudflare / 403 by returning empty list (server-side fetch may succeed)
 */
class RadiossFetcher {
  constructor(options = {}) {
    this.url = options.url || 'https://stations.radioss.app/json/stations';
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 2;
    this.userAgent = options.userAgent || 'Let-s-Connect/StreamingFetcher/1.0';
  }

  async fetchAll() {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const data = await this._fetchOnce();
      if (Array.isArray(data)) return data.map(this._normalize);
      // on 403 or null try again with small backoff
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
    return [];
  }

  _normalize = (s) => ({
    name: s.name || s.title || '',
    streamUrl: s.url || s.stream || s.listen_url || '',
    websiteUrl: s.website || s.homepage || '',
    genre: s.tags || s.genre || '',
    country: s.country || '',
    language: s.language || '',
    logoUrl: s.logo || s.favicon || '',
    bitrate: s.bitrate || 0,
    source: 'radioss',
    metadata: s
  })

  async _fetchOnce() {
    return new Promise((resolve) => {
      const req = https.get(this.url, { headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' }, timeout: this.timeout }, (res) => {
        let body = '';
        res.on('data', (c) => body += c.toString());
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
          } else {
            // Return null for Cloudflare/403/etc so caller can fallback
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }
}

module.exports = RadiossFetcher;
