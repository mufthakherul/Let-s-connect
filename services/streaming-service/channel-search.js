/**
 * Channel Search Service
 * Full-text search across 60,000+ TV channels with advanced filtering
 * Supports fuzzy matching, category filtering, language filtering, etc.
 */
class ChannelSearch {
    constructor(channels = []) {
        this.channels = channels;
        this.index = new Map(); // inverted index for fast search
        this.buildIndex();
    }

    /**
     * Build inverted index for full-text search
     */
    buildIndex() {
        this.index.clear();
        
        for (const channel of this.channels) {
            // Index channel name
            const name = (channel.name || '').toLowerCase();
            this._addToIndex(name, channel.id);
            
            // Index category
            const category = (channel.category || '').toLowerCase();
            if (category) {
                this._addToIndex(category, channel.id);
            }
            
            // Index country
            const country = (channel.country || '').toLowerCase();
            if (country) {
                this._addToIndex(country, channel.id);
            }
            
            // Index language
            const language = (channel.language || '').toLowerCase();
            if (language) {
                this._addToIndex(language, channel.id);
            }
            
            // Index description
            const description = (channel.description || '').toLowerCase();
            if (description) {
                this._addToIndex(description, channel.id);
            }
            
            // Index metadata keywords
            if (channel.metadata) {
                const keywords = [
                    channel.metadata.platform,
                    channel.metadata.tvgName,
                    channel.metadata.handle
                ].filter(Boolean);
                
                for (const keyword of keywords) {
                    this._addToIndex(String(keyword).toLowerCase(), channel.id);
                }
            }
        }
    }

    /**
     * Add a term to the inverted index
     */
    _addToIndex(term, channelId) {
        // Index individual words
        const words = term.split(/[\s\-_\.]+/).filter(w => w.length > 0);
        
        for (const word of words) {
            if (word.length < 2) continue; // Skip very short words
            
            if (!this.index.has(word)) {
                this.index.set(word, new Set());
            }
            this.index.get(word).add(channelId);
        }
    }

    /**
     * Search channels with advanced filtering
     */
    search(query, options = {}) {
        const results = [];
        const {
            limit = 50,
            offset = 0,
            category = null,
            country = null,
            language = null,
            source = null,
            fuzzy = true,
            sortBy = 'relevance' // 'relevance', 'name', 'recent'
        } = options;

        if (!query || query.trim().length === 0) {
            return this._filterAndSort(this.channels, { category, country, language, source, limit, offset, sortBy });
        }

        // Tokenize query
        const queryTerms = query.toLowerCase().split(/[\s\-_\.]+/).filter(w => w.length > 0);

        // Find matching channels
        const matches = new Map(); // channelId -> relevance score

        for (const term of queryTerms) {
            const exactMatches = this.index.get(term) || new Set();
            
            // Exact matches
            for (const channelId of exactMatches) {
                matches.set(channelId, (matches.get(channelId) || 0) + 10);
            }

            // Fuzzy matches (if enabled)
            if (fuzzy) {
                for (const [indexedTerm, channelIds] of this.index.entries()) {
                    if (this._levenshteinDistance(term, indexedTerm) <= Math.ceil(term.length / 3)) {
                        for (const channelId of channelIds) {
                            matches.set(channelId, (matches.get(channelId) || 0) + 5);
                        }
                    }
                }
            }
        }

        // Convert matches to channel objects
        const matchedChannels = Array.from(matches.entries())
            .map(([channelId, score]) => ({
                ...this.channels.find(ch => ch.id === channelId),
                _searchScore: score
            }))
            .filter(ch => ch); // Remove undefined

        // Apply filters
        const filtered = this._filterAndSort(matchedChannels, { 
            category, 
            country, 
            language, 
            source, 
            sortBy: sortBy === 'relevance' ? 'relevance' : sortBy
        });

        // Paginate
        return {
            total: filtered.length,
            limit,
            offset,
            results: filtered.slice(offset, offset + limit)
        };
    }

