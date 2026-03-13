const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');
const { syncWithPolicy } = require('../shared/db-sync-policy');
require('dotenv').config({ quiet: true });

// Import dynamic fetchers
const RadioBrowserFetcher = require('./radio-browser-fetcher');
const IPTVOrgDatabaseFetcher = require('./iptv-org-database-fetcher');
const XiphFetcher = require('./xiph-fetcher');
const RadiossFetcher = require('./radioss-fetcher');
const YouTubeEnricher = require('./youtube-enricher');
const IPTVOrgAPI = require('./iptv-org-api');
const ChannelEnricher = require('./channel-enricher');

// ==================== MODE CONFIGURATION ====================

const CANONICAL_SEED_MODES = new Set(['skip', 'minimal', 'full', 'fast', 'dry-run']);

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeSeedMode(raw) {
    const candidate = String(raw || '').toLowerCase().trim();
    if (CANONICAL_SEED_MODES.has(candidate)) return candidate;

    // Legacy aliases/backward compatibility
    if (candidate === 'none') return 'skip';
    if (candidate === 'quick' || candidate === 'lite') return 'minimal';
    if (candidate === 'complete') return 'full';
    if (candidate === 'dry' || candidate === 'fetch-only') return 'dry-run';

    // Backward compatibility requirement: if SEED_MODE is unset and USE_FULL_SEED=true => full
    if (!candidate) {
        return parseBoolean(process.env.USE_FULL_SEED, false) ? 'full' : 'minimal';
    }

    console.log(`⚠️  Unknown SEED_MODE='${raw}'. Falling back to 'minimal'`);
    return 'minimal';
}

const RAW_SEED_MODE = process.env.SEED_MODE;
const SEED_MODE = normalizeSeedMode(RAW_SEED_MODE);

const IS_SKIP_MODE = SEED_MODE === 'skip';
const IS_MINIMAL_MODE = SEED_MODE === 'minimal';
const IS_FULL_MODE = SEED_MODE === 'full';
const IS_FAST_MODE = SEED_MODE === 'fast';
const IS_DRY_RUN_MODE = SEED_MODE === 'dry-run';

const SEED_MINIMAL_RADIO_LIMIT = parseNumber(process.env.SEED_MINIMAL_RADIO_LIMIT, 50);
const SEED_MINIMAL_TV_LIMIT = parseNumber(process.env.SEED_MINIMAL_TV_LIMIT, 50);

// Fast-mode optimization toggles (with sane defaults for fast)
const FAST_DISABLE_STREAM_VALIDATION = parseBoolean(
    process.env.SEED_FAST_DISABLE_STREAM_VALIDATION,
    IS_FAST_MODE
);
const FAST_DISABLE_LOGO_NETWORK = parseBoolean(
    process.env.SEED_FAST_DISABLE_LOGO_NETWORK,
    IS_FAST_MODE
);
const FAST_DISABLE_YOUTUBE_ENRICHMENT = parseBoolean(
    process.env.SEED_FAST_DISABLE_YOUTUBE_ENRICHMENT,
    IS_FAST_MODE
);
const FAST_DISABLE_DELAYS = parseBoolean(
    process.env.SEED_FAST_DISABLE_DELAYS,
    IS_FAST_MODE
);
const FAST_SKIP_PER_ITEM_PRECHECK = parseBoolean(
    process.env.SEED_FAST_SKIP_PER_ITEM_PRECHECK,
    IS_FAST_MODE
);

const CHUNK_DELAY_MS = parseNumber(
    process.env.SEED_CHUNK_DELAY_MS,
    FAST_DISABLE_DELAYS ? 0 : 250
);
const SEED_DB_CONNECT_RETRIES = parseNumber(process.env.SEED_DB_CONNECT_RETRIES, 3);
const SEED_DB_CONNECT_RETRY_DELAY_MS = parseNumber(process.env.SEED_DB_CONNECT_RETRY_DELAY_MS, 2000);

const CHANNEL_ENRICH_MAX_CONCURRENT = parseNumber(
    process.env.SEED_CHANNEL_ENRICH_MAX_CONCURRENT,
    IS_FAST_MODE ? 20 : 5
);

// Database connection
const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/streaming',
    {
        dialect: 'postgres',
        logging: false
    }
);

// ==================== MODELS ====================

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
    metadata: DataTypes.JSONB,
    addedBy: DataTypes.UUID
});

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
    epgUrl: DataTypes.TEXT,
    category: DataTypes.STRING,
    country: DataTypes.TEXT,
    language: DataTypes.TEXT,
    logoUrl: DataTypes.TEXT,
    resolution: DataTypes.STRING,
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
});

