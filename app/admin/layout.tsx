import type {Metadata} from 'next';

import '@/app/globals.css';
import {getAdminLocale} from '@/lib/admin-i18n';

export const metadata: Metadata = {
  title: 'DAEHO Admin',
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminRootLayout({children}: {children: React.ReactNode}) {
  const locale = await getAdminLocale();

  return (
    <html lang={locale} className={`locale-${locale}`}>
      <body className="bg-[#f4f5f7] font-body text-[#182033]">
        {children}
      </body>
    </html>
  );
}
