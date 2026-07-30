/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  output: "standalone",
  productionBrowserSourceMaps: true,
  async headers() {
    return [
      {
        source: "/api/distribution/:id/preview",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
