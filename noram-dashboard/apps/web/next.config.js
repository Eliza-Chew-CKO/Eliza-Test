/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * API rewrites for local development.
   *
   * In production the frontend and API are deployed separately and the API URL
   * is set via NEXT_PUBLIC_API_URL. During local dev, /api/* is proxied to the
   * Express server at localhost:4000 so you don't need to worry about CORS.
   */
  async rewrites() {
    // Only apply rewrites when running locally without a custom API URL set
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
