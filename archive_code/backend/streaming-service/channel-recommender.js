/**
 * Channel Recommender Engine
 * Provides intelligent channel recommendations based on:
 * - User viewing history
 * - Channel similarity (category, country, language)
 * - Trending channels
 * - Personalized suggestions
 */
class ChannelRecommender {
    constructor(channels = []) {
        this.channels = channels;
        this.viewingHistory = new Map(); // userId -> [channelIds with timestamps]
        this.ratings = new Map(); // userId -> {channelId -> rating}
        this.recommendations = new Map(); // userId -> cached recommendations
    }

    /**
     * Track user viewing event
     */
    trackView(userId, channelId, watchDurationMs = 0) {
        if (!this.viewingHistory.has(userId)) {
            this.viewingHistory.set(userId, []);
        }

        const history = this.viewingHistory.get(userId);
        history.push({
            channelId,
            timestamp: Date.now(),
            watchDuration: watchDurationMs
        });

        // Keep only last 100 views per user
        if (history.length > 100) {
            this.viewingHistory.set(userId, history.slice(-100));
        }

        // Invalidate cached recommendations for this user
        this.recommendations.delete(userId);
    }

    /**
     * Rate a channel (1-5 stars)
     */
    rateChannel(userId, channelId, rating) {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        if (!this.ratings.has(userId)) {
            this.ratings.set(userId, {});
        }

        this.ratings.get(userId)[channelId] = rating;

        // Invalidate cached recommendations
        this.recommendations.delete(userId);
    }

    /**
     * Get personalized recommendations for a user
     */
    getRecommendations(userId, limit = 20) {
        // Return cached if available
        if (this.recommendations.has(userId)) {
            const cached = this.recommendations.get(userId);
            return cached.slice(0, limit);
        }

        const userHistory = this.viewingHistory.get(userId) || [];
        const userRatings = this.ratings.get(userId) || {};

        const recommendations = [];
        const scored = new Map(); // channelId -> score

        if (userHistory.length === 0) {
            // No history: return trending channels
            return this._getTrendingChannels(limit);
        }

        // Get unique channels viewed by this user
        const viewedChannelIds = new Set(userHistory.map(v => v.channelId));
        const viewedChannels = this.channels.filter(ch => viewedChannelIds.has(ch.id));

        if (viewedChannels.length === 0) {
            return this._getTrendingChannels(limit);
        }

        // Find similar channels for each viewed channel
        for (const viewedChannel of viewedChannels) {
            const similar = this._findSimilarChannels(viewedChannel);

            for (const simChannel of similar) {
                // Skip if already viewed
                if (viewedChannelIds.has(simChannel.id)) continue;

                // Calculate score
                let score = 10; // Base similarity score

                // Boost by category match
                if (simChannel.category === viewedChannel.category) score += 20;

                // Boost by country match
                if (simChannel.country === viewedChannel.country) score += 15;

                // Boost by language match
                if (simChannel.language === viewedChannel.language) score += 10;

                // Apply user rating of viewed channel
                const viewedRating = userRatings[viewedChannel.id];
                if (viewedRating) {
                    score *= (viewedRating / 5); // Scale by rating
                }

                // Accumulate score
                if (!scored.has(simChannel.id)) {
                    scored.set(simChannel.id, 0);
                }
                scored.set(simChannel.id, scored.get(simChannel.id) + score);
            }
        }

        // Convert to array and sort by score
        const ranked = Array.from(scored.entries())
            .map(([channelId, score]) => ({
                channel: this.channels.find(ch => ch.id === channelId),
                score
            }))
            .filter(item => item.channel)
            .sort((a, b) => b.score - a.score);

        // Cache for future calls
        const cachedRecs = ranked.map(item => item.channel);
        this.recommendations.set(userId, cachedRecs);

        return cachedRecs.slice(0, limit);
    }

    /**
     * Get recommendations by category
     */
    getRecommendationsByCategory(userId, categoryName, limit = 10) {
        const all = this.getRecommendations(userId, 100);
        return all.filter(ch => ch.category === categoryName).slice(0, limit);
    }

    /**
     * Get recommendations by country
     */
    getRecommendationsByCountry(userId, countryName, limit = 10) {
        const all = this.getRecommendations(userId, 100);
        return all.filter(ch => ch.country === countryName).slice(0, limit);
    }

