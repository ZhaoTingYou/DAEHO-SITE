import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isFrontendOnlyBuild = process.env.DAEHO_FRONTEND_ONLY === 'true';
const mediaImageOrigin = imageOrigin(
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? process.env.CMS_S3_PUBLIC_BASE_URL
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: isFrontendOnlyBuild ? 'export' : 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: mediaImageOrigin.protocol,
        hostname: mediaImageOrigin.hostname,
        port: mediaImageOrigin.port
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

function imageOrigin(value?: string) {
  const fallback = new URL('https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com');

  try {
    const url = new URL(value || fallback);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported media URL protocol');
    }

    return {
      protocol: url.protocol.slice(0, -1) as 'http' | 'https',
      hostname: url.hostname,
      port: url.port
    };
  } catch {
    return {
      protocol: 'https' as const,
      hostname: fallback.hostname,
      port: ''
    };
  }
}
