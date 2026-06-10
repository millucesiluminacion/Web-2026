/**
 * Image Utility — Safe Optimization Layer
 *
 * Strategy:
 * - Supabase Storage images: returned as-is (Image Transformation not available on this plan)
 * - Unsplash images: native resize params appended (?w=, &q=)
 * - All other URLs: returned as-is for maximum compatibility
 */

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

        // Supabase Storage: NOT transformed (service not enabled on this plan)
        // Return original to avoid 403 errors
        if (url.includes('supabase.co/storage')) {
            return url;
        }

        // All other URLs: passthrough
        return url;
    } catch {
        // If URL parsing fails, return original
        return url;
    }
};
