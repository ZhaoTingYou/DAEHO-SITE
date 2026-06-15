import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {LoyaltyCommitmentPage} from '@/components/legacy/loyalty-commitment-page';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'loyalty');
}

export default async function LoyaltyPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = getLocaleMessages(locale).legacyPages.loyalty;

  return <LoyaltyCommitmentPage locale={locale} content={content} />;
}
