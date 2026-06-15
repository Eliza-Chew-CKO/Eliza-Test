/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for local development:
  // Proxies /api/* requests to the Express backend at localhost:4000,
  // avoiding CORS issues during development. In production, configure
  // your reverse proxy (nginx, etc.) to route /api/* to the API service.
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: 'http://localhost:4000/api/:path*',
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
