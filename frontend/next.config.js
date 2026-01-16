/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    STAGING_AUTH: process.env.STAGING_AUTH,
    STAGING_USER: process.env.STAGING_USER,
    STAGING_PASS: process.env.STAGING_PASS,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
