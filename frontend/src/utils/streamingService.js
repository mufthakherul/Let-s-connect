import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==================== RADIO STATIONS ====================

export const streamingService = {
    // Get all radio stations
    getRadioStations: async (params = {}) => {
        const response = await axios.get(`${API_URL}/api/streaming/radio/stations`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get single radio station
    getRadioStation: async (id) => {
        const response = await axios.get(`${API_URL}/api/streaming/radio/stations/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Add new radio station
    addRadioStation: async (stationData) => {
        const response = await axios.post(`${API_URL}/api/streaming/radio/stations`, stationData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Update radio station
    updateRadioStation: async (id, stationData) => {
        const response = await axios.put(`${API_URL}/api/streaming/radio/stations/${id}`, stationData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Delete radio station
    deleteRadioStation: async (id) => {
        const response = await axios.delete(`${API_URL}/api/streaming/radio/stations/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Start listening to a radio station
    startListening: async (id, type = 'radio') => {
        const response = await axios.post(
            `${API_URL}/api/streaming/${type}/stations/${id}/listen`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Stop listening to a radio station
    stopListening: async (id, type = 'radio') => {
        const response = await axios.post(
            `${API_URL}/api/streaming/${type}/stations/${id}/stop`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Get popular radio stations
    getPopularRadioStations: async (limit = 20) => {
        const response = await axios.get(`${API_URL}/api/streaming/radio/popular`, {
            params: { limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get available radio genres
    getRadioGenres: async () => {
        const response = await axios.get(`${API_URL}/api/streaming/radio/genres`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // ==================== TV CHANNELS ====================

    // Get all TV channels
    getTVChannels: async (params = {}) => {
        const response = await axios.get(`${API_URL}/api/streaming/tv/channels`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get single TV channel
    getTVChannel: async (id) => {
        const response = await axios.get(`${API_URL}/api/streaming/tv/channels/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Add new TV channel
    addTVChannel: async (channelData) => {
        const response = await axios.post(`${API_URL}/api/streaming/tv/channels`, channelData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Update TV channel
    updateTVChannel: async (id, channelData) => {
        const response = await axios.put(`${API_URL}/api/streaming/tv/channels/${id}`, channelData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Delete TV channel
    deleteTVChannel: async (id) => {
        const response = await axios.delete(`${API_URL}/api/streaming/tv/channels/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Start watching a TV channel
    startWatching: async (id, type = 'tv') => {
        const response = await axios.post(
            `${API_URL}/api/streaming/${type}/channels/${id}/watch`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Stop watching a TV channel
    stopWatching: async (id, type = 'tv') => {
        const response = await axios.post(
            `${API_URL}/api/streaming/${type}/channels/${id}/stop`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Get popular TV channels
    getPopularTVChannels: async (limit = 20) => {
        const response = await axios.get(`${API_URL}/api/streaming/tv/popular`, {
            params: { limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get available TV categories
    getTVCategories: async (params = {}) => {
        const response = await axios.get(`${API_URL}/api/streaming/tv/categories`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Import custom TV playlist (M3U/M3U8)
    importTVPlaylist: async ({ url, content, name }) => {
        const response = await axios.post(
            `${API_URL}/api/streaming/tv/import`,
            { url, content, name },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // ==================== FAVORITES ====================

    // Get user favorites
    getFavorites: async (type = null) => {
        const response = await axios.get(`${API_URL}/api/streaming/favorites`, {
            params: type ? { type } : {},
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Add to favorites
    addFavorite: async (itemId, itemType) => {
        const response = await axios.post(
            `${API_URL}/api/streaming/favorites`,
            { itemId, itemType },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Remove from favorites
    removeFavorite: async (id) => {
        const response = await axios.delete(`${API_URL}/api/streaming/favorites/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // ==================== PLAYLISTS ====================

    // Get user playlists
    getPlaylists: async () => {
        const response = await axios.get(`${API_URL}/api/streaming/playlists`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Create playlist
    createPlaylist: async (playlistData) => {
        const response = await axios.post(`${API_URL}/api/streaming/playlists`, playlistData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Import M3U playlist
    importM3UPlaylist: async (name, content, type) => {
        const response = await axios.post(
            `${API_URL}/api/streaming/playlists/import`,
            { name, content, type },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Export playlist as M3U
    exportPlaylist: async (id) => {
        const response = await axios.get(`${API_URL}/api/streaming/playlists/${id}/export`, {
            headers: getAuthHeader(),
            responseType: 'blob'
        });
        return response.data;
    },

    // ==================== HISTORY ====================

    // Get user playback history
    getHistory: async (type = null, limit = 50) => {
        const response = await axios.get(`${API_URL}/api/streaming/history`, {
            params: { type, limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    // ==================== HEALTH ====================

    // Health check
    getHealth: async () => {
        const response = await axios.get(`${API_URL}/api/streaming/health`);
        return response.data;
    }
};

export default streamingService;
