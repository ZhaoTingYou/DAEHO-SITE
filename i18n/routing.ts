import {createNavigation} from 'next-intl/navigation';
import {defineRouting} from 'next-intl/routing';

import {defaultLocale, locales, type Locale} from '@/lib/locales';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  alternateLinks: false
});

export type {Locale};

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
