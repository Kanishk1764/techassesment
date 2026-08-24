/** @type {import('next').NextConfig} */
const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
// Ensure protocol is present if only host was supplied
const backendUrl = (rawBackendUrl.startsWith('http://') || rawBackendUrl.startsWith('https://'))
  ? rawBackendUrl.replace(/\/$/, '')
  : `https://${rawBackendUrl.replace(/\/$/, '')}`;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
