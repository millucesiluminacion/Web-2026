/**
 * Image utility (Passthrough)
 * Reverted to simple passthrough to ensure maximum compatibility and visibility.
 */

export const optimizeImage = (url, width, height = null, quality = 80) => {
    // If no URL, return placeholder
    if (!url) return '/placeholder.jpg';

    // Standard behavior: just return the original URL
    // Optimization is disabled to ensure images are always visible
    return url;
};
