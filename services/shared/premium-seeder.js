/**
 * Premium Seeding Engine for Let's Connect Platform
 * Phase 10: Database & Bucket Professionalization (v3.0)
 * 
 * Provides high-quality, interconnected demo data for a professional first-run experience.
 */

class PremiumSeeder {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.models = sequelize.models;
    }

    /**
     * Generic seeder for any model
     */
    async seedData(modelName, data, uniqueField = 'id') {
        const Model = this.models[modelName];
        if (!Model) {
            console.warn(`[Seeder] Model ${modelName} not found.`);
            return;
        }

        console.log(`[Seeder] Seeding ${data.length} records into ${modelName}...`);

        for (const item of data) {
            const where = {};
            if (item[uniqueField]) {
                where[uniqueField] = item[uniqueField];
            }

            await Model.findOrCreate({
                where,
                defaults: item
            });
        }

        console.log(`[Seeder] ${modelName} seeding complete.`);
    }

    /**
     * Helper to generate realistic social content
     */
    static generateSamplePosts(count = 10, userIds = []) {
        const commonContent = [
            "Just launched our new product! #innovation #tech",
            "Anyone else excited for the weekend? 🚀",
            "Check out this amazing view from my office today.",
            "Learning new things every day. Today's topic: Microservices!",
            "Does anyone have recommendations for a good productivity app?",
            "The future of social media is decentralized and user-owned.",
            "Coffee + Code = Success ☕💻",
            "Just hit a major milestone in my career!",
            "What's your favorite coding language and why?",
            "Architecture is not just about buildings; it's about systems."
        ];

        return Array.from({ length: count }).map((_, i) => ({
            userId: userIds[i % userIds.length],
            content: commonContent[i % commonContent.length],
            type: 'text',
            likes: Math.floor(Math.random() * 100),
            comments: Math.floor(Math.random() * 20)
        }));
    }
}

module.exports = { PremiumSeeder };
