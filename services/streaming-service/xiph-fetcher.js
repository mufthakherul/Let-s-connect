const https = require('https');

/**
 * Xiph Directory Fetcher
 * - Fetches and parses the Icecast directory XML at https://dir.xiph.org/yp.xml
 * - Returns an array of station objects normalized for seeding
 */
class XiphFetcher {
  constructor(options = {}) {
    this.url = options.url || 'https://dir.xiph.org/yp.xml';
    this.timeout = options.timeout || 15000;
  }

  async fetchAll() {
    const raw = await this._fetch(this.url);
    if (!raw) return [];

    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(raw)) !== null) {
      const block = match[1];

      const getTag = (tag) => {
        const re = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`, 'i');
        const m = block.match(re);
        return m && m[1] ? m[1].trim() : '';
      };

      const server_name = getTag('server_name');
      const listen_url = getTag('listen_url');
      const server_type = getTag('server_type');
      const bitrate = parseInt(getTag('bitrate')) || 0;
      const genre = getTag('genre');

      if (!listen_url || !server_name) continue;

      entries.push({
        name: server_name,
        streamUrl: listen_url,
        serverType: server_type,
        bitrate: bitrate,
        genre: genre,
        source: 'xiph',
        metadata: {}
      });
    }

    return entries;
  }

  async _fetch(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Let-s-Connect/1.0' }, timeout: this.timeout }, (res) => {
        let data = '';
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        res.on('data', (c) => (data += c.toString()));
        res.on('end', () => resolve(data));
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }
}

module.exports = XiphFetcher;
