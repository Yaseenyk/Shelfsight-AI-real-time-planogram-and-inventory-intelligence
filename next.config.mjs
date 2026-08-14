/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle for the Docker runtime stage, so the
  // image ships ~120 MB instead of the full node_modules tree.
  output: "standalone",
  images: {
    // Frames served by FastAPI's /media mount.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
    ],
  },
  async rewrites() {
    // Lets the browser call same-origin /api/* in development, sidestepping CORS
    // entirely. Production should point NEXT_PUBLIC_API_BASE_URL at the real host.
    return [{ source: "/api/v1/:path*", destination: `${apiBase}/api/v1/:path*` }];
  },
};

export default nextConfig;
