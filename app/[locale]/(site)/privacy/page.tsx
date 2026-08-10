import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {LegalDocument} from '@/components/site/legal-document';
import type {Locale} from '@/i18n/routing';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getDetailMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const content = (await getPublicLocaleMessages(locale, ['privacy'])).legalPages.privacy;
  return getDetailMetadata(locale, '/privacy', content.title, content.notice || content.intro);
}

export default async function PrivacyPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <LegalDocument content={(await getPublicLocaleMessages(locale, ['privacy'])).legalPages.privacy} />;
}
