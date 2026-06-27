import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';

import {HomeHero} from '@/components/home/home-hero';
import {HomeNewsPopups, type HomeNewsPopupCard} from '@/components/home/home-news-popups';
import {HomeStatBand} from '@/components/home/home-stat-band';
import {Reveal, RevealItem} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {getHomeNewsCardsFromPage} from '@/lib/cms/public-content';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {withLocale} from '@/lib/site-map';
import koMessages from '@/messages/ko.json';

type Props = {
  params: Promise<{locale: Locale}>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'home');
}

export default async function HomePage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const messages = await getLocaleMessages(locale);
  const content = messages.home;
  const homeUi = messages.homeUi;
  const latestNews: HomeNewsPopupCard[] = getHomeNewsCardsFromPage(homeUi.latestNews.cards);

  return <HomeContent content={content} homeUi={homeUi} latestNews={latestNews} locale={locale} />;
}

type HomeContentProps = {
  content: typeof koMessages.home;
  homeUi: typeof koMessages.homeUi;
  latestNews: HomeNewsPopupCard[];
  locale: Locale;
};

function HomeContent({content, homeUi, latestNews, locale}: HomeContentProps) {
  const {currentPulse, latestNews: latestNewsText, partners} = homeUi;
  const partnerRows = getPartnerRows(partners);
  const primaryPulseImage = currentPulse.primaryImage || 'news_featured.png.png';
  const secondaryPulseImage =
    currentPulse.secondaryImage && currentPulse.secondaryImage !== 'home_ring_01.png'
      ? currentPulse.secondaryImage
      : content.rings[0]?.image || currentPulse.secondaryImage || 'home_ring_01.png';

  return (
    <main className="min-h-screen bg-bg">
      <HomeHero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
        poster="home hero.png"
        locale={locale}
      />

      <section className="bg-bg py-[clamp(110px,10vw,164px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(30px,3.2vw,46px)] px-container">
          <Reveal className="border-y border-primary/15 py-[clamp(30px,3.2vw,46px)]">
            <div className="mx-auto grid w-full max-w-[1180px] lg:grid-cols-[minmax(260px,320px)_minmax(0,820px)] lg:items-center lg:gap-[clamp(44px,4vw,68px)]">
              <div className="flex min-h-[clamp(190px,20vw,270px)] w-full items-center justify-center lg:text-center">
                <div className="w-full max-w-[300px] space-y-[10px]">
                  <h2 className="whitespace-pre-line font-heading text-[20px] font-medium uppercase leading-[1.18] tracking-[0.08em] text-primary">
                    {currentPulse.primaryTitle}
                  </h2>
                  <Link
                    href={withLocale(locale, '/heritage/loyalty')}
                    className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[15px] leading-none tracking-[0.12em] transition duration-hover ease-brand"
                  >
                    {currentPulse.primaryCta}
                  </Link>
                </div>
              </div>

              <Link href={withLocale(locale, '/heritage/loyalty')} className="group block">
                <div className="relative overflow-hidden bg-bg">
                  <div className="hover-zoom">
                    <div className="hover-zoom-media">
                      <SafeImage
                        filename={primaryPulseImage}
                        alt={currentPulse.primaryTitle}
                        aspect="aspect-[2.05/1]"
                        variant="plain"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Reveal>

          <Reveal className="border-b border-primary/15 pb-[clamp(30px,3.2vw,46px)]">
            <div className="mx-auto grid w-full max-w-[1180px] lg:grid-cols-[minmax(0,820px)_minmax(260px,320px)] lg:items-center lg:gap-[clamp(44px,4vw,68px)]">
              <Link href={withLocale(locale, '/mastery/creations')} className="group block">
                <div className="hover-zoom">
                  <div className="hover-zoom-media">
                    <SafeImage
                      filename={secondaryPulseImage}
                      alt={currentPulse.secondaryTitle}
                      aspect="aspect-[2.05/1]"
                      variant="plain"
                    />
                  </div>
                </div>
              </Link>

              <div className="flex min-h-[clamp(190px,20vw,270px)] w-full items-center justify-center lg:text-center">
                <div className="w-full max-w-[300px] space-y-[10px] lg:-translate-x-[24px]">
                  <p className="whitespace-pre-line font-heading text-[20px] font-medium uppercase leading-[1.18] tracking-[0.08em] text-primary">
                    {currentPulse.secondaryTitle}
                  </p>
                  <Link
                    href={withLocale(locale, '/news')}
                    className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[15px] leading-none tracking-[0.12em] transition duration-hover ease-brand"
                  >
                    {currentPulse.secondaryCta}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-bg pb-[clamp(108px,10vw,168px)] pt-0">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(42px,4.5vw,72px)] px-container lg:grid-cols-[minmax(280px,0.32fr)_minmax(0,0.68fr)]">
          <Reveal className="mx-auto max-w-[390px] space-y-[10px] lg:mx-0">
            <div className="space-y-[14px]">
              <p className="[font-family:'MaruBuri',serif] text-[20px] font-semibold uppercase leading-tight text-accent">
                {content.signature.eyebrow}
              </p>
              <h2 className="whitespace-nowrap font-body text-[15px] font-normal leading-[1.75] text-primary">
                {content.signature.title}
              </h2>
            </div>
            <p className="max-w-[360px] whitespace-pre-line font-body text-[15px] leading-[1.75] text-text">
              {content.signature.body}
            </p>
          </Reveal>

          <Reveal className="grid items-stretch gap-[clamp(18px,1.6vw,26px)] sm:grid-cols-3">
            {content.signature.projects.map((item) => (
              <RevealItem key={item.image} className="h-full">
                <Link
                  href={withLocale(locale, '/mastery/creations')}
                  className="group mx-auto grid h-full w-full max-w-[300px] grid-rows-[auto_1fr] border border-transparent bg-white p-[clamp(12px,0.95vw,16px)] transition duration-hover ease-brand hover:-translate-y-1 hover:border-primary/25 focus-visible:border-primary/35"
                >
                  <div className="hover-zoom">
                    <div className="hover-zoom-media">
                      <SafeImage
                        filename={item.image}
                        alt={item.caption}
                        aspect="aspect-square"
                        variant="plain"
                      />
                    </div>
                  </div>
                  <div className="flex min-h-[clamp(98px,7vw,128px)] flex-col items-center justify-center px-1 py-[clamp(16px,1.4vw,22px)] text-center">
                    <h3 className="font-heading text-[clamp(20px,1.35vw,25px)] font-semibold leading-tight text-primary/80">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#62302F] py-[clamp(86px,8vw,128px)] text-[#F4E6E1]">
        <HomeStatBand items={content.statBand} locale={locale} />
      </section>

      <section className="bg-bg pb-[clamp(104px,10vw,156px)] pt-[clamp(72px,7vw,110px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(32px,4vw,52px)] px-container">
          <Reveal className="border-t border-primary/20 pt-[clamp(26px,3vw,42px)]">
            <div className="max-w-[460px] space-y-[14px]">
              <h2 className="font-heading text-[20px] font-medium leading-[1.18] text-primary">
                {latestNewsText.title}
              </h2>
            </div>
          </Reveal>
          <Reveal>
            <HomeNewsPopups cards={latestNews} text={latestNewsText} />
          </Reveal>
        </div>
      </section>

      <section className="overflow-hidden bg-bg pb-section pt-[clamp(42px,6vw,90px)]">
        <div className="home-brand-marquee" aria-label={partners.ariaLabel}>
          {partnerRows.map((row, rowIndex) => (
            <div className="home-brand-row" key={rowIndex}>
              {[...row, ...row].filter((brand) => brand.logo).map((brand, brandIndex) => (
                <span
                  aria-label={brand.label}
                  className="home-brand-item"
                  key={`${brand.label}-${brand.logo}-${brandIndex}`}
                >
                  {brand.logo ? (
                    <Image
                      src={`/images/${brand.logo}`}
                      alt={brand.label}
                      width={96}
                      height={96}
                      className="home-brand-logo"
                    />
                  ) : null}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

type HomePartnerContent = typeof koMessages.homeUi.partners;
type HomePartnerItem = {
  label: string;
  logo?: string;
  row?: number;
};

function getPartnerRows(partners: HomePartnerContent): HomePartnerItem[][] {
  if ('items' in partners && Array.isArray(partners.items) && partners.items.length > 0) {
    const rows = [[], [], []] as HomePartnerItem[][];

    partners.items.forEach((item, index) => {
      const rowIndex = Math.min(Math.max(Number(item.row ?? index % 3), 0), rows.length - 1);
      rows[rowIndex].push({
        label: item.label,
        logo: item.logo,
        row: rowIndex
      });
    });

    return rows.filter((row) => row.length > 0);
  }

  return partners.rows.map((row) => row.map((label) => ({label})));
}
