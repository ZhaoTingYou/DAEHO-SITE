import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {ChronicleHorizontal} from '@/components/chronicle/chronicle-horizontal';
import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'chronicle');
}

export default async function ChroniclePage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const content = messages.chronicle;
  const slides = content.timeline.items.map((item) => ({
    year: item.year,
    label: item.kicker,
    title: item.title,
    desc: item.body,
    image: imageSrc(item.image)
  }));
  const endNav = {
    ...messages.chronicleUi.endNav,
    href: withLocale(locale, messages.chronicleUi.endNav.href)
  };

  return (
    <ChronicleHorizontal
      ariaLabel={messages.chronicleUi.horizontalAriaLabel}
      yearNavAriaLabel={messages.chronicleUi.yearNavAriaLabel}
      endNav={endNav}
      introLabel="DAEHO"
      slides={slides}
    />
  );
}
