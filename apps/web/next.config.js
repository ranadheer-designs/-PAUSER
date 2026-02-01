/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pauser/common', '@pauser/ui'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@pauser/common': require('path').resolve(__dirname, '../../packages/common/src/index.ts'),
      '@pauser/ui': require('path').resolve(__dirname, '../../packages/ui/src/index.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;
