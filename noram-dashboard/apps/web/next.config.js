/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for local development:
  // Proxies /api/* requests to the Express server running on localhost:4000.
  // This avoids CORS issues in development and mirrors the production setup
  // where a reverse proxy (e.g. nginx or a cloud load balancer) routes traffic.
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
