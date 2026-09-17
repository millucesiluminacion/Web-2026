/**
 * Image Utility — Safe Optimization & Edge Cache Layer
 *
 * Strategy:
 * - Supabase Storage images: Routed through /storage-proxy/ to be cached by Vercel Edge CDN (100GB/mo free quota)
 *   with 1-year immutable caching. Falls back cleanly to original URL on any issue.
 * - Unsplash images: native resize params appended (?w=, &q=)
 * - All other URLs: returned as-is for maximum compatibility
 */

/**
 * Converts a Supabase Storage URL to the local edge cached proxy route.
 * @param {string|null} url - Original URL
 * @returns {string} Cached proxy route or original URL
 */
export const getStorageProxyUrl = (url) => {
    if (!url || typeof url !== 'string') return url || '/placeholder.jpg';
    if (url.includes('/storage/v1/object/public/')) {
        return url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//, '/storage-proxy/');
    }
    return url;
};

/**
 * Optimizes an image URL where possible.
 * @param {string|null} url - Original URL
 * @param {number} width - Desired display width in pixels
 * @param {number|null} height - Desired display height (optional)
 * @param {number} quality - Image quality 1-100 (for supported providers)
 * @returns {string} Optimized or original URL
 */
export const optimizeImage = (url, width = 600, height = null, quality = 80) => {
    if (!url) return '/placeholder.jpg';

    try {
        // Unsplash: supports native resize via query params
        if (url.includes('unsplash.com')) {
            const parsed = new URL(url);
            parsed.searchParams.set('w', String(width));
            parsed.searchParams.set('q', String(quality));
            parsed.searchParams.set('auto', 'format');
            parsed.searchParams.set('fit', 'crop');
            if (height) parsed.searchParams.set('h', String(height));
            return parsed.toString();
        }

        // Supabase Storage: Route through Vercel Edge Cache Proxy
        // Cached for 1 year on Vercel's global CDN (100GB free tier, zero Supabase egress)
        if (url.includes('/storage/v1/object/public/')) {
            return getStorageProxyUrl(url);
        }

        // All other URLs: passthrough
        return url;
    } catch {
        // If URL parsing fails, return original
        return url;
    }
};
