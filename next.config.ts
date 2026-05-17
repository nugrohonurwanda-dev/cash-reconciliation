import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // @react-pdf/renderer adalah ESM-only package yang harus dijalankan
  // di Node.js runtime secara langsung — BUKAN di-bundle oleh webpack.
  // transpilePackages (lama) justru menyebabkan dual-React instance dan
  // crash saat renderToBuffer dipanggil dari API route server-side.
  // serverExternalPackages mengecualikannya dari webpack bundling sehingga
  // Next.js menyerahkan resolusi module ke Node.js native.
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/reconciler",
    "@react-pdf/layout",
    "@react-pdf/render",
    "@react-pdf/primitives",
    "@react-pdf/font",
    "@react-pdf/pdfkit",
    "@react-pdf/fns",
    "@react-pdf/stylesheet",
    "@react-pdf/textkit",
    "@react-pdf/types",
  ],

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
