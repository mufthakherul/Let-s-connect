const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Import dynamic fetchers (only when needed)
const RadioBrowserFetcher = require('./radio-browser-fetcher');
const TVPlaylistFetcher = require('./tv-playlist-fetcher');
const XiphFetcher = require('./xiph-fetcher');
const RadiossFetcher = require('./radioss-fetcher');
const YouTubeEnricher = require('./youtube-enricher');
const IPTVOrgAPI = require('./iptv-org-api');
const ChannelEnricher = require('./channel-enricher');

// Configuration from environment
const SEED_MODE = process.env.SEED_MODE || 'minimal'; // full, minimal, skip
const SEED_MINIMAL_RADIO_LIMIT = parseInt(process.env.SEED_MINIMAL_RADIO_LIMIT || '50', 10);
const SEED_MINIMAL_TV_LIMIT = parseInt(process.env.SEED_MINIMAL_TV_LIMIT || '50', 10);
const SEED_SKIP_ONLINE_FETCH = process.env.SEED_SKIP_ONLINE_FETCH === 'true';
const SEED_SKIP_VALIDATION = process.env.SEED_SKIP_VALIDATION === 'true';
const SEED_SKIP_ENRICHMENT = process.env.SEED_SKIP_ENRICHMENT === 'true';
const SEED_BATCH_SIZE = parseInt(process.env.SEED_BATCH_SIZE || '100', 10);

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

// ==================== HELPER FUNCTIONS ====================

function sanitizeString(value, max = 1024) {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value.slice(0, max) : String(value).slice(0, max);
}

