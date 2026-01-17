/**
 * Image URL validation utilities.
 * Prevents tracking pixels and untrusted image sources.
 */

/**
 * Trusted CDN hostnames for podcast artwork.
 * Matches the backend TRUSTED_ARTWORK_HOSTS and next.config.js remotePatterns.
 */
const TRUSTED_HOSTS = new Set([
  // Apple Podcasts
  'is1-ssl.mzstatic.com',
  'is2-ssl.mzstatic.com',
  'is3-ssl.mzstatic.com',
  'is4-ssl.mzstatic.com',
  'is5-ssl.mzstatic.com',
  // Spotify
  'i.scdn.co',
  'mosaic.scdn.co',
  // Podcast hosting platforms
  'megaphone.imgix.net',
  'image.simplecastcdn.com',
  'ssl-static.libsyn.com',
  'static.libsyn.com',
  'assets.pippa.io',
  'images.transistor.fm',
  'd1bm3dmew779uf.cloudfront.net',
  'media.redcircle.com',
  'pbcdn1.podbean.com',
  'images.buzzsprout.com',
  'd3t3ozftmdmh3i.cloudfront.net',
  'storage.pinecast.net',
  'images.podiant.co',
  'www.omnycontent.com',
  'd.radioline.fr',
  // ListenNotes CDN
  'cdn-images-1.listennotes.com',
  'cdn-images-2.listennotes.com',
  'cdn-images-3.listennotes.com',
  'production.listennotes.com',
]);

/**
 * Image file extensions that are safe to display.
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

/**
 * Path markers that indicate an image resource.
 */
const IMAGE_PATH_MARKERS = ['/image/', '/images/', '/artwork/', '/cover/', '/thumb/', '/avatar/'];

/**
 * Validate an image URL for safe display.
 * Returns the URL if trusted, null if untrusted.
 *
 * @param url - The image URL to validate
 * @returns The URL if safe to display, null otherwise
 */
export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    // Only allow https (and http for localhost in dev)
    if (parsed.protocol !== 'https:') {
      if (!(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
        return null;
      }
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block internal hosts
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(hostname) && parsed.protocol === 'https:') {
      return null;
    }

    // Block private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.')
    ) {
      return null;
    }

    // Allow trusted CDNs
    if (TRUSTED_HOSTS.has(hostname)) {
      return url;
    }

    // Allow *.mzstatic.com (Apple uses numbered subdomains)
    if (hostname.endsWith('.mzstatic.com')) {
      return url;
    }

    // For other hosts, require image-like path
    const pathLower = parsed.pathname.toLowerCase();
    const hasImageExtension = IMAGE_EXTENSIONS.some((ext) => pathLower.endsWith(ext));
    const hasImageMarker = IMAGE_PATH_MARKERS.some((marker) => pathLower.includes(marker));

    if (hasImageExtension || hasImageMarker) {
      return url;
    }

    // URL doesn't appear to be a safe image - reject
    return null;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Get a safe image URL or a fallback.
 *
 * @param url - The image URL to validate
 * @param fallback - Optional fallback URL (default: null)
 * @returns The validated URL, fallback, or null
 */
export function getSafeImageUrl(
  url: string | null | undefined,
  fallback: string | null = null
): string | null {
  return validateImageUrl(url) ?? fallback;
}
