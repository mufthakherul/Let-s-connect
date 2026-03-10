/**
 * Shared API client for web and mobile consumers.
 *
 * This uses fetch to stay runtime-agnostic (browser + React Native).
 */

const hasWindow = typeof window !== 'undefined';

const normalizeBaseUrl = (value = '') => String(value || '').replace(/\/+$/, '');

const withTimeout = (promise, timeoutMs) => {
    if (!timeoutMs || timeoutMs <= 0) {
        return promise;
    }

    let timeoutHandle;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
};

export function createSharedApiClient({
    baseUrl = '',
    getToken,
    defaultHeaders = {},
    timeoutMs = 15000,
} = {}) {
    const normalizedBase = normalizeBaseUrl(baseUrl);

    const request = async (path, options = {}) => {
        const {
            method = 'GET',
            headers = {},
            body,
            credentials = 'include',
            signal,
            timeout = timeoutMs,
        } = options;

        const token = typeof getToken === 'function' ? await getToken() : null;
        const mergedHeaders = {
            ...defaultHeaders,
            ...headers,
        };

        if (token && !mergedHeaders.Authorization) {
            mergedHeaders.Authorization = `Bearer ${token}`;
        }

        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const payload = body && !isFormData && typeof body !== 'string'
            ? JSON.stringify(body)
            : body;

        if (payload && !isFormData && !mergedHeaders['Content-Type']) {
            mergedHeaders['Content-Type'] = 'application/json';
        }

        const url = `${normalizedBase}${path}`;

        const response = await withTimeout(
            fetch(url, {
                method,
                headers: mergedHeaders,
                body: payload,
                credentials,
                signal,
            }),
            timeout,
        );

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const error = new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    };

    return {
        request,
        get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
        post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
        put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
        patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
        delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
    };
}

export const webSharedApiClient = createSharedApiClient({
    baseUrl: '',
    getToken: () => {
        if (!hasWindow) {
            return null;
        }

        return localStorage.getItem('token');
    },
    defaultHeaders: {
        'X-Client-Platform': 'web',
    },
});

export default webSharedApiClient;
