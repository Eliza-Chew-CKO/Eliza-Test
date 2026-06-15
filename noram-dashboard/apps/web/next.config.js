/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // API rewrites for local development:
  // Proxies /api/* requests from the Next.js dev server to the Express API at localhost:4000.
  // This avoids CORS issues during local development without needing a reverse proxy.
  // In production, configure your reverse proxy (nginx/Vercel/etc.) to route /api/* appropriately.
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
