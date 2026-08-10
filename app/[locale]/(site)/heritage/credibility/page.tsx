import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {CredibilityCompliancePage} from '@/components/legacy/credibility-compliance-page';
import type {Locale} from '@/i18n/routing';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'credibility');
}

export default async function CredibilityPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = (await getPublicLocaleMessages(locale, ['heritage-credibility'])).legacyPages.credibility;

  return <CredibilityCompliancePage locale={locale} content={content} />;
}