    /**
     * Get similar channels to a given channel
     */
    getSimilarChannels(channelId, limit = 10) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel) return [];

        return this._findSimilarChannels(channel, limit);
    }

    /**
     * Find similar channels (internal)
     */
    _findSimilarChannels(channel, limit = 10) {
        const similar = [];
        const scored = new Map();

        for (const other of this.channels) {
            if (other.id === channel.id) continue;

            let score = 0;

            // Category match
            if (other.category === channel.category) score += 30;

            // Country match
            if (other.country === channel.country) score += 20;

            // Language match
            if (other.language === channel.language) score += 15;

            // Platform match
            if (other.metadata?.platform === channel.metadata?.platform) score += 10;

            // Source match (but less important)
            if (other.source === channel.source) score += 5;

            if (score > 0) {
                scored.set(other, score);
            }
        }

        return Array.from(scored.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);
    }

    /**
     * Get trending channels (most watched recently)
     */
    _getTrendingChannels(limit = 20) {
        const viewCounts = new Map();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Count views from the last 24 hours
        for (const history of this.viewingHistory.values()) {
            for (const view of history) {
                if (view.timestamp > oneDayAgo) {
                    const count = viewCounts.get(view.channelId) || 0;
                    viewCounts.set(view.channelId, count + 1);
                }
            }
        }

        // Return channels with most views
        return Array.from(viewCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([channelId]) => this.channels.find(ch => ch.id === channelId))
            .filter(ch => ch);
    }

    /**
     * Get popular channels in a category
     */
    getPopularInCategory(category, limit = 10) {
        const channelsInCat = this.channels.filter(ch => ch.category === category);
        
        const viewCounts = new Map();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Count views
        for (const history of this.viewingHistory.values()) {
            for (const view of history) {
                if (view.timestamp > oneDayAgo) {
                    const ch = this.channels.find(c => c.id === view.channelId);
                    if (ch && ch.category === category) {
                        const count = viewCounts.get(view.channelId) || 0;
                        viewCounts.set(view.channelId, count + 1);
                    }
                }
            }
        }

        // Rank by views
        const ranked = channelsInCat
            .map(ch => ({
                channel: ch,
                views: viewCounts.get(ch.id) || 0
            }))
            .sort((a, b) => b.views - a.views);

        return ranked.slice(0, limit).map(item => item.channel);
    }

    /**
     * Get popular channels in a country
     */
    getPopularInCountry(country, limit = 10) {
        const channelsInCountry = this.channels.filter(ch => ch.country === country);
        
        const viewCounts = new Map();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Count views
        for (const history of this.viewingHistory.values()) {
            for (const view of history) {
                if (view.timestamp > oneDayAgo) {
                    const ch = this.channels.find(c => c.id === view.channelId);
                    if (ch && ch.country === country) {
                        const count = viewCounts.get(view.channelId) || 0;
                        viewCounts.set(view.channelId, count + 1);
                    }
                }
            }
        }

        // Rank by views
        const ranked = channelsInCountry
            .map(ch => ({
                channel: ch,
                views: viewCounts.get(ch.id) || 0
            }))
            .sort((a, b) => b.views - a.views);

        return ranked.slice(0, limit).map(item => item.channel);
    }

    /**
     * Get user statistics
     */
    getUserStats(userId) {
        const history = this.viewingHistory.get(userId) || [];
        const ratings = this.ratings.get(userId) || {};

        const uniqueChannels = new Set(history.map(h => h.channelId));
        const totalWatchTime = history.reduce((sum, h) => sum + (h.watchDuration || 0), 0);

        // Get top categories
        const categoryViews = new Map();
        for (const channelId of uniqueChannels) {
            const channel = this.channels.find(ch => ch.id === channelId);
            const category = channel?.category || 'Unknown';
            categoryViews.set(category, (categoryViews.get(category) || 0) + 1);
        }

        return {
            userId,
            uniqueChannelsWatched: uniqueChannels.size,
            totalViews: history.length,
            totalWatchTimeMs: totalWatchTime,
            channelsRated: Object.keys(ratings).length,
            averageRating: Object.values(ratings).length > 0 
                ? (Object.values(ratings).reduce((sum, r) => sum + r, 0) / Object.values(ratings).length).toFixed(2)
                : null,
            topCategories: Array.from(categoryViews.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category, count]) => ({ category, count }))
        };
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        const allViews = Array.from(this.viewingHistory.values()).flat();
        const viewCounts = new Map();

        for (const view of allViews) {
            viewCounts.set(view.channelId, (viewCounts.get(view.channelId) || 0) + 1);
        }

        const topChannels = Array.from(viewCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([channelId, count]) => {
                const ch = this.channels.find(c => c.id === channelId);
                return { channel: ch?.name, views: count };
            });

        return {
            totalUsers: this.viewingHistory.size,
            totalViews: allViews.length,
            totalRatings: Array.from(this.ratings.values()).reduce((sum, r) => sum + Object.keys(r).length, 0),
            topChannels
        };
    }

    /**
     * Update channels list
     */
    updateChannels(channels) {
        this.channels = channels;
        // Invalidate all cached recommendations as channels have changed
        this.recommendations.clear();
    }

    /**
     * Export user data
     */
    exportUserData(userId) {
        return {
            userId,
            history: this.viewingHistory.get(userId) || [],
            ratings: this.ratings.get(userId) || {},
            stats: this.getUserStats(userId)
        };
    }

    /**
     * Clear old viewing data (older than 90 days)
     */
    clearOldData(daysToKeep = 90) {
        const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

        for (const [userId, history] of this.viewingHistory.entries()) {
            const filtered = history.filter(h => h.timestamp > cutoffTime);
            if (filtered.length === 0) {
                this.viewingHistory.delete(userId);
            } else {
                this.viewingHistory.set(userId, filtered);
            }
        }

        // Clear cached recommendations for affected users
        this.recommendations.clear();
    }
}

module.exports = ChannelRecommender;
