const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Import dynamic fetchers
const RadioBrowserFetcher = require('./radio-browser-fetcher');
const TVPlaylistFetcher = require('./tv-playlist-fetcher');
const YouTubeEnricher = require('./youtube-enricher');
const IPTVOrgAPI = require('./iptv-org-api');
const ChannelEnricher = require('./channel-enricher');

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

// ==================== FETCHER FUNCTIONS ====================

/**
 * Fetch radio stations from online sources with fallback to static data
 */
async function fetchRadioStations() {
    const staticPath = path.join(__dirname, 'seed-data', 'radio-stations.json');
    const fallbackData = JSON.parse(fs.readFileSync(staticPath, 'utf8'));

    console.log('🌐 Attempting to fetch radio stations from online sources...\n');

    try {
        const fetcher = new RadioBrowserFetcher({
            timeout: 15000,
            retries: 3,
            fetchWorldwide: true  // Enable worldwide fetching (800,000+ stations)
        });

        // Initialize servers via DNS discovery as per official API docs
        console.log('🔍 Initializing radio-browser.info API servers...');
        await fetcher.initializeServers();
        console.log('');

        // Fetch worldwide stations (all 800,000+)
        const stations = await fetcher.fetchMultipleCountries();

        if (stations && stations.length > 0) {
            console.log(`\n✅ Successfully fetched ${stations.length} radio stations from online sources`);
            return stations;
        } else {
            throw new Error('No stations fetched');
        }
    } catch (error) {
        console.log(`\n⚠️  Could not fetch from online source: ${error.message}`);
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
        const iptvAPI = new IPTVOrgAPI({ timeout: 30000, retries: 3 });
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

        const enricher = new YouTubeEnricher({ timeout: 5000, retries: 1 });

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
 * Fetch TV channels from online sources with fallback to static data
 */
async function fetchTVChannels() {
    const staticPath = path.join(__dirname, 'seed-data', 'tv-channels.json');
    const fallbackData = JSON.parse(fs.readFileSync(staticPath, 'utf8'));

    console.log('🌐 Attempting to fetch TV channels from online sources...\n');

    try {
        const fetcher = new TVPlaylistFetcher({
            timeout: 15000,
            retries: 2
        });

        const channels = await fetcher.fetchAllSources();

        if (channels && channels.length > 0) {
            console.log(`\n✅ Successfully fetched ${channels.length} TV channels from online sources`);
            return channels;
        } else {
            throw new Error('No channels fetched');
        }
    } catch (error) {
        console.log(`\n⚠️  Could not fetch from online sources: ${error.message}`);
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
        console.log('═══════════════════════════════════════════\n');

        // Sync database
        console.log('🔧 Synchronizing database models...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synced (altered where necessary)\n');

        // ========== RADIO STATIONS ==========
        console.log('═══════════════════════════════════════════');
        console.log('📻 RADIO STATIONS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        // Fetch radio data with fallback
        let radioStations = [];
        try {
            radioStations = await fetchRadioStations();
        } catch (error) {
            console.error('❌ Critical error fetching radio stations:', error.message);
            console.error('Please check internet connection and API availability');
            process.exit(1);
        }

        if (!radioStations || radioStations.length === 0) {
            console.error('❌ No radio station data available');
            process.exit(1);
        }

        // Get static data for comparison
        const staticRadioPath = path.join(__dirname, 'seed-data', 'radio-stations.json');
        const staticRadioData = JSON.parse(fs.readFileSync(staticRadioPath, 'utf8'));

        // Merge data
        const mergedRadio = mergeData(radioStations, staticRadioData, 'radio');
        console.log(`📊 Merged Data: ${mergedRadio.length} unique radio stations`);
        console.log(`  - Online sources: ${radioStations.length}`);
        console.log(`  - Static fallback: ${staticRadioData.length}`);
        console.log(`  - Total unique: ${mergedRadio.length}\n`);

        console.log(`🔄 Seeding ${mergedRadio.length} radio stations to database...\n`);

        const radioReport = {
            created: 0,
            skipped: 0,
            byCountry: {},
            bySource: {}
        };

        for (const station of mergedRadio) {
            try {
                // Check if already exists by URL (more reliable than name)
                const existing = await RadioStation.findOne({
                    where: { streamUrl: station.streamUrl }
                });

                if (existing) {
                    radioReport.skipped++;
                } else {
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
                }
            } catch (error) {
                console.log(`  ⚠️  Error seeding "${station.name}": ${error.message}`);
            }
        }

        console.log(`\n📊 Radio Stations Final Report:`);
        console.log(`  ✅ Created: ${radioReport.created}`);
        console.log(`  ⏭️  Skipped (duplicates): ${radioReport.skipped}`);
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

        if (Object.keys(radioReport.bySource).length > 0) {
            console.log(`\n📡 Distribution by Source:`);
            Object.entries(radioReport.bySource).forEach(([source, count]) => {
                console.log(`  - ${source}: ${count} stations`);
            });
        }

        // ========== TV CHANNELS ==========
        console.log('\n═══════════════════════════════════════════');
        console.log('📺 TV CHANNELS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        // Fetch TV data with fallback
        let tvChannels = [];
        try {
            tvChannels = await fetchTVChannels();
        } catch (error) {
            console.error('❌ Critical error fetching TV channels:', error.message);
            console.error('Please check internet connection and playlist availability');
            process.exit(1);
        }

        if (!tvChannels || tvChannels.length === 0) {
            console.error('❌ No TV channel data available');
            process.exit(1);
        }

        // Get static data for comparison
        const staticTVPath = path.join(__dirname, 'seed-data', 'tv-channels.json');
        const staticTVData = JSON.parse(fs.readFileSync(staticTVPath, 'utf8'));

        // ========== FETCH ADDITIONAL SOURCES ==========
        console.log('\n📡 Fetching TV channels from additional sources (IPTV-ORG, YouTube)...\n');

        // Detect whether TVPlaylistFetcher already included IPTV-ORG / YouTube entries
        const youtubeLocalCount = tvChannels.filter(ch => (ch.source === 'youtube') || (ch.playlistSource && String(ch.playlistSource).toLowerCase().includes('youtube'))).length;
        const iptvOrgLocalCount = tvChannels.filter(ch => ch.source && String(ch.source).toLowerCase().includes('iptv-org')).length;

        // Fetch from IPTV-ORG API only if not already present in tvChannels
        let iptvOrgChannels = [];
        if (iptvOrgLocalCount > 0) {
            console.log(`ℹ️ Detected ${iptvOrgLocalCount} IPTV-ORG channels already loaded by TVPlaylistFetcher — skipping separate IPTV-ORG API fetch.`);
        } else {
            iptvOrgChannels = await fetchIPTVOrgChannels();
        }
        console.log('');

        // Fetch and enrich YouTube channels only when not already loaded by TVPlaylistFetcher
        let youtubeChannels = [];
        if (youtubeLocalCount > 0) {
            console.log(`ℹ️ Detected ${youtubeLocalCount} YouTube channels already loaded by TVPlaylistFetcher — skipping separate YouTube enrichment.`);
        } else {
            youtubeChannels = await fetchYouTubeChannels();
        }
        console.log('');

        // ========== ENRICH AND DEDUPLICATE ==========
        console.log('🔧 Enriching all channels with logos and metadata...\n');

        const enricher = new ChannelEnricher({
            validateStreams: true,
            maxConcurrent: 5
        });

        // Combine all sources
        let allChannels = [...tvChannels, ...iptvOrgChannels, ...youtubeChannels, ...staticTVData];
        console.log(`📊 Combined sources: ${allChannels.length} total channels (before deduplication)`);
        console.log(`  - Playlist channels: ${tvChannels.length}`);
        console.log(`  - IPTV-ORG channels: ${iptvOrgChannels.length}`);
        console.log(`  - YouTube channels: ${youtubeChannels.length}`);
        console.log(`  - Static fallback: ${staticTVData.length}\n`);

        // Enrich channels
        const enrichedChannels = await enricher.enrichChannels(allChannels, { skipInvalid: false });
        console.log('');

        // Deduplicate
        const mergedTV = enricher.deduplicateChannels(enrichedChannels);

        // Report statistics
        const iptvCount = mergedTV.filter(ch => ch.source === 'iptv-org').length;
        const youtubeCount = mergedTV.filter(ch => ch.source === 'youtube' || ch.metadata?.platform === 'YouTube').length;
        const playlistCount = mergedTV.filter(ch => ch.source === 'playlist').length;
        const otherCount = mergedTV.length - iptvCount - youtubeCount - playlistCount;

        console.log(`📊 Final Merged Channel Summary:`);
        console.log(`  - IPTV-ORG channels: ${iptvCount}`);
        console.log(`  - YouTube channels: ${youtubeCount}`);
        console.log(`  - Playlist channels: ${playlistCount}`);
        console.log(`  - Other sources: ${otherCount}`);
        console.log(`  📁 Total unique: ${mergedTV.length}\n`);

        console.log(`🔄 Seeding ${mergedTV.length} TV channels to database...\n`);

        const tvReport = {
            created: 0,
            skipped: 0,
            byCategory: {},
            bySource: {}
        };

        // Process TV seed in chunks to avoid long single-run spikes and improve resilience
        const chunkSize = mergedTV.length > 5000 ? 500 : 1000;
        for (let i = 0; i < mergedTV.length; i += chunkSize) {
            const chunk = mergedTV.slice(i, i + chunkSize);

            for (const channel of chunk) {
                try {
                    // Check if already exists by URL
                    const existing = await TVChannel.findOne({
                        where: { streamUrl: channel.streamUrl }
                    });

                    if (existing) {
                        tvReport.skipped++;
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
                    console.log(`  ⚠️  Error seeding "${channel.name}": ${error.message}`);
                }
            }

            console.log(`  ⏳ Seeded ${Math.min(i + chunkSize, mergedTV.length)}/${mergedTV.length} TV channels...`);
            // small pause between chunks to relieve DB and network
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        console.log(`\n📊 TV Channels Final Report:`);
        console.log(`  ✅ Created: ${tvReport.created}`);
        console.log(`  ⏭️  Skipped (duplicates): ${tvReport.skipped}`);
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

        // ========== FINAL STATISTICS ==========
        console.log('\n═══════════════════════════════════════════');
        console.log('📈 FINAL STATISTICS');
        console.log('═══════════════════════════════════════════\n');

        const totalRadio = await RadioStation.count();
        const totalTV = await TVChannel.count();
        const totalContent = totalRadio + totalTV;

        console.log(`📻 Radio Stations: ${totalRadio}`);
        console.log(`📺 TV Channels: ${totalTV}`);
        console.log(`🎬 Total Streaming Content: ${totalContent}`);
        console.log(`\n✨ Database seeding completed successfully!\n`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding error:', error);
        process.exit(1);
    }
};

// ==================== RUN SEED ====================

seed();
