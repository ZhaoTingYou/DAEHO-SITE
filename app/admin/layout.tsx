import type {Metadata} from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'DEAHO Admin',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminRootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko" className="locale-ko">
      <body className="bg-[#f4f5f7] font-body text-[#182033]">
        {children}
      </body>
    </html>
  );
}
