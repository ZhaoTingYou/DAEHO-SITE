'use client';

import Link from 'next/link';
import {useEffect, useState, type FormEvent} from 'react';

import type {AccountMessages} from '@/lib/customer/messages';
import type {CustomerInquiry, CustomerProfile} from '@/lib/customer/types';

type DashboardCopy = AccountMessages['dashboard'];
type Props = {locale: 'ko' | 'en'; copy: DashboardCopy};

export function MyDaehoDashboard({locale, copy}: Props) {
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
      .catch(() => setError(copy.loadError))
      .finally(() => setLoading(false));
  }, [copy.loadError, locale]);

  if (loading) {
    return <p className="py-16 text-subtext">{copy.loading}</p>;
  }
  if (error || !profile) {
    return <p role="alert" className="border-l-2 border-primary px-4 py-3">{error || copy.signInRequired}</p>;
  }

  const openCount = inquiries.filter((item) => !['done', 'spam'].includes(item.status)).length;
  const latest = inquiries[0];

  return (
    <div className="space-y-16">
      <section aria-labelledby="progress-title">
        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard label={copy.openInquiries} value={String(openCount)} />
          <SummaryCard label={copy.allInquiries} value={String(inquiries.length)} />
          <SummaryCard label={copy.phoneStatus} value={copy.verified} />
        </div>
        <h2 id="progress-title" className="mt-12 font-heading text-3xl font-semibold">{copy.latestProgress}</h2>
        {latest ? (
          <Link href={`/${locale}/my-daeho/inquiries/${latest.id}`} className="mt-6 block border-y border-hairline py-6 transition hover:border-accent">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">{latest.source === 'golf' ? 'GOLF' : 'CONTACT'} · {formatDate(latest.createdAt, locale)}</p>
                <p className="mt-2 text-lg font-semibold">{latest.inquiryType || latest.team || copy.generalInquiry}</p>
              </div>
              <StatusBadge status={latest.status} labels={copy.statuses} />
            </div>
          </Link>
        ) : <p className="mt-5 text-subtext">{copy.noInquiries}</p>}
      </section>

      <section id="inquiries" aria-labelledby="inquiries-title">
        <h2 id="inquiries-title" className="font-heading text-3xl font-semibold">{copy.allInquiries}</h2>
        <div className="mt-6 divide-y divide-hairline border-y border-hairline">
          {inquiries.map((item) => (
            <Link key={item.id} href={`/${locale}/my-daeho/inquiries/${item.id}`} className="flex min-h-20 items-center justify-between gap-5 py-4 transition hover:text-accent">
              <div>
                <p className="text-sm font-semibold">{item.inquiryType || item.team || copy.generalInquiry}</p>
                <p className="mt-1 text-xs text-subtext">{formatDate(item.createdAt, locale)} · {item.id.slice(0, 8)}</p>
              </div>
              <StatusBadge status={item.status} labels={copy.statuses} />
            </Link>
          ))}
        </div>
      </section>

      <section id="profile" aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-heading text-3xl font-semibold">{copy.profileTitle}</h2>
        <form className="mt-7 grid gap-5 md:grid-cols-2" onSubmit={saveProfile}>
          <ReadOnlyField label={copy.username} value={profile.loginName} />
          <ReadOnlyField label={copy.verifiedMobile} value={profile.phone} />
          <EditableField label={copy.displayName} name="displayName" defaultValue={profile.displayName} />
          <EditableField label={copy.email} name="email" type="email" defaultValue={profile.email} />
          <EditableField label={copy.organization} name="organization" defaultValue={profile.organization} />
          <EditableField label={copy.team} name="team" defaultValue={profile.team} />
          <div className="flex items-end">
            <button className="consult-cta consult-cta--accent"><span className="consult-cta__label">{copy.save}</span></button>
          </div>
          {saved ? <p role="status" className="text-sm text-accent">{copy.saved}</p> : null}
        </form>
      </section>

      <LegacyClaimForm copy={copy} />

      <section id="security" aria-labelledby="security-title" className="border-t border-hairline pt-10">
        <h2 id="security-title" className="font-heading text-3xl font-semibold">{copy.securityTitle}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-subtext">{copy.securityBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="consult-cta" onClick={logoutAll}><span className="consult-cta__label">{copy.signOutEverywhere}</span></button>
          <button type="button" className="consult-cta" onClick={deleteAccount}><span className="consult-cta__label">{copy.requestDeletion}</span></button>
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
    if (!window.confirm(copy.confirmDeletion)) return;
    const response = await fetch('/api/customer/me', {method: 'DELETE'});
    if (response.status === 428) {
      window.location.assign(`/api/auth/login?reauth=true&returnTo=${encodeURIComponent(`/${locale}/my-daeho#security`)}`);
      return;
    }
    if (response.ok) window.location.assign(`/${locale}`);
  }
}

export function StatusBadge({status, labels}: {status: CustomerInquiry['status']; labels: DashboardCopy['statuses']}) {
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

function LegacyClaimForm({copy}: {copy: DashboardCopy}) {
  const [message, setMessage] = useState('');
  return (
    <section id="claim" aria-labelledby="claim-title">
      <h2 id="claim-title" className="font-heading text-3xl font-semibold">{copy.claimTitle}</h2>
      <p className="mt-4 text-sm leading-6 text-subtext">{copy.claimBody}</p>
      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const response = await fetch('/api/customer/legacy-claims', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({inquiryId: data.get('inquiryId'), contact: data.get('contact')})});
        setMessage(response.ok ? copy.claimSubmitted : copy.claimError);
      }}>
        <EditableField label={copy.inquiryId} name="inquiryId" required />
        <EditableField label={copy.priorContact} name="contact" required />
        <button className="consult-cta w-fit"><span className="consult-cta__label">{copy.requestReview}</span></button>
        {message ? <p role="status" className="self-center text-sm text-subtext">{message}</p> : null}
      </form>
    </section>
  );
}

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {dateStyle: 'medium'}).format(new Date(value)); }
  catch { return value; }
}
