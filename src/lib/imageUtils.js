/**
 * Image transformation utility for Supabase
 * Optimizes images by adding transformation parameters to the URL
 */

export const optimizeImage = (url, width, height = null, quality = 80) => {
    if (!url) return '/placeholder.jpg';

    // Check if optimization is explicitly enabled via env
    // Default to false (safe mode) if not set or false
    if (import.meta.env.VITE_ENABLE_IMAGE_OPTIMIZATION !== 'true') {
        return url;
    }

    // Check if it's a Supabase storage URL
    // Pattern: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        // Change 'object' to 'render/image' for transformation API
        let optimizedUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');

        // Add transformation parameters
        const params = new URLSearchParams();
        if (width) params.append('width', width);
        if (height) params.append('height', height);
        params.append('quality', quality);
        params.append('format', 'webp'); // Always use WebP for performance

        return `${optimizedUrl}${optimizedUrl.includes('?') ? '&' : '?'}${params.toString()}`;
    }

    // For Unsplash or other external services that support params
    if (url.includes('unsplash.com')) {
        const params = new URLSearchParams();
        if (width) params.append('w', width);
        if (height) params.append('h', height);
        params.append('q', quality);
        params.append('fm', 'webp');
        params.append('fit', 'max');
        return `${url.split('?')[0]}?${params.toString()}`;
    }

    return url;
};
