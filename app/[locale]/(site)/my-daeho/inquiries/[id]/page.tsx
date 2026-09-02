import {notFound} from 'next/navigation';

import {InquiryDetail} from '@/components/customer/inquiry-detail';
import {getAccountMessages} from '@/lib/customer/messages';
import {isLocale} from '@/lib/locales';

export default async function InquiryPage({params}: {params: Promise<{locale: string; id: string}>}) {
  const {locale, id} = await params;
  if (!isLocale(locale)) notFound();
  const account = await getAccountMessages(locale);
  return <main className="min-h-screen bg-bg px-container pb-28 pt-36 text-primary md:pt-44"><div className="mx-auto max-w-4xl"><InquiryDetail locale={locale} id={id} copy={account.inquiryDetail} statusLabels={account.dashboard.statuses} /></div></main>;
}
