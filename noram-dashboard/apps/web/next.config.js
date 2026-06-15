/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for local development:
  // Proxies /api/* requests from the Next.js dev server to the Express API
  // running on localhost:4000, so you don't need CORS in dev.
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
