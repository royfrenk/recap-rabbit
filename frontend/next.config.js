/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      // Apple Podcasts
      {
        protocol: 'https',
        hostname: '*.mzstatic.com',
      },
      // Spotify
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
      },
      // Podcast hosting platforms
      {
        protocol: 'https',
        hostname: 'megaphone.imgix.net',
      },
      {
        protocol: 'https',
        hostname: 'image.simplecastcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'ssl-static.libsyn.com',
      },
      {
        protocol: 'https',
        hostname: 'static.libsyn.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.pippa.io',
      },
      {
        protocol: 'https',
        hostname: 'images.transistor.fm',
      },
      {
        protocol: 'https',
        hostname: 'd1bm3dmew779uf.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'media.redcircle.com',
      },
      {
        protocol: 'https',
        hostname: 'pbcdn1.podbean.com',
      },
      {
        protocol: 'https',
        hostname: 'images.buzzsprout.com',
      },
      {
        protocol: 'https',
        hostname: 'd3t3ozftmdmh3i.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'storage.pinecast.net',
      },
      {
        protocol: 'https',
        hostname: 'images.podiant.co',
      },
      {
        protocol: 'https',
        hostname: 'www.omnycontent.com',
      },
      {
        protocol: 'https',
        hostname: 'd.radioline.fr',
      },
    ],
  },
}

module.exports = nextConfig
