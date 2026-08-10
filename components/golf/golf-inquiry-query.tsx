'use client';

import {useMemo} from 'react';

import {GolfInquiryForm} from '@/components/forms/golf-inquiry-form';
import {SafeImage} from '@/components/safe-image';
import {resolveGolfInquiryQuery} from '@/lib/inquiry-query-core.mjs';
import type {LocaleMessages} from '@/lib/locale-messages';
import {useLocationSearch} from '@/lib/use-location-search';

type GolfCopy = LocaleMessages['golf'];
type InquiryCopy = LocaleMessages['golfInquiry'];
type FormCopy = LocaleMessages['forms']['golfInquiry'];

export function GolfInquirySummary({golf, text}: {golf: GolfCopy; text: InquiryCopy}) {
  const selection = useGolfInquirySelection(golf);

  if (!selection) {
    return null;
  }

  return (
    <>
      <SafeImage
        filename={selection.shaft.image}
        alt={`${selection.head.label} ${selection.shaft.label}`}
        aspect="aspect-[4/3]"
        variant="plain"
        priority
      />
      <div className="space-y-4 bg-white p-4 md:p-5">
        <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">
          {text.summary}
        </p>
        <SpecRow label={text.head} value={selection.head.label} />
        <SpecRow label={text.shaft} value={selection.shaft.label} />
        <SpecRow label={text.style} value={selection.style} />
        <SpecRow label={text.engraving} value={selection.engraving} />
      </div>
    </>
  );
}

export function GolfInquiryFormFromQuery({golf, copy}: {golf: GolfCopy; copy: FormCopy}) {
  const selection = useGolfInquirySelection(golf);

  return (
    <GolfInquiryForm
      copy={copy}
      configuration={selection ? {
        head: selection.head.label,
        shaft: selection.shaft.label,
        style: selection.style,
        engraving: selection.engraving
      } : undefined}
    />
  );
}

function useGolfInquirySelection(golf: GolfCopy) {
  const locationSearch = useLocationSearch();
  const options = useMemo(() => ({
    headIds: golf.heads.items.map((item) => item.id),
    shaftIds: golf.shafts.items.map((item) => item.id),
    styles: golf.labels.styleOptions?.length ? golf.labels.styleOptions : ['BASIC', 'COLOUR'],
    defaultEngraving: 'JUDY KIM 2026.05.03'
  }), [golf]);
  const query = useMemo(
    () => resolveGolfInquiryQuery(locationSearch, options),
    [locationSearch, options]
  );

  const head = golf.heads.items.find((item) => item.id === query.headId) ?? golf.heads.items[0];
  const shaft = golf.shafts.items.find((item) => item.id === query.shaftId) ?? golf.shafts.items[0];

  return head && shaft
    ? {head, shaft, style: query.style, engraving: query.engraving}
    : null;
}

function SpecRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex flex-col gap-1 border-t border-hairline pt-4 font-body text-[16px] leading-6 md:flex-row md:items-center md:justify-between md:gap-5 md:text-sm">
      <span className="font-semibold uppercase tracking-[0.08em] text-subtext md:tracking-[0.14em]">{label}</span>
      <span className="break-words font-semibold text-primary md:text-right">{value}</span>
    </div>
  );
}
