'use client';

import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';

import {adminLocaleLabels, adminLocales, type AdminLocale} from '@/lib/admin-locales';

type Props = {
  activeLocale: AdminLocale;
  label: string;
};

export function AdminLanguageSwitcher({activeLocale, label}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const nextPath = `${pathname}${query ? `?${query}` : ''}`;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-white/5 p-1">
        {adminLocales.map((locale) => {
          const active = locale === activeLocale;

          return (
            <Link
              key={locale}
              href={`/api/admin/locale?locale=${locale}&next=${encodeURIComponent(nextPath)}`}
              className={`inline-flex min-h-8 items-center justify-center rounded px-2 text-xs font-semibold transition ${
                active
                  ? 'bg-white text-[#101827]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {adminLocaleLabels[locale]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
