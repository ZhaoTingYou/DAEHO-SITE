import type {MetadataRoute} from 'next';

import {isPreviewNoindexEnabled, metadataBase} from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (isPreviewNoindexEnabled()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/'
      }
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/__styleguide', '/ko/styleguide-internal', '/en/styleguide-internal']
    },
    sitemap: new URL('/sitemap.xml', metadataBase).toString()
  };
}
