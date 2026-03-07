// Utility helpers for generating lightweight placeholder images.
// We use data URI SVGs so that the browser never has to perform a DNS lookup
// or fetch an external resource. This avoids issues such as `ERR_NAME_NOT_RESOLVED`
// when services like via.placeholder.com are unreachable.

/**
 * Return a data-URI SVG placeholder with centered text.
 * @param {string} text  Text to render in the placeholder (e.g. "TV", "Radio").
 * @returns {string} Data URI string suitable for an <img> src.
 */
export function makePlaceholder(text = '') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="140">
        <rect width="300" height="140" fill="#ccc"/>
        <text x="150" y="70" font-size="20" text-anchor="middle" fill="#333">${text}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