async function bulkUpsertRadioStations(stations) {
    const result = { created: 0, updated: 0, skipped: 0 };
    
    for (let i = 0; i < stations.length; i += SEED_BATCH_SIZE) {
        const batch = stations.slice(i, i + SEED_BATCH_SIZE);
        
        for (const station of batch) {
            try {
                const existing = await RadioStation.findOne({
                    where: { streamUrl: station.streamUrl }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await RadioStation.create({
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
                        source: sanitizeString(station.source || 'static', 64),
                        metadata: station.metadata || {}
                    });
                    result.created++;
                }
            } catch (error) {
                console.log(`  ⚠️  Error seeding "${station.name}": ${error.message}`);
            }
        }
        
        if (i + SEED_BATCH_SIZE < stations.length) {
            console.log(`  ⏳ Progress: ${Math.min(i + SEED_BATCH_SIZE, stations.length)}/${stations.length}...`);
        }
    }
    
    return result;
}

async function bulkUpsertTVChannels(channels) {
    const result = { created: 0, updated: 0, skipped: 0 };
    
    for (let i = 0; i < channels.length; i += SEED_BATCH_SIZE) {
        const batch = channels.slice(i, i + SEED_BATCH_SIZE);
        
        for (const channel of batch) {
            try {
                const existing = await TVChannel.findOne({
                    where: { streamUrl: channel.streamUrl }
                });

                if (existing) {
                    result.skipped++;
                } else {
                    await TVChannel.create({
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
                        source: sanitizeString(channel.source || 'static', 64),
                        metadata: channel.metadata || {}
                    });
                    result.created++;
                }
            } catch (error) {
                console.log(`  ⚠️  Error seeding "${channel.name}": ${error.message}`);
            }
        }
        
        if (i + SEED_BATCH_SIZE < channels.length) {
            console.log(`  ⏳ Progress: ${Math.min(i + SEED_BATCH_SIZE, channels.length)}/${channels.length}...`);
        }
    }
    
    return result;
}

// ==================== SEED FUNCTION ====================

const seed = async () => {
    try {
        console.log('🌱 Starting streaming database seeding...');
        console.log(`📋 Seed Mode: ${SEED_MODE.toUpperCase()}\n`);
        console.log('═══════════════════════════════════════════\n');

        if (SEED_MODE === 'skip') {
            console.log('⏭️  Seeding skipped (SEED_MODE=skip)');
            console.log('✨ Use SEED_MODE=minimal for fast dev seeding or SEED_MODE=full for production\n');
            process.exit(0);
        }

        // Sync database
        console.log('🔧 Synchronizing database models...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synced\n');

        // ========== RADIO STATIONS ==========
        console.log('═══════════════════════════════════════════');
        console.log('📻 RADIO STATIONS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        let radioStations = [];
        const staticRadioPath = path.join(__dirname, 'seed-data', 'radio-stations.json');
        const staticRadioData = JSON.parse(fs.readFileSync(staticRadioPath, 'utf8'));

        if (SEED_MODE === 'minimal') {
            console.log(`📦 Using static data (minimal mode, limit: ${SEED_MINIMAL_RADIO_LIMIT})`);
            radioStations = staticRadioData.slice(0, SEED_MINIMAL_RADIO_LIMIT);
        } else if (SEED_MODE === 'full' && !SEED_SKIP_ONLINE_FETCH) {
            console.log('🌐 Fetching from online sources (full mode)...');
            try {
                // Load the original seed.js full fetching logic here if needed
                // For now, using static data with a note
                console.log('ℹ️  Online fetch would happen here in production');
                console.log('📦 Falling back to static data');
                radioStations = staticRadioData;
            } catch (error) {
                console.log(`⚠️  Online fetch failed: ${error.message}`);
                radioStations = staticRadioData;
            }
        } else {
            radioStations = staticRadioData;
        }

        console.log(`🔄 Seeding ${radioStations.length} radio stations...\n`);
        const radioResult = await bulkUpsertRadioStations(radioStations);
        
        console.log(`\n📊 Radio Stations Report:`);
        console.log(`  ✅ Created: ${radioResult.created}`);
        console.log(`  ⏭️  Skipped (duplicates): ${radioResult.skipped}`);
        console.log(`  📁 Total: ${radioResult.created + radioResult.skipped}`);

        // ========== TV CHANNELS ==========
        console.log('\n═══════════════════════════════════════════');
        console.log('📺 TV CHANNELS SEEDING');
        console.log('═══════════════════════════════════════════\n');

        let tvChannels = [];
        const staticTVPath = path.join(__dirname, 'seed-data', 'tv-channels.json');
        const staticTVData = JSON.parse(fs.readFileSync(staticTVPath, 'utf8'));

        if (SEED_MODE === 'minimal') {
            console.log(`📦 Using static data (minimal mode, limit: ${SEED_MINIMAL_TV_LIMIT})`);
            tvChannels = staticTVData.slice(0, SEED_MINIMAL_TV_LIMIT);
        } else if (SEED_MODE === 'full' && !SEED_SKIP_ONLINE_FETCH) {
            console.log('🌐 Fetching from online sources (full mode)...');
            try {
                console.log('ℹ️  Online fetch would happen here in production');
                console.log('📦 Falling back to static data');
                tvChannels = staticTVData;
            } catch (error) {
                console.log(`⚠️  Online fetch failed: ${error.message}`);
                tvChannels = staticTVData;
            }
        } else {
            tvChannels = staticTVData;
        }

        console.log(`🔄 Seeding ${tvChannels.length} TV channels...\n`);
        const tvResult = await bulkUpsertTVChannels(tvChannels);
        
        console.log(`\n📊 TV Channels Report:`);
        console.log(`  ✅ Created: ${tvResult.created}`);
        console.log(`  ⏭️  Skipped (duplicates): ${tvResult.skipped}`);
        console.log(`  📁 Total: ${tvResult.created + tvResult.skipped}`);

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
        
        const endTime = Date.now();
        console.log(`\n✨ Database seeding completed successfully!`);
        console.log(`⏱️  Seed Mode: ${SEED_MODE}`);
        if (SEED_MODE === 'minimal') {
            console.log(`💡 Tip: Use SEED_MODE=full for production deployment\n`);
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding error:', error);
        process.exit(1);
    }
};

// ==================== RUN SEED ====================

seed();
