'use client';

import Link from 'next/link';
import {useEffect, useState, type FormEvent} from 'react';

import type {CustomerInquiry, CustomerProfile} from '@/lib/customer/types';

type Props = {locale: 'ko' | 'en'};

export function MyDaehoDashboard({locale}: Props) {
  const ko = locale === 'ko';
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/customer/me'), fetch('/api/customer/inquiries')])
      .then(async ([profileResponse, inquiryResponse]) => {
        if (profileResponse.status === 401) {
          window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(`/${locale}/my-daeho`)}`);
          return;
        }
        if (!profileResponse.ok || !inquiryResponse.ok) {
          throw new Error('load_failed');
        }
        const [nextProfile, inquiryPayload] = await Promise.all([
          profileResponse.json() as Promise<CustomerProfile>,
          inquiryResponse.json() as Promise<{items: CustomerInquiry[]}>
        ]);
        setProfile(nextProfile);
        setInquiries(inquiryPayload.items);
      })
      .catch(() => setError(ko ? '계정 정보를 불러오지 못했습니다.' : 'Unable to load your account.'))
      .finally(() => setLoading(false));
  }, [ko, locale]);

  if (loading) {
    return <p className="py-16 text-subtext">{ko ? '불러오는 중…' : 'Loading…'}</p>;
  }
  if (error || !profile) {
    return <p role="alert" className="border-l-2 border-primary px-4 py-3">{error || (ko ? '로그인이 필요합니다.' : 'Sign-in required.')}</p>;
  }

  const openCount = inquiries.filter((item) => !['done', 'spam'].includes(item.status)).length;
  const latest = inquiries[0];

  return (
    <div className="space-y-16">
      <section aria-labelledby="progress-title">
        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard label={ko ? '진행 중 문의' : 'Open inquiries'} value={String(openCount)} />
          <SummaryCard label={ko ? '전체 문의' : 'All inquiries'} value={String(inquiries.length)} />
          <SummaryCard label={ko ? '휴대폰 상태' : 'Phone status'} value={ko ? '확인됨' : 'Verified'} />
        </div>
        <h2 id="progress-title" className="mt-12 font-heading text-3xl font-semibold">{ko ? '최근 문의 진행' : 'Latest inquiry progress'}</h2>
        {latest ? (
          <Link href={`/${locale}/my-daeho/inquiries/${latest.id}`} className="mt-6 block border-y border-hairline py-6 transition hover:border-accent">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">{latest.source === 'golf' ? 'GOLF' : 'CONTACT'} · {formatDate(latest.createdAt, locale)}</p>
                <p className="mt-2 text-lg font-semibold">{latest.inquiryType || latest.team || (ko ? '일반 문의' : 'General inquiry')}</p>
              </div>
              <StatusBadge status={latest.status} locale={locale} />
            </div>
          </Link>
        ) : <p className="mt-5 text-subtext">{ko ? '아직 연결된 문의가 없습니다.' : 'No linked inquiries yet.'}</p>}
      </section>

      <section id="inquiries" aria-labelledby="inquiries-title">
        <h2 id="inquiries-title" className="font-heading text-3xl font-semibold">{ko ? '전체 문의' : 'All inquiries'}</h2>
        <div className="mt-6 divide-y divide-hairline border-y border-hairline">
          {inquiries.map((item) => (
            <Link key={item.id} href={`/${locale}/my-daeho/inquiries/${item.id}`} className="flex min-h-20 items-center justify-between gap-5 py-4 transition hover:text-accent">
              <div>
                <p className="text-sm font-semibold">{item.inquiryType || item.team || (ko ? '일반 문의' : 'General inquiry')}</p>
                <p className="mt-1 text-xs text-subtext">{formatDate(item.createdAt, locale)} · {item.id.slice(0, 8)}</p>
              </div>
              <StatusBadge status={item.status} locale={locale} />
            </Link>
          ))}
        </div>
      </section>

      <section id="profile" aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-heading text-3xl font-semibold">{ko ? '개인 정보' : 'Profile'}</h2>
        <form className="mt-7 grid gap-5 md:grid-cols-2" onSubmit={saveProfile}>
          <ReadOnlyField label={ko ? '확인된 휴대폰' : 'Verified mobile'} value={profile.phone} />
          <EditableField label={ko ? '표시 이름' : 'Display name'} name="displayName" defaultValue={profile.displayName} />
          <EditableField label={ko ? '이메일' : 'Email'} name="email" type="email" defaultValue={profile.email} />
          <EditableField label={ko ? '회사/조직' : 'Company / organization'} name="organization" defaultValue={profile.organization} />
          <EditableField label={ko ? '팀' : 'Team'} name="team" defaultValue={profile.team} />
          <div className="flex items-end">
            <button className="consult-cta consult-cta--accent"><span className="consult-cta__label">{ko ? '저장' : 'Save'}</span></button>
          </div>
          {saved ? <p role="status" className="text-sm text-accent">{ko ? '저장되었습니다.' : 'Saved.'}</p> : null}
        </form>
      </section>

      <LegacyClaimForm locale={locale} />

      <section id="security" aria-labelledby="security-title" className="border-t border-hairline pt-10">
        <h2 id="security-title" className="font-heading text-3xl font-semibold">{ko ? '계정 및 보안' : 'Account & security'}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-subtext">
          {ko ? '현재 사이트와 다른 DAEHO 사이트의 세션을 종료하거나 계정 삭제를 요청할 수 있습니다.' : 'End sessions across DAEHO sites or request account deletion.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="consult-cta" onClick={logoutAll}><span className="consult-cta__label">{ko ? '모든 기기에서 로그아웃' : 'Sign out everywhere'}</span></button>
          <button type="button" className="consult-cta" onClick={deleteAccount}><span className="consult-cta__label">{ko ? '계정 삭제 요청' : 'Request account deletion'}</span></button>
        </div>
      </section>
    </div>
  );

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaved(false);
    const response = await fetch('/api/customer/me', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        displayName: data.get('displayName'), email: data.get('email'),
        organization: data.get('organization'), team: data.get('team'), locale
      })
    });
    if (response.ok) {
      setProfile(await response.json());
      setSaved(true);
    }
  }

  async function logoutAll() {
    await fetch('/api/customer/logout-all', {method: 'POST'});
    window.location.assign(`/${locale}`);
  }

  async function deleteAccount() {
    if (!window.confirm(ko ? '계정 로그인이 즉시 중지됩니다. 삭제를 요청할까요?' : 'Sign-in will stop immediately. Request deletion?')) return;
    const response = await fetch('/api/customer/me', {method: 'DELETE'});
    if (response.status === 428) {
      window.location.assign(`/api/auth/login?reauth=true&returnTo=${encodeURIComponent(`/${locale}/my-daeho#security`)}`);
      return;
    }
    if (response.ok) window.location.assign(`/${locale}`);
  }
}

export function StatusBadge({status, locale}: {status: CustomerInquiry['status']; locale: 'ko' | 'en'}) {
  const labels = locale === 'ko'
    ? {new: '접수 완료', contacted: '담당자 확인', in_progress: '상담 진행 중', done: '처리 완료', spam: '접수 검토 종료'}
    : {new: 'Received', contacted: 'Reviewed', in_progress: 'In progress', done: 'Completed', spam: 'Review closed'};
  return <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent">{labels[status]}</span>;
}

function SummaryCard({label, value}: {label: string; value: string}) {
  return <div className="border border-hairline bg-white/45 p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtext">{label}</p><p className="mt-4 font-heading text-3xl font-semibold">{value}</p></div>;
}

function ReadOnlyField({label, value}: {label: string; value: string}) {
  return <label className="block space-y-2 text-sm font-semibold text-subtext"><span>{label}</span><input value={value} readOnly className="min-h-12 w-full border-b border-primary/20 bg-transparent py-3 text-base font-normal text-primary opacity-70" /></label>;
}

function EditableField({label, name, ...props}: {label: string; name: string} & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block space-y-2 text-sm font-semibold text-subtext"><span>{label}</span><input {...props} name={name} className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal text-primary outline-none focus:border-accent" /></label>;
}

function LegacyClaimForm({locale}: Props) {
  const ko = locale === 'ko';
  const [message, setMessage] = useState('');
  return (
    <section id="claim" aria-labelledby="claim-title">
      <h2 id="claim-title" className="font-heading text-3xl font-semibold">{ko ? '이전 문의 연결' : 'Claim a previous inquiry'}</h2>
      <p className="mt-4 text-sm leading-6 text-subtext">{ko ? '문의 번호와 당시 연락처를 제출하면 담당자가 확인합니다. 휴대폰 번호만으로 자동 연결하지 않습니다.' : 'Submit the inquiry ID and prior contact for review. We never auto-link by phone alone.'}</p>
      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const response = await fetch('/api/customer/legacy-claims', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({inquiryId: data.get('inquiryId'), contact: data.get('contact')})});
        setMessage(response.ok ? (ko ? '검토 요청이 접수되었습니다.' : 'Claim submitted for review.') : (ko ? '요청을 처리하지 못했습니다.' : 'Unable to submit claim.'));
      }}>
        <EditableField label={ko ? '문의 번호' : 'Inquiry ID'} name="inquiryId" required />
        <EditableField label={ko ? '당시 연락처' : 'Prior contact'} name="contact" required />
        <button className="consult-cta w-fit"><span className="consult-cta__label">{ko ? '검토 요청' : 'Request review'}</span></button>
        {message ? <p role="status" className="self-center text-sm text-subtext">{message}</p> : null}
      </form>
    </section>
  );
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {dateStyle: 'medium'}).format(new Date(value)); }
  catch { return value; }
}
