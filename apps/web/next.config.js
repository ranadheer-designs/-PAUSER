/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pauser/common', '@pauser/ui'],

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
