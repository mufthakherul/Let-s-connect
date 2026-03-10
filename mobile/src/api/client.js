import { createSharedApiClient } from '../../../frontend/src/shared/apiClient';

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const mobileApiClient = createSharedApiClient({
    baseUrl: apiBaseUrl,
    getToken: async () => authToken,
    defaultHeaders: {
        'X-Client-Platform': 'mobile'
    }
});

export const feedApi = {
    list: (userId, page = 1, limit = 20) =>
        mobileApiClient.get(`/api/content/posts/feed/${userId}?page=${page}&limit=${limit}`)
};

export const messagingApi = {
    conversations: (userId) => mobileApiClient.get(`/api/messaging/conversations/${userId}`)
};
