import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {AchievementRecordsPage} from '@/components/legacy/achievement-records-page';
import type {Locale} from '@/i18n/routing';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'achievement');
}

export default async function AchievementPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = (await getPublicLocaleMessages(locale, ['heritage-achievement'])).legacyPages.achievement;

  return <AchievementRecordsPage locale={locale} content={content} />;
}
