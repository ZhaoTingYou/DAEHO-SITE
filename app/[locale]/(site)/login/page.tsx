import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const metadata: Metadata = {title: 'DAEHO Login', robots: {index: false, follow: false}};

export default async function LoginPage({params, searchParams}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{error?: string}>;
}) {
  const {locale} = await params;
  const {error} = await searchParams;
  if (!isLocale(locale)) notFound();
  const ko = locale === 'ko';
  const returnTo = `/${locale}/my-daeho`;
  return (
    <main className="min-h-screen bg-bg px-container pb-24 pt-36 text-primary md:pt-44">
      <div className="mx-auto max-w-xl">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-accent">MY DAEHO</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">{ko ? '로그인' : 'Sign in'}</h1>
        <p className="mt-5 text-base leading-7 text-subtext">
          {ko ? '인증된 휴대폰 번호와 비밀번호로 로그인하세요.' : 'Sign in with your verified mobile number and password.'}
        </p>
        {error ? <p role="alert" className="mt-6 border-l-2 border-primary px-4 py-3 text-sm">{ko ? '로그인을 완료하지 못했습니다. 다시 시도해 주세요.' : 'Sign-in could not be completed. Please try again.'}</p> : null}
        <div className="mt-10 grid gap-4 border-t border-hairline pt-8">
          {accountsEnabled() ? (
            <>
              <a className="consult-cta consult-cta--accent justify-center" href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
                <span className="consult-cta__label">{ko ? '로그인 계속하기' : 'Continue to sign in'}</span>
              </a>
              <Link className="consult-cta justify-center" href={`/${locale}/register`}>
                <span className="consult-cta__label">{ko ? '새 계정 만들기' : 'Create an account'}</span>
              </Link>
            </>
          ) : <p>{ko ? '회원 기능은 현재 준비 중입니다.' : 'Customer accounts are being prepared.'}</p>}
        </div>
      </div>
    </main>
  );
}