    /**
     * Advanced filter and sort
     */
    _filterAndSort(channels, { category, country, language, source, sortBy, limit, offset }) {
        let filtered = [...channels];

        // Apply filters
        if (category) {
            filtered = filtered.filter(ch => 
                ch.category && ch.category.toLowerCase() === category.toLowerCase()
            );
        }

        if (country) {
            filtered = filtered.filter(ch => 
                ch.country && ch.country.toLowerCase() === country.toLowerCase()
            );
        }

        if (language) {
            filtered = filtered.filter(ch => 
                ch.language && ch.language.toLowerCase() === language.toLowerCase()
            );
        }

        if (source) {
            filtered = filtered.filter(ch => 
                ch.source && ch.source.toLowerCase() === source.toLowerCase()
            );
        }

        // Sort
        if (sortBy === 'relevance') {
            filtered.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortBy === 'recent') {
            filtered.sort((a, b) => {
                const aTime = new Date(a.metadata?.enrichedAt || 0).getTime();
                const bTime = new Date(b.metadata?.enrichedAt || 0).getTime();
                return bTime - aTime;
            });
        }

        return filtered;
    }

    /**
     * Levenshtein distance for fuzzy matching
     */
    _levenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Get search suggestions/autocomplete
     */
    getSuggestions(prefix, limit = 10) {
        if (!prefix || prefix.length === 0) return [];

        const suggestions = new Set();
        const lowerPrefix = prefix.toLowerCase();

        // Search for terms starting with prefix
        for (const term of this.index.keys()) {
            if (term.startsWith(lowerPrefix)) {
                suggestions.add(term);
                if (suggestions.size >= limit) break;
            }
        }

        return Array.from(suggestions)
            .sort()
            .slice(0, limit)
            .map(term => ({
                text: term,
                count: this.index.get(term).size
            }));
    }

    /**
     * Get all unique categories
     */
    getCategories() {
        const categories = new Map();
        
        for (const channel of this.channels) {
            const cat = channel.category || 'Unknown';
            categories.set(cat, (categories.get(cat) || 0) + 1);
        }

        return Array.from(categories.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get all unique countries
     */
    getCountries() {
        const countries = new Map();
        
        for (const channel of this.channels) {
            const country = channel.country || 'Unknown';
            countries.set(country, (countries.get(country) || 0) + 1);
        }

        return Array.from(countries.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get all unique languages
     */
    getLanguages() {
        const languages = new Map();
        
        for (const channel of this.channels) {
            const lang = channel.language || 'Unknown';
            languages.set(lang, (languages.get(lang) || 0) + 1);
        }

        return Array.from(languages.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get search statistics
     */
    getStats() {
        return {
            totalChannels: this.channels.length,
            uniqueCategories: new Set(this.channels.map(ch => ch.category)).size,
            uniqueCountries: new Set(this.channels.map(ch => ch.country)).size,
            uniqueLanguages: new Set(this.channels.map(ch => ch.language)).size,
            indexedTerms: this.index.size,
            sources: this._getSourceStats()
        };
    }

    /**
     * Get statistics by source
     */
    _getSourceStats() {
        const sources = new Map();
        
        for (const channel of this.channels) {
            const source = channel.source || 'unknown';
            sources.set(source, (sources.get(source) || 0) + 1);
        }

        return Object.fromEntries(sources);
    }

    /**
     * Update index when channels change
     */
    updateChannels(channels) {
        this.channels = channels;
        this.buildIndex();
    }

    /**
     * Popular searches across all users (for UI suggestions)
     */
    getTrendingSearches(limit = 10) {
        // Returns most common category + country combinations
        const trending = new Map();

        for (const channel of this.channels) {
            const key = `${channel.category} - ${channel.country}`;
            trending.set(key, (trending.get(key) || 0) + 1);
        }

        return Array.from(trending.entries())
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Find similar channels
     */
    findSimilar(channelId, limit = 5) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel) return [];

        // Find channels with same category and country
        const similar = this.channels.filter(ch =>
            ch.id !== channelId &&
            ch.category === channel.category &&
            ch.country === channel.country
        );

        return similar.slice(0, limit);
    }
}

module.exports = ChannelSearch;
