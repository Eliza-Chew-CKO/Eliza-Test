/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for local development:
  // Proxies /api/* requests from the Next.js dev server (port 3000) to the
  // Express API server running on port 4000. In production, configure your
  // reverse proxy (nginx / load balancer) to handle this routing instead.
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
