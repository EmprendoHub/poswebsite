/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "minio.salvawebpro.com", port: "9000" },
      { protocol: "https", hostname: "minio.salvawebpro.com" },
      { protocol: "http", hostname: "minio.salvawebpro.com" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "ebay.com" },
      { protocol: "https", hostname: "www.ebay.com" },
      { protocol: "https", hostname: "*.ebayimg.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "unsplash.com" },
      { protocol: "https", hostname: "pexels.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "http2.mlstatic.com" },
    ],
    minimumCacheTTL: 2678400,
    formats: ["image/webp"],
    deviceSizes: [640, 1080],
    imageSizes: [16, 32, 64],
    loader: ({ src, width, quality }) => {
      // For MinIO images, skip optimization and return direct URL
      if (src.includes("minio.salvawebpro.com")) {
        return src;
      }
      // For other images, use default Next.js loader
      return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
    },
  },
};

export default nextConfig;
