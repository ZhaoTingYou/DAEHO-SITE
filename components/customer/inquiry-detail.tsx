'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';

import {StatusBadge} from './my-daeho-dashboard';
import type {CustomerInquiry} from '@/lib/customer/types';

export function InquiryDetail({locale, id}: {locale: 'ko' | 'en'; id: string}) {
  const [item, setItem] = useState<CustomerInquiry | null>(null);
  const [error, setError] = useState(false);
  const ko = locale === 'ko';
  useEffect(() => {
    fetch(`/api/customer/inquiries/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as {inquiry: CustomerInquiry};
        setItem(payload.inquiry);
      }).catch(() => setError(true));
  }, [id]);
  if (error) return <p role="alert">{ko ? '문의를 찾을 수 없습니다.' : 'Inquiry not found.'}</p>;
  if (!item) return <p>{ko ? '불러오는 중…' : 'Loading…'}</p>;
  return (
    <div>
      <Link href={`/${locale}/my-daeho`} className="text-sm text-subtext underline">← {ko ? 'MY DAEHO' : 'Back to MY DAEHO'}</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div><p className="text-xs uppercase tracking-[0.16em] text-subtext">{item.source} · {item.id}</p><h1 className="mt-3 font-heading text-4xl font-semibold">{item.inquiryType || item.team || (ko ? '일반 문의' : 'General inquiry')}</h1></div>
        <StatusBadge status={item.status} locale={locale} />
      </div>
      <dl className="mt-8 grid gap-6 md:grid-cols-2">
        <Detail label={ko ? '접수일' : 'Received'} value={new Date(item.createdAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US')} />
        <Detail label={ko ? '연락처' : 'Contact'} value={item.phone || item.email} />
        <Detail label={ko ? '회사/팀' : 'Company / team'} value={item.organization || item.team || '—'} />
        <Detail label={ko ? '희망 일정' : 'Requested date'} value={item.dueDate || '—'} />
      </dl>
      <div className="mt-8 border-t border-hairline pt-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtext">{ko ? '문의 내용' : 'Message'}</p><p className="mt-4 whitespace-pre-wrap text-base leading-8">{item.message || '—'}</p></div>
      {item.status === 'spam' ? <p className="mt-8 border-l-2 border-accent px-4 py-3 text-sm leading-6">{ko ? '접수 검토가 종료되었습니다. 도움이 필요하면 Contact를 통해 문의해 주세요.' : 'Review has closed. Contact us if you need assistance.'}</p> : null}
    </div>
  );
}

function Detail({label, value}: {label: string; value: string}) { return <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-subtext">{label}</dt><dd className="mt-2 text-base">{value}</dd></div>; }
