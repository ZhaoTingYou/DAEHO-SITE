import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: process.cwd()
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
