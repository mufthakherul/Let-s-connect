const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Fetchers/enrichers are lazy-loaded only when needed for full mode

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
    return typeof value === 'string' ? value.slice(0, max).trim() : String(value).slice(0, max).trim();
}

function normalizeStreamUrl(url) {
    if (!url) return '';
    return sanitizeString(url, 2048).toLowerCase();
}

async function bulkUpsertRadioStations(stations) {
    const result = { created: 0, updated: 0, skipped: 0 };
    
    // Normalize all URLs upfront
    const stationsWithNormalizedUrls = stations.map(s => ({
        ...s,
        normalizedUrl: normalizeStreamUrl(s.streamUrl)
    })).filter(s => s.normalizedUrl); // Filter out stations with no valid URL
    
    for (let i = 0; i < stationsWithNormalizedUrls.length; i += SEED_BATCH_SIZE) {
        const batch = stationsWithNormalizedUrls.slice(i, i + SEED_BATCH_SIZE);
        
        // Batch query for existing stations
        const normalizedUrls = batch.map(s => s.normalizedUrl);
        const existingStations = await RadioStation.findAll({
            where: {
                streamUrl: {
                    [Op.in]: normalizedUrls
                }
            },
            attributes: ['streamUrl']
        });
        
        const existingUrlSet = new Set(
            existingStations.map(s => s.streamUrl.toLowerCase().trim())
        );
        
        // Prepare stations to insert
        const stationsToCreate = batch
            .filter(station => !existingUrlSet.has(station.normalizedUrl))
            .map(station => ({
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
            }));
        
        if (stationsToCreate.length > 0) {
            try {
                await RadioStation.bulkCreate(stationsToCreate, {
                    ignoreDuplicates: true
                });
                result.created += stationsToCreate.length;
            } catch (error) {
                console.log(`  ⚠️  Batch insert error: ${error.message}`);
                // Fallback to individual inserts for this batch
                for (const station of stationsToCreate) {
                    try {
                        await RadioStation.create(station);
                        result.created++;
                    } catch (err) {
                        console.log(`  ⚠️  Error seeding "${station.name}": ${err.message}`);
                    }
                }
            }
        }
        
        result.skipped += batch.length - stationsToCreate.length;
        
        if (i + SEED_BATCH_SIZE < stationsWithNormalizedUrls.length) {
            console.log(`  ⏳ Progress: ${Math.min(i + SEED_BATCH_SIZE, stationsWithNormalizedUrls.length)}/${stationsWithNormalizedUrls.length}...`);
        }
    }
    
    return result;
}

async function bulkUpsertTVChannels(channels) {
    const result = { created: 0, updated: 0, skipped: 0 };
    
    // Normalize all URLs upfront
    const channelsWithNormalizedUrls = channels.map(c => ({
        ...c,
        normalizedUrl: normalizeStreamUrl(c.streamUrl)
    })).filter(c => c.normalizedUrl); // Filter out channels with no valid URL
    
    for (let i = 0; i < channelsWithNormalizedUrls.length; i += SEED_BATCH_SIZE) {
        const batch = channelsWithNormalizedUrls.slice(i, i + SEED_BATCH_SIZE);
        
        // Batch query for existing channels
        const normalizedUrls = batch.map(c => c.normalizedUrl);
        const existingChannels = await TVChannel.findAll({
            where: {
                streamUrl: {
                    [Op.in]: normalizedUrls
                }
            },
            attributes: ['streamUrl']
        });
        
        const existingUrlSet = new Set(
            existingChannels.map(c => c.streamUrl.toLowerCase().trim())
        );
        
        // Prepare channels to insert
        const channelsToCreate = batch
            .filter(channel => !existingUrlSet.has(channel.normalizedUrl))
            .map(channel => ({
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
            }));
        
        if (channelsToCreate.length > 0) {
            try {
                await TVChannel.bulkCreate(channelsToCreate, {
                    ignoreDuplicates: true
                });
                result.created += channelsToCreate.length;
            } catch (error) {
                console.log(`  ⚠️  Batch insert error: ${error.message}`);
                // Fallback to individual inserts for this batch
                for (const channel of channelsToCreate) {
                    try {
                        await TVChannel.create(channel);
                        result.created++;
                    } catch (err) {
                        console.log(`  ⚠️  Error seeding "${channel.name}": ${err.message}`);
                    }
                }
            }
        }
        
        result.skipped += batch.length - channelsToCreate.length;
        
        if (i + SEED_BATCH_SIZE < channelsWithNormalizedUrls.length) {
            console.log(`  ⏳ Progress: ${Math.min(i + SEED_BATCH_SIZE, channelsWithNormalizedUrls.length)}/${channelsWithNormalizedUrls.length}...`);
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
        const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true' || process.env.NODE_ENV !== 'production';
        const shouldForceSchema = process.env.DB_SYNC_FORCE === 'true';
        
        if (shouldForceSchema) {
            await sequelize.sync({ force: true });
            console.log('✅ Database models synced with force\n');
        } else if (shouldAlterSchema) {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synced with alter\n');
        } else {
            await sequelize.sync();
            console.log('✅ Database models synced\n');
        }

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
        } else if (SEED_MODE === 'full') {
            console.log('🌐 Full mode enabled...');
            if (SEED_SKIP_ONLINE_FETCH) {
                console.log('⚠️  SEED_SKIP_ONLINE_FETCH=true: Using static data instead of online fetch');
                console.log('💡 Set SEED_SKIP_ONLINE_FETCH=false for production deployment with online sources');
                radioStations = staticRadioData;
            } else {
                console.log('📡 For true online fetching in full mode, use the original seed.js script');
                console.log('💡 Run: USE_FULL_SEED=true or npm run seed (uses seed.js)');
                console.log('📦 Using static data for now');
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
        } else if (SEED_MODE === 'full') {
            console.log('🌐 Full mode enabled...');
            if (SEED_SKIP_ONLINE_FETCH) {
                console.log('⚠️  SEED_SKIP_ONLINE_FETCH=true: Using static data instead of online fetch');
                console.log('💡 Set SEED_SKIP_ONLINE_FETCH=false for production deployment with online sources');
                tvChannels = staticTVData;
            } else {
                console.log('📡 For true online fetching in full mode, use the original seed.js script');
                console.log('💡 Run: USE_FULL_SEED=true or npm run seed (uses seed.js)');
                console.log('📦 Using static data for now');
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
