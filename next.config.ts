import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isFrontendOnlyBuild = process.env.DAEHO_FRONTEND_ONLY === 'true';
const s3ImageHostname = imageHostname(process.env.CMS_S3_PUBLIC_BASE_URL)
  ?? 'daeho-prod-media.s3.ap-northeast-2.amazonaws.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: isFrontendOnlyBuild ? 'export' : 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: s3ImageHostname
      }
    ],
    ...(isFrontendOnlyBuild ? {unoptimized: true} : {})
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '64mb'
    }
  },
  turbopack: {
    root: process.cwd()
  },
  async redirects() {
    if (isFrontendOnlyBuild) {
      return [];
    }

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

function imageHostname(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}
