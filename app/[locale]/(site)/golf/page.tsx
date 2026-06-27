import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {
  GolfConfigurator,
  type GolfConfiguratorContent
} from '@/components/golf/golf-configurator';
import type {Locale} from '@/i18n/routing';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'golf');
}

export default async function GolfPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = (await getLocaleMessages(locale)).golf as GolfConfiguratorContent;
  const filenames = collectGolfImages(content);
  const assets = Object.fromEntries(
    filenames.map((filename) => [filename, imageExists(filename)])
  );

  return <GolfConfigurator assets={assets} content={content} locale={locale} />;
}

function collectGolfImages(content: GolfConfiguratorContent) {
  return Array.from(
    new Set([
      content.hero.image,
      ...(content.hero.gallery ?? []).map((item) => item.image),
      content.statement.image,
      content.engraving.imagePrimary,
      content.engraving.imageDetail,
      content.lifestyle.imageBox,
      content.lifestyle.imageLifestyle,
      ...content.heads.items.map((item) => item.image),
      ...content.shafts.items.map((item) => item.image)
    ])
  );
}