async function ensureStreamingSchemaBootstrap() {
    const qi = sequelize.getQueryInterface();
    const rawTables = await qi.showAllTables();
    const tableNames = new Set(
        rawTables.map((entry) => (typeof entry === 'string' ? entry : entry.tableName || entry)).filter(Boolean)
    );

    const requiredTables = ['RadioStations', 'TVChannels'];
    const missingRequiredTable = requiredTables.some((tableName) => !tableNames.has(tableName));

    if (missingRequiredTable) {
        console.warn('[Streaming Seed] Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
        await sequelize.sync();
    }
}

function isMissingCoreTableError(error) {
    if (!error) return false;
    const msg = String(error.message || '');
    const sql = String(error.sql || error?.parent?.sql || '');
    return (
        (msg.includes('relation "RadioStations" does not exist') || msg.includes('relation "TVChannels" does not exist')) ||
        (sql.includes('"RadioStations"') || sql.includes('"TVChannels"')) && (error?.parent?.code === '42P01' || msg.includes('does not exist'))
    );
}

function isTransientDbConnectivityError(error) {
    if (!error) return false;
    const msg = String(error.message || '');
    const code = String(error.code || error?.parent?.code || '');
    return (
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        code === 'EAI_AGAIN' ||
        msg.includes('getaddrinfo ENOTFOUND postgres') ||
        msg.includes('connect ECONNREFUSED') ||
        msg.includes('Connection terminated unexpectedly')
    );
}

async function ensureDatabaseConnectivity(maxAttempts = SEED_DB_CONNECT_RETRIES, retryDelayMs = SEED_DB_CONNECT_RETRY_DELAY_MS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await sequelize.authenticate();
            if (attempt > 1) {
                console.log(`[Streaming Seed][DB_CONNECT] Recovered connectivity on attempt ${attempt}/${maxAttempts}.`);
            }
            return true;
        } catch (error) {
            const code = error?.parent?.code || error?.code || 'UNKNOWN';
            console.warn(`[Streaming Seed][DB_CONNECT] Attempt ${attempt}/${maxAttempts} failed (${code}): ${error.message}`);
            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
        }
    }
    return false;
}

// ==================== FETCHER FUNCTIONS ====================

function readJson(filePath, fallback = []) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.log(`⚠️  Failed to read JSON from ${filePath}: ${error.message}`);
        return fallback;
    }
}

