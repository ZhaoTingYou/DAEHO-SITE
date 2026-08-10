import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';

export default async function AdminForbidden() {
  const {t} = await getAdminI18n();

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f5f7] px-4 py-10 text-[#182033]">
      <section className="w-full max-w-[520px] rounded-lg border border-[#d9dee7] bg-white p-7 shadow-sm">
        <p className="font-heading text-[24px] font-semibold tracking-[0.12em] text-[#101827]">DAEHO</p>
        <h1 className="mt-5 text-xl font-bold text-[#182033]">{t('forbidden.title')}</h1>
        <p className="mt-3 text-sm leading-6 text-[#647084]">{t('forbidden.body')}</p>
        <Link
          href="/admin"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-white transition hover:bg-[#101827]"
        >
          {t('forbidden.back')}
        </Link>
      </section>
    </main>
  );
}
