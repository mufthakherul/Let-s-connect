export const ANONYMOUS_USER_POST_LABEL = 'Anonymous Post';

export function buildProfilePath(username, fallbackId) {
    if (username && String(username).trim()) {
        return `/${encodeURIComponent(String(username).trim())}`;
    }
    if (fallbackId && String(fallbackId).trim()) {
        return `/profile/u/${encodeURIComponent(String(fallbackId).trim())}`;
    }
    return '/profile';
}

export function getPostAuthorLabel(post) {
    if (!post) return 'Unknown user';
    if (post.isAnonymous) return ANONYMOUS_USER_POST_LABEL;

    return (
        post.author?.username ||
        post.userName ||
        post.username ||
        [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') ||
        'Unknown user'
    );
}
