import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {LegalDocument} from '@/components/site/legal-document';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return {title: (await getLocaleMessages(locale)).legalPages.privacy.title};
}

export default async function PrivacyPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  return <LegalDocument content={(await getLocaleMessages(locale)).legalPages.privacy} />;
}