function deduplicateByStreamUrl(items = []) {
    const map = new Map();
    for (const item of items) {
        const key = (item?.streamUrl || '').toLowerCase().trim();
        if (!key) continue;
        if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
}

/**
 * Fetch radio stations from online sources with improved robustness
 */
async function fetchRadioStations() {
    const staticPath = path.join(__dirname, 'seed-data', 'radio-stations.json');
    const fallbackData = JSON.parse(fs.readFileSync(staticPath, 'utf8'));

    console.log('🌐 Attempting to fetch radio stations from online sources...\n');

    // Helper: normalize station name for de-dup key
    const normalizeNameKey = (name = '', country = '') => {
        return (String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + '||' + String(country || '').toLowerCase()).trim();
    };

    try {
        const fetcher = new RadioBrowserFetcher({
            timeout: IS_FAST_MODE ? 10000 : 15000,
            retries: IS_FAST_MODE ? 0 : 3,
            fetchWorldwide: true  // Worldwide approach for maximum coverage
        });

        console.log('🔍 Initializing radio-browser.info API servers...');
        await fetcher.initializeServers();
        console.log('');

        // Primary source: radio-browser (worldwide)
        const rbStations = await fetcher.fetchMultipleCountries();
        console.log(`  ✅ radio-browser: ${Array.isArray(rbStations) ? rbStations.length : 0} stations fetched worldwide`);

        // Secondary: Xiph directory (yp.xml) - more robust
        let xiphStations = [];
        try {
            const xiph = new XiphFetcher({ timeout: IS_FAST_MODE ? 8000 : 15000 });
            xiphStations = await xiph.fetchAll();
            console.log(`  ✅ xiph directory: ${xiphStations.length} entries fetched`);
        } catch (error) {
            console.log(`  ⚠️  xiph directory fetch failed: ${error.message}`);
        }

        // Secondary: radioss.app (may be Cloudflare-protected) - try but tolerate failure
        let radiossStations = [];
        try {
            const radioss = new RadiossFetcher({
                timeout: IS_FAST_MODE ? 5000 : 10000,
                retries: IS_FAST_MODE ? 0 : 2
            });
            radiossStations = await radioss.fetchAll();
            if (radiossStations.length > 0) {
                console.log(`  ✅ radioss.app: ${radiossStations.length} stations fetched`);
            } else {
                console.log('  ℹ️ radioss.app: no data (may be blocked); continuing with other sources');
            }
        } catch (error) {
            console.log(`  ⚠️  radioss.app fetch failed: ${error.message}`);
        }

        // Combine all sources into a name-keyed Map to collect alternative URLs
        const map = new Map();

        const add = (s) => {
            if (!s) return;
            const name = s.name || s.server_name || s.title || '';
            const country = s.country || s.countrycode || '';
            const streamUrl = (s.streamUrl || s.listen_url || s.url || s.stream || '').trim();
            if (!name && !streamUrl) return;

            const key = name ? normalizeNameKey(name, country) : `__url__:${streamUrl}`;
            if (!map.has(key)) {
                const base = {
                    name: name || streamUrl || 'Unknown',
                    description: s.description || s.tags || '',
                    streamUrl: streamUrl || '',
                    websiteUrl: s.websiteUrl || s.homepage || s.website || '',
                    genre: s.genre || (s.tags ? (s.tags.split(',')[0] || '') : ''),
                    country: country || 'Unknown',
                    language: s.language || 'Unknown',
                    logoUrl: s.logoUrl || s.favicon || '',
                    bitrate: s.bitrate || s.bitrate_kbps || 0,
                    isActive: true,
                    source: s.source || 'combined',
                    metadata: s.metadata || {}
                };
                base.metadata.alternativeUrls = base.metadata.alternativeUrls || [];
                map.set(key, base);
            } else {
                const existing = map.get(key);
                // register alternative URL if different
                if (streamUrl && streamUrl !== existing.streamUrl && !existing.metadata.alternativeUrls.includes(streamUrl)) {
                    existing.metadata.alternativeUrls.push(streamUrl);
                }
                // prefer richer logo/website if missing
                if (!existing.logoUrl && (s.logoUrl || s.favicon)) existing.logoUrl = s.logoUrl || s.favicon;
                if (!existing.websiteUrl && (s.websiteUrl || s.homepage)) existing.websiteUrl = s.websiteUrl || s.homepage;
            }
        };

        // Add radio-browser stations (already normalized by fetcher)
        let rbAdded = 0;
        for (const s of rbStations) {
            add(s);
            rbAdded++;
        }

        // Add Xiph entries
        let xiphAdded = 0;
        for (const s of xiphStations) {
            add(s);
            xiphAdded++;
        }

        // Add radioss entries
        let radiossAdded = 0;
        for (const s of radiossStations) {
            add(s);
            radiossAdded++;
        }

        // Add static fallback as last-resort
        let staticAdded = 0;
        for (const s of fallbackData) {
            add(s);
            staticAdded++;
        }

        const combined = Array.from(map.values());
        console.log(`\n✅ Consolidated radio stations: ${combined.length} unique entries`);
        console.log(`  - Radio-browser: ${rbAdded} stations`);
        console.log(`  - Xiph directory: ${xiphAdded} stations`);
        console.log(`  - Radioss: ${radiossAdded} stations`);
        console.log(`  - Static fallback: ${staticAdded} stations`);
        console.log(`  📊 Total unique: ${combined.length} (collected alternative URLs where available)`);

        return combined;
    } catch (error) {
        console.log(`\n⚠️  Could not fetch radio stations from online sources: ${error.message}`);
        console.log(`📦 Falling back to ${fallbackData.length} static radio stations\n`);
        return fallbackData;
    }
}

/**
 * Fetch TV channels from IPTV-ORG API
 */
async function fetchIPTVOrgChannels() {
    console.log('🌐 Fetching channels from IPTV-ORG API...');
    try {
        const iptvAPI = new IPTVOrgAPI({
            timeout: IS_FAST_MODE ? 12000 : 30000,
            retries: IS_FAST_MODE ? 0 : 3
        });
        const channels = await iptvAPI.fetchChannels();

        if (channels && channels.length > 0) {
            console.log(`✅ Fetched ${channels.length} channels from IPTV-ORG`);
            return channels;
        } else {
            console.log('⚠️  IPTV-ORG returned no channels');
            return [];
        }
    } catch (error) {
        console.log(`⚠️  IPTV-ORG fetch failed: ${error.message}`);
        return [];
    }
}

/**
 * Fetch and enrich YouTube channels
 */
async function fetchYouTubeChannels() {
    const youtubeDataPath = path.join(__dirname, 'data', 'Youtube-Tv.json');

    console.log('🎥 Loading YouTube channels from local data...');
    try {
        if (!fs.existsSync(youtubeDataPath)) {
            console.log('⚠️  YouTube data file not found');
            return [];
        }

        const youtubeRaw = JSON.parse(fs.readFileSync(youtubeDataPath, 'utf8'));
        if (!Array.isArray(youtubeRaw)) return [];

        if (IS_FAST_MODE && FAST_DISABLE_YOUTUBE_ENRICHMENT) {
            console.log('⚡ Fast mode: loading YouTube channels without enrichment/checks');
            const channels = youtubeRaw
                .filter(ch => ch && ch.liveUrl)
                .map(ch => ({
                    name: ch.name || 'YouTube Live',
                    description: ch.categoryFull || ch.category || '',
                    streamUrl: ch.liveUrl,
                    epgUrl: '',
                    category: ch.category || 'Mixed',
                    country: ch.country || 'Worldwide',
                    language: 'Unknown',
                    logoUrl: ch.logoUrl || '',
                    resolution: 'Unknown',
                    isActive: true,
                    source: 'youtube',
                    metadata: {
                        platform: ch.platform || 'YouTube',
                        handle: ch.handle || ''
                    }
                }));

            console.log(`✅ Loaded ${channels.length} YouTube channels (no enrichment)`);
            return channels;
        }

        const enricher = new YouTubeEnricher({
            timeout: IS_FAST_MODE ? 3000 : 5000,
            retries: IS_FAST_MODE ? 0 : 1
        });

        console.log('🔧 Enriching YouTube channels with metadata and logos...');
        const enriched = await enricher.enrichChannels(youtubeRaw);

        console.log(`✅ Loaded and enriched ${enriched.length} YouTube channels`);
        return enriched;
    } catch (error) {
        console.log(`⚠️  YouTube enrichment failed: ${error.message}`);
        return [];
    }
}

/**
 * Fetch TV channels from IPTV-ORG database CSV files
 */
async function fetchTVChannels() {
    const staticPath = path.join(__dirname, 'seed-data', 'tv-channels.json');
    const fallbackData = JSON.parse(fs.readFileSync(staticPath, 'utf8'));

    console.log('🌐 Attempting to fetch TV channels from IPTV-ORG database...\n');

    try {
        const fetcher = new IPTVOrgDatabaseFetcher({
            timeout: IS_FAST_MODE ? 15000 : 30000,
            retries: IS_FAST_MODE ? 0 : 3
        });

        const channels = await fetcher.fetchAllChannels();

        if (channels && channels.length > 0) {
            console.log(`\n✅ Successfully fetched ${channels.length} TV channels from IPTV-ORG database`);
            return channels;
        } else {
            throw new Error('No channels fetched from database');
        }
    } catch (error) {
        console.log(`\n⚠️  Could not fetch from IPTV-ORG database: ${error.message}`);
        console.log(`📦 Falling back to ${fallbackData.length} static TV channels\n`);
        return fallbackData;
    }
}

/**
 * Merge online and fallback data intelligently
 */
function mergeData(onlineData, fallbackData, type = 'radio') {
    const merged = new Map();

    // Add online data first (prioritize newer online data)
    for (const item of onlineData) {
        const key = (item.streamUrl || '').toLowerCase();
        if (key && !merged.has(key)) {
            merged.set(key, item);
        }
    }

    // Add fallback data for missing items
    for (const item of fallbackData) {
        const key = (item.streamUrl || '').toLowerCase();
        if (key && !merged.has(key)) {
            merged.set(key, item);
        }
    }

    return Array.from(merged.values());
}

// ==================== SEED FUNCTION ====================

// Helper: sanitize strings from external sources to avoid accidental DB overflow
function sanitizeString(value, max = 1024) {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value.slice(0, max) : String(value).slice(0, max);
}

const seed = async () => {
    try {
        console.log('🌱 Starting streaming database seeding...\n');
        console.log(`📋 Seed mode (raw): ${RAW_SEED_MODE || '(unset)'}`);
        console.log(`📋 Seed mode (normalized): ${SEED_MODE}\n`);

        if (IS_DRY_RUN_MODE) {
            console.log('🔍 DRY-RUN MODE: Fetching data without database operations\n');
        }

        if (IS_FAST_MODE) {
            console.log('⚡ Fast mode optimizations:');
            console.log(`  - Stream validation disabled: ${FAST_DISABLE_STREAM_VALIDATION}`);
            console.log(`  - Logo fetch/verify disabled: ${FAST_DISABLE_LOGO_NETWORK}`);
            console.log(`  - YouTube enrichment disabled: ${FAST_DISABLE_YOUTUBE_ENRICHMENT}`);
            console.log(`  - Chunk delays disabled: ${FAST_DISABLE_DELAYS}`);
            console.log(`  - Per-item duplicate prechecks minimized: ${FAST_SKIP_PER_ITEM_PRECHECK}\n`);
        }

        console.log('═══════════════════════════════════════════\n');

        if (IS_SKIP_MODE) {
            console.log('⏭️  Seeding skipped (SEED_MODE=skip)\n');
            process.exit(0);
        }

        // Sync database (skip in dry-run mode)
        if (!IS_DRY_RUN_MODE) {
            console.log('🔧 Synchronizing database models...');
            await syncWithPolicy(sequelize, 'streaming-service-seed');
            await ensureStreamingSchemaBootstrap();
            console.log('✅ Database models sync step completed\n');

            const dbReachable = await ensureDatabaseConnectivity();
            if (!dbReachable) {
                console.warn('[Streaming Seed][ABORT] Database is unreachable after retries. Skipping remaining seed workload and starting service without seeding.');
                process.exit(0);
            }
        } else {
            console.log('🔍 Skipping database sync in dry-run mode\n');
        }

        // ========== RADIO STATIONS ==========
        console.log('═══════════════════════════════════════════');
        console.log('📻 RADIO STATIONS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        const staticRadioPath = path.join(__dirname, 'seed-data', 'radio-stations.json');
        const staticRadioData = readJson(staticRadioPath, []);

        let mergedRadio = [];
        if (IS_MINIMAL_MODE) {
            mergedRadio = staticRadioData.slice(0, SEED_MINIMAL_RADIO_LIMIT);
            console.log(`📦 Minimal mode: using static radio subset (${mergedRadio.length}/${staticRadioData.length})\n`);
        } else {
            let radioStations = [];
            try {
                radioStations = await fetchRadioStations();
            } catch (error) {
                if (IS_FAST_MODE) {
                    console.warn(`⚠️  Fast mode: fetch radio stations failed (${error.message}) — falling back to static data`);
                    radioStations = [];
                } else {
                    console.error('❌ Critical error fetching radio stations:', error.message);
                    console.error('Please check internet connection and API availability');
                    process.exit(1);
                }
            }

            if (!radioStations || radioStations.length === 0) {
                if (IS_FAST_MODE) {
                    console.warn('⚠️  Fast mode: no radio station data from online sources — using static data only');
                    radioStations = [];
                } else {
                    console.error('❌ No radio station data available');
                    process.exit(1);
                }
            }

            mergedRadio = mergeData(radioStations, staticRadioData, 'radio');
            console.log(`📊 Merged Data: ${mergedRadio.length} unique radio stations`);
            console.log(`  - Online sources: ${radioStations.length}`);
            console.log(`  - Static fallback: ${staticRadioData.length}`);
            console.log(`  - Total unique: ${mergedRadio.length}\n`);
        }

        if (IS_DRY_RUN_MODE) {
            console.log(`🔍 DRY-RUN: Would seed ${mergedRadio.length} radio stations to database\n`);
            console.log('📊 Sample radio stations:');
            mergedRadio.slice(0, 5).forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.name} (${station.country}) - ${station.streamUrl}`);
            });
            console.log('  ... (showing first 5 of', mergedRadio.length, 'stations)\n');
        } else {
            console.log(`🔄 Seeding ${mergedRadio.length} radio stations to database...\n`);

            const radioReport = {
                created: 0,
                skipped: 0,
                updatedAlternatives: 0,
                byCountry: {},
                bySource: {}
            };

            let abortedRadioBySchemaIssue = false;
            let radioGenericErrorCount = 0;
            let radioGenericErrorLogged = 0;
            for (let stationIndex = 0; stationIndex < mergedRadio.length; stationIndex++) {
                const station = mergedRadio[stationIndex];
                try {
                    // Try to find existing by streamUrl OR by strong name+country match
                    const where = (IS_FAST_MODE && FAST_SKIP_PER_ITEM_PRECHECK)
                        ? { streamUrl: station.streamUrl }
                        : {
                            [Op.or]: [
                                { streamUrl: station.streamUrl },
                                {
                                    name: { [Op.iLike]: station.name || '' },
                                    country: station.country || null
                                }
                            ]
                        };

                    const existing = await RadioStation.findOne({ where });

                    if (existing) {
                        const incomingUrl = (station.streamUrl || '').trim();
                        const meta = existing.metadata || {};
                        meta.alternativeUrls = meta.alternativeUrls || [];

                        // If this is a different URL, add as alternative URL (fallback)
                        if (incomingUrl && incomingUrl !== existing.streamUrl && !meta.alternativeUrls.includes(incomingUrl)) {
                            meta.alternativeUrls.unshift(incomingUrl);
                            // allow many alternatives (cap for safety)
                            meta.alternativeUrls = Array.from(new Set(meta.alternativeUrls)).slice(0, 1000);

                            await existing.update({ metadata: meta });
                            radioReport.updatedAlternatives++;
                        } else {
                            radioReport.skipped++;
                        }

                        continue;
                    }

                const created = await RadioStation.create({
                    name: sanitizeString(station.name || 'Unknown', 512),
                    description: station.description || '',
                    streamUrl: sanitizeString(station.streamUrl || '', 2048),
                    websiteUrl: sanitizeString(station.websiteUrl || '', 1024),
                    genre: sanitizeString(station.genre || 'Mixed', 255),
                    country: sanitizeString(station.country || 'Unknown', 128),
                    language: sanitizeString(station.language || 'Unknown', 128),
                    logoUrl: sanitizeString(station.logoUrl || '', 1024),
                    bitrate: station.bitrate || 128,
                    isActive: true,
                    source: sanitizeString(station.source || 'dynamic', 64),
                    metadata: station.metadata || {}
                });

                radioReport.created++;
                radioReport.byCountry[station.country] = (radioReport.byCountry[station.country] || 0) + 1;
                radioReport.bySource[station.source || 'dynamic'] = (radioReport.bySource[station.source || 'dynamic'] || 0) + 1;

                if (radioReport.created % 50 === 0) {
                    console.log(`  ⏳ Progress: ${radioReport.created} stations added...`);
                }
                } catch (error) {
                    if (isMissingCoreTableError(error)) {
                        const remaining = mergedRadio.length - stationIndex;
                        console.warn(`[Streaming Seed][RADIO_ABORT] Core schema missing at station="${station.name}". Skipping remaining ${remaining} items.`);
                        abortedRadioBySchemaIssue = true;
                        break;
                    }
                    if (isTransientDbConnectivityError(error)) {
                        const remaining = mergedRadio.length - stationIndex;
                        console.warn(`[Streaming Seed][RADIO_ABORT] Database connectivity lost while seeding station="${station.name}". Skipping remaining ${remaining} items.`);
                        abortedRadioBySchemaIssue = true;
                        break;
                    }
                    radioGenericErrorCount++;
                    if (radioGenericErrorLogged < 10) {
                        console.log(`[Streaming Seed][RADIO_ITEM_ERROR] station="${station.name}" message="${error.message}"`);
                        radioGenericErrorLogged++;
                    }
                }
            }
            if (abortedRadioBySchemaIssue) {
                console.warn('[Streaming Seed][RADIO_ABORT] Radio seeding aborted early due to critical DB/schema condition.');
            }
            if (radioGenericErrorCount > radioGenericErrorLogged) {
                console.warn(`[Streaming Seed][RADIO_ITEM_ERROR] Suppressed ${radioGenericErrorCount - radioGenericErrorLogged} additional radio item errors.`);
            }

        console.log(`\n📊 Radio Stations Final Report:`);
        console.log(`  ✅ Created: ${radioReport.created}`);
        console.log(`  ⏭️  Skipped (duplicates): ${radioReport.skipped}`);
        if (radioReport.updatedAlternatives) console.log(`  🔁 Updated alternatives: ${radioReport.updatedAlternatives}`);
        console.log(`  📁 Total unique: ${radioReport.created + radioReport.skipped}`);

        if (Object.keys(radioReport.byCountry).length > 0) {
            console.log(`\n🌍 Distribution by Country (Top 15):`);
            const topCountries = Object.entries(radioReport.byCountry)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15);
            topCountries.forEach(([country, count], index) => {
                console.log(`  ${index + 1}. ${country}: ${count} stations`);
            });
        }

        if (!IS_DRY_RUN_MODE) {
            if (Object.keys(radioReport.bySource).length > 0) {
                console.log(`\n📡 Distribution by Source:`);
                Object.entries(radioReport.bySource).forEach(([source, count]) => {
                    console.log(`  - ${source}: ${count} stations`);
                });
            }
        }

        // ========== TV CHANNELS ==========
        console.log('\n═══════════════════════════════════════════');
        console.log('📺 TV CHANNELS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        const staticTVPath = path.join(__dirname, 'seed-data', 'tv-channels.json');
        const staticTVData = readJson(staticTVPath, []);

        let mergedTV = [];
        let tvChannels = [];
        let iptvOrgChannels = [];
        let youtubeChannels = [];

        if (IS_MINIMAL_MODE) {
            mergedTV = staticTVData.slice(0, SEED_MINIMAL_TV_LIMIT);
            console.log(`📦 Minimal mode: using static TV subset (${mergedTV.length}/${staticTVData.length})\n`);
        } else {
            // Fetch TV data with fallback
            try {
                tvChannels = await fetchTVChannels();
            } catch (error) {
                if (IS_FAST_MODE) {
                    console.warn(`⚠️  Fast mode: fetch TV channels failed (${error.message}) — falling back to static data`);
                    tvChannels = [];
                } else {
                    console.error('❌ Critical error fetching TV channels:', error.message);
                    console.error('Please check internet connection and playlist availability');
                    process.exit(1);
                }
            }

            if (!tvChannels || tvChannels.length === 0) {
                if (IS_FAST_MODE) {
                    console.warn('⚠️  Fast mode: no TV channel data from online sources — using static data only');
                    tvChannels = [];
                } else {
                    console.error('❌ No TV channel data available');
                    process.exit(1);
                }
            }

            console.log('\n📡 Fetching additional TV channels (YouTube)...\n');

            // Check if YouTube channels are already included in the database fetch
            const youtubeLocalCount = tvChannels.filter(ch =>
                (ch.source === 'youtube') ||
                (ch.metadata?.platform === 'YouTube') ||
                (ch.playlistSource && String(ch.playlistSource).toLowerCase().includes('youtube'))
            ).length;

            if (youtubeLocalCount > 0) {
                console.log(`ℹ️ Detected ${youtubeLocalCount} YouTube channels already loaded from database — skipping separate YouTube fetch.`);
                youtubeChannels = [];
            } else if (IS_FAST_MODE && FAST_DISABLE_YOUTUBE_ENRICHMENT) {
                console.log('⚡ Fast mode: skipping optional YouTube enrichment/checks');
                youtubeChannels = [];
            } else {
                youtubeChannels = await fetchYouTubeChannels();
            }

            const allChannels = [...tvChannels, ...youtubeChannels, ...staticTVData];
            console.log(`\n📊 Combined sources: ${allChannels.length} total channels (before deduplication)`);
            console.log(`  - Database channels: ${tvChannels.length}`);
            console.log(`  - YouTube channels: ${youtubeChannels.length}`);
            console.log(`  - Static fallback: ${staticTVData.length}\n`);

            if (IS_FAST_MODE && FAST_DISABLE_STREAM_VALIDATION && FAST_DISABLE_LOGO_NETWORK) {
                console.log('⚡ Fast mode: skipping stream validation + logo network checks');
                mergedTV = deduplicateByStreamUrl(allChannels);
            } else {
                console.log('🔧 Enriching channels with validation/logo checks...\n');
                const enricher = new ChannelEnricher({
                    validateStreams: !FAST_DISABLE_STREAM_VALIDATION,
                    maxConcurrent: CHANNEL_ENRICH_MAX_CONCURRENT
                });

                if (IS_FAST_MODE && FAST_DISABLE_LOGO_NETWORK) {
                    enricher.findBestLogo = async () => null;
                    enricher.verifyImageUrl = async () => false;
                    enricher.fetchYouTubeLogo = async () => null;
                    enricher.fetchOGImage = async () => null;
                    enricher.fetchWebLogo = async () => null;
                }

                const enrichedChannels = await enricher.enrichChannels(allChannels, {
                    skipInvalid: IS_FAST_MODE,
                    validateStreams: !FAST_DISABLE_STREAM_VALIDATION
                });

                mergedTV = enricher.deduplicateChannels(enrichedChannels);
            }
        }

        // Report statistics
        const iptvCount = mergedTV.filter(ch => ch.source === 'iptv-org-database' || ch.source === 'iptv-org').length;
        const youtubeCount = mergedTV.filter(ch => ch.source === 'youtube' || ch.metadata?.platform === 'YouTube').length;
        const databaseCount = mergedTV.filter(ch => ch.source === 'iptv-org-database').length;
        const otherCount = mergedTV.length - iptvCount - youtubeCount;

        console.log(`📊 Final Merged Channel Summary:`);
        console.log(`  - IPTV-ORG Database channels: ${databaseCount}`);
        console.log(`  - YouTube channels: ${youtubeCount}`);
        console.log(`  - Other IPTV-ORG sources: ${iptvCount - databaseCount}`);
        console.log(`  - Other sources: ${otherCount}`);
        console.log(`  📁 Total unique: ${mergedTV.length}\n`);

        if (IS_DRY_RUN_MODE) {
            console.log(`🔍 DRY-RUN: Would seed ${mergedTV.length} TV channels to database\n`);
            console.log('📊 Sample TV channels:');
            mergedTV.slice(0, 5).forEach((channel, i) => {
                console.log(`  ${i + 1}. ${channel.name} (${channel.country}) - ${channel.category} - ${channel.streamUrl}`);
            });
            console.log('  ... (showing first 5 of', mergedTV.length, 'channels)\n');
        } else {
            console.log(`🔄 Seeding ${mergedTV.length} TV channels to database...\n`);

            const tvReport = {
                created: 0,
                skipped: 0,
                updatedAlternatives: 0,
                byCategory: {},
                bySource: {}
            };

            // Process TV seed in chunks to avoid long single-run spikes and improve resilience
            const chunkSize = mergedTV.length > 5000 ? 500 : 1000;
            let abortedTVBySchemaIssue = false;
            let tvGenericErrorCount = 0;
            let tvGenericErrorLogged = 0;
            for (let i = 0; i < mergedTV.length; i += chunkSize) {
                const chunk = mergedTV.slice(i, i + chunkSize);

            for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex++) {
                const channel = chunk[chunkIndex];
                try {
                    // Try to find existing by streamUrl OR by name+country
                    const where = (IS_FAST_MODE && FAST_SKIP_PER_ITEM_PRECHECK)
                        ? { streamUrl: channel.streamUrl }
                        : {
                            [Op.or]: [
                                { streamUrl: channel.streamUrl },
                                {
                                    name: { [Op.iLike]: channel.name || '' },
                                    country: channel.country || null
                                }
                            ]
                        };

                    const existing = await TVChannel.findOne({ where });

                    if (existing) {
                        const incomingUrl = (channel.streamUrl || '').trim();
                        const meta = existing.metadata || {};
                        meta.alternativeUrls = meta.alternativeUrls || [];

                        if (incomingUrl && incomingUrl !== existing.streamUrl && !meta.alternativeUrls.includes(incomingUrl)) {
                            meta.alternativeUrls.unshift(incomingUrl);
                            meta.alternativeUrls = Array.from(new Set(meta.alternativeUrls)).slice(0, 1000);
                            await existing.update({ metadata: meta });
                            tvReport.updatedAlternatives++;
                        } else {
                            tvReport.skipped++;
                        }

                        continue;
                    }

                    const created = await TVChannel.create({
                        name: sanitizeString(channel.name || 'Unknown', 512),
                        description: channel.description || '',
                        streamUrl: sanitizeString(channel.streamUrl || '', 2048),
                        epgUrl: sanitizeString(channel.epgUrl || '', 1024),
                        category: sanitizeString(channel.category || 'Mixed', 256),
                        country: sanitizeString(channel.country || 'Unknown', 128),
                        language: sanitizeString(channel.language || 'Unknown', 128),
                        logoUrl: sanitizeString(channel.logoUrl || '', 1024),
                        resolution: sanitizeString(channel.resolution || 'Unknown', 64),
                        isActive: true,
                        source: sanitizeString(channel.source || 'dynamic', 64),
                        metadata: channel.metadata || {}
                    });

                    tvReport.created++;
                    tvReport.byCategory[channel.category] = (tvReport.byCategory[channel.category] || 0) + 1;
                    tvReport.bySource[channel.source || 'dynamic'] = (tvReport.bySource[channel.source || 'dynamic'] || 0) + 1;

                    if (tvReport.created % 50 === 0) {
                        console.log(`  ⏳ Progress: ${tvReport.created} channels added...`);
                    }
                } catch (error) {
                    if (isMissingCoreTableError(error)) {
                        const remaining = mergedTV.length - (i + chunkIndex);
                        console.warn(`[Streaming Seed][TV_ABORT] Core schema missing at channel="${channel.name}". Skipping remaining ${remaining} items.`);
                        abortedTVBySchemaIssue = true;
                        break;
                    }
                    if (isTransientDbConnectivityError(error)) {
                        const remaining = mergedTV.length - (i + chunkIndex);
                        console.warn(`[Streaming Seed][TV_ABORT] Database connectivity lost while seeding channel="${channel.name}". Skipping remaining ${remaining} items.`);
                        abortedTVBySchemaIssue = true;
                        break;
                    }
                    tvGenericErrorCount++;
                    if (tvGenericErrorLogged < 10) {
                        console.log(`[Streaming Seed][TV_ITEM_ERROR] channel="${channel.name}" message="${error.message}"`);
                        tvGenericErrorLogged++;
                    }
                }
            }

            if (abortedTVBySchemaIssue) {
                break;
            }

            console.log(`  ⏳ Seeded ${Math.min(i + chunkSize, mergedTV.length)}/${mergedTV.length} TV channels...`);
            if (CHUNK_DELAY_MS > 0) {
                await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
            }
        }

        if (abortedTVBySchemaIssue) {
            console.warn('[Streaming Seed][TV_ABORT] TV seeding aborted early due to critical DB/schema condition.');
        }
        if (tvGenericErrorCount > tvGenericErrorLogged) {
            console.warn(`[Streaming Seed][TV_ITEM_ERROR] Suppressed ${tvGenericErrorCount - tvGenericErrorLogged} additional TV item errors.`);
        }

        if (!IS_DRY_RUN_MODE) {
            console.log(`\n📊 TV Channels Final Report:`);
            console.log(`  ✅ Created: ${tvReport.created}`);
            console.log(`  ⏭️  Skipped (duplicates): ${tvReport.skipped}`);
            if (tvReport.updatedAlternatives) console.log(`  🔁 Updated alternatives: ${tvReport.updatedAlternatives}`);
            console.log(`  📁 Total unique: ${tvReport.created + tvReport.skipped}`);

            if (Object.keys(tvReport.byCategory).length > 0) {
                console.log(`\n📑 Distribution by Category:`);
                const sortedCategories = Object.entries(tvReport.byCategory)
                    .sort((a, b) => b[1] - a[1]);
                sortedCategories.forEach(([category, count]) => {
                    console.log(`  - ${category}: ${count} channels`);
                });
            }

            if (Object.keys(tvReport.bySource).length > 0) {
                console.log(`\n📡 Distribution by Source:`);
                Object.entries(tvReport.bySource).forEach(([source, count]) => {
                    console.log(`  - ${source}: ${count} channels`);
                });
            }
        }
        }
        }

        // ========== FINAL STATISTICS ==========
        console.log('\n═══════════════════════════════════════════');
        console.log('📈 FINAL STATISTICS');
        console.log('═══════════════════════════════════════════\n');

        if (IS_DRY_RUN_MODE) {
            console.log(`📻 Radio Stations Fetched: ${mergedRadio.length}`);
            console.log(`📺 TV Channels Fetched: ${mergedTV.length}`);
            console.log(`🎬 Total Content Fetched: ${mergedRadio.length + mergedTV.length}`);
            console.log(`⚙️  Mode completed: ${SEED_MODE} (dry-run - no database changes)`);
        } else {
            const totalRadio = await RadioStation.count();
            const totalTV = await TVChannel.count();
            const totalContent = totalRadio + totalTV;

            console.log(`📻 Radio Stations: ${totalRadio}`);
            console.log(`📺 TV Channels: ${totalTV}`);
            console.log(`🎬 Total Streaming Content: ${totalContent}`);
            console.log(`⚙️  Mode completed: ${SEED_MODE}`);
        }
        console.log(`\n✨ Database seeding completed successfully!\n`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding error:', error);
        process.exit(1);
    }
};

// ==================== RUN SEED ====================

seed();
