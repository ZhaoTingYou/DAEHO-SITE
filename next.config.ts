import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: process.cwd()
  },
  async redirects() {
    return [
      {source: '/:locale(ko|en)/chronicle', destination: '/:locale/archive', permanent: true},
      {source: '/:locale(ko|en)/legacy', destination: '/:locale/heritage/loyalty', permanent: true},
      {source: '/:locale(ko|en)/legacy/:path*', destination: '/:locale/heritage/:path*', permanent: true},
      {source: '/:locale(ko|en)/specialty/technique', destination: '/:locale/mastery/making', permanent: true},
      {source: '/:locale(ko|en)/specialty/collection/:path*', destination: '/:locale/mastery/creations/:path*', permanent: true},
      {source: '/:locale(ko|en)/specialty', destination: '/:locale/mastery/making', permanent: true},
      {source: '/:locale(ko|en)/journal/:path*', destination: '/:locale/news/:path*', permanent: true},
      {source: '/chronicle', destination: '/archive', permanent: true},
      {source: '/legacy', destination: '/heritage/loyalty', permanent: true},
      {source: '/legacy/:path*', destination: '/heritage/:path*', permanent: true},
      {source: '/specialty/technique', destination: '/mastery/making', permanent: true},
      {source: '/specialty/collection/:path*', destination: '/mastery/creations/:path*', permanent: true},
      {source: '/specialty', destination: '/mastery/making', permanent: true},
      {source: '/journal/:path*', destination: '/news/:path*', permanent: true}
    ];
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
