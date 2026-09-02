'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';

import {StatusBadge} from './my-daeho-dashboard';
import type {AccountMessages} from '@/lib/customer/messages';
import type {CustomerInquiry} from '@/lib/customer/types';

export function InquiryDetail({locale, id, copy, statusLabels}: {
  locale: 'ko' | 'en';
  id: string;
  copy: AccountMessages['inquiryDetail'];
  statusLabels: AccountMessages['dashboard']['statuses'];
}) {
  const [item, setItem] = useState<CustomerInquiry | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(`/api/customer/inquiries/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as {inquiry: CustomerInquiry};
        setItem(payload.inquiry);
      }).catch(() => setError(true));
  }, [id]);
  if (error) return <p role="alert">{copy.notFound}</p>;
  if (!item) return <p>{copy.loading}</p>;
  return (
    <div>
      <Link href={`/${locale}/my-daeho`} className="text-sm text-subtext underline">← {copy.back}</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div><p className="text-xs uppercase tracking-[0.16em] text-subtext">{item.source} · {item.id}</p><h1 className="mt-3 font-heading text-4xl font-semibold">{item.inquiryType || item.team || copy.generalInquiry}</h1></div>
        <StatusBadge status={item.status} labels={statusLabels} />
      </div>
      <dl className="mt-8 grid gap-6 md:grid-cols-2">
        <Detail label={copy.received} value={new Date(item.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')} />
        <Detail label={copy.contact} value={item.phone || item.email} />
        <Detail label={copy.companyTeam} value={item.organization || item.team || '—'} />
        <Detail label={copy.requestedDate} value={item.dueDate || '—'} />
      </dl>
      <div className="mt-8 border-t border-hairline pt-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtext">{copy.message}</p><p className="mt-4 whitespace-pre-wrap text-base leading-8">{item.message || '—'}</p></div>
      {item.status === 'spam' ? <p className="mt-8 border-l-2 border-accent px-4 py-3 text-sm leading-6">{copy.reviewClosed}</p> : null}
    </div>
  );
}

function Detail({label, value}: {label: string; value: string}) { return <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-subtext">{label}</dt><dd className="mt-2 text-base">{value}</dd></div>; }
