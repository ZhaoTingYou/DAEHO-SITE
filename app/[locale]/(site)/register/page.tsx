import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {RegisterForm} from '@/components/customer/register-form';
import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const metadata: Metadata = {title: 'Create DAEHO account', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function RegisterPage({params}: {params: Promise<{locale: string}>}) {
  await connection();
  const {locale} = await params;
  if (!isLocale(locale)) notFound();
  const ko = locale === 'ko';
  return (
    <main className="min-h-screen bg-bg px-container pb-24 pt-36 text-primary md:pt-44">
      <div className="mx-auto max-w-xl">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-accent">MY DAEHO</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">{ko ? '계정 만들기' : 'Create account'}</h1>
        <p className="mt-5 text-base leading-7 text-subtext">
          {ko ? '문의 내역과 진행 상태를 한곳에서 확인할 수 있습니다.' : 'Keep your inquiries and progress in one place.'}
        </p>
        <div className="mt-10 border-t border-hairline pt-8">
          {await accountsEnabled() ? <RegisterForm locale={locale} /> : (
            <p className="border-l-2 border-accent px-4 py-3 text-sm leading-6">
              {ko ? '회원 기능은 현재 준비 중입니다.' : 'Customer accounts are being prepared.'}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
