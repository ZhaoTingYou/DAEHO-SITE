import type {CSSProperties} from 'react';
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
import {getHomeNewsCardsForSite} from '@/lib/cms/public-content';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {imageSrc} from '@/lib/image-src';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';
import {resolveVideoSource} from '@/lib/video-src';
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
  const latestNews: HomeNewsPopupCard[] = await getHomeNewsCardsForSite(locale);

  return <HomeContent content={content} homeUi={homeUi} latestNews={latestNews} locale={locale} />;
}

type HomeContentProps = {
  content: typeof koMessages.home;
  homeUi: typeof koMessages.homeUi;
  latestNews: HomeNewsPopupCard[];
  locale: Locale;
};

type HomeBrandRowStyle = CSSProperties & {
  '--home-brand-marquee-duration': string;
};

const homeBrandSecondsPerLogo = 7;

function HomeContent({content, homeUi, latestNews, locale}: HomeContentProps) {
  const {currentPulse, latestNews: latestNewsText, partners} = homeUi;
  const partnerRows = getPartnerRows(partners);
  const primaryPulseImage = currentPulse.primaryImage || 'news_featured.png.png';
  const secondaryPulseImage =
    currentPulse.secondaryImage && currentPulse.secondaryImage !== 'home_ring_01.png'
      ? currentPulse.secondaryImage
      : content.rings[0]?.image || currentPulse.secondaryImage || 'home_ring_01.png';
  const heroMediaMode = content.mediaMode === 'image' ? 'image' : 'video';

  return (
    <main className="mobile-page-shell min-h-screen bg-bg">
      <HomeHero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
        poster={content.image || 'home hero.png'}
        videoSrc={heroMediaMode === 'video' ? content.videoSrc || 'home.mp4' : undefined}
        videoPoster={content.videoPoster || content.image || 'home hero.png'}
        webmSrc={heroMediaMode === 'video' ? content.webmSrc || undefined : undefined}
        locale={locale}
      />

      <section className="bg-bg py-[var(--mobile-section-space)] md:py-[clamp(110px,10vw,164px)]">
        <div className="mx-auto max-w-[1240px] space-y-[var(--mobile-section-space)] px-[var(--mobile-page-gutter)] md:space-y-[clamp(30px,3.2vw,46px)] md:px-container">
          <Reveal className="border-y border-primary/15 py-[clamp(30px,3.2vw,46px)]">
            <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[minmax(260px,320px)_minmax(0,820px)] lg:items-center lg:gap-[clamp(44px,4vw,68px)]">
              <div className="order-2 flex min-h-[190px] w-full items-center justify-center lg:order-1 lg:min-h-[clamp(190px,20vw,270px)] lg:text-center">
                <div className="w-full max-w-[300px] space-y-[10px]">
                  <h2 className="whitespace-pre-line font-heading text-[20px] font-medium uppercase leading-[1.18] tracking-[0.08em] text-primary">
                    {currentPulse.primaryTitle}
                  </h2>
                  <Link
                    href={resolveCmsHref(locale, currentPulse.primaryCtaHref, '/heritage/loyalty')}
                    className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[16px] leading-none tracking-[0.12em] transition duration-hover ease-brand md:text-[15px]"
                  >
                    {currentPulse.primaryCta}
                  </Link>
                </div>
              </div>

              <Link href={resolveCmsHref(locale, currentPulse.primaryImageHref, '/heritage/loyalty')} className="group order-1 block lg:order-2">
                <div className="relative overflow-hidden bg-bg">
                  <div className="hover-zoom">
                    <div className="hover-zoom-media">
                      <SafeImage
                        filename={primaryPulseImage}
                        alt={currentPulse.primaryTitle}
                        aspect="aspect-[4/3] lg:aspect-[2.05/1]"
                        variant="plain"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Reveal>

          <Reveal className="border-b border-primary/15 pb-[clamp(30px,3.2vw,46px)]">
            <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,820px)_minmax(260px,320px)] lg:items-center lg:gap-[clamp(44px,4vw,68px)]">
              <Link href={resolveCmsHref(locale, currentPulse.secondaryImageHref, '/mastery/creations')} className="group block">
                <div className="hover-zoom">
                  <div className="hover-zoom-media">
                    <SafeImage
                      filename={secondaryPulseImage}
                      alt={currentPulse.secondaryTitle}
                        aspect="aspect-[4/3] lg:aspect-[2.05/1]"
                      variant="plain"
                    />
                  </div>
                </div>
              </Link>

              <div className="flex min-h-[190px] w-full items-center justify-center lg:min-h-[clamp(190px,20vw,270px)] lg:text-center">
                <div className="w-full max-w-[300px] space-y-[10px] lg:-translate-x-[24px]">
                  <p className="whitespace-pre-line font-heading text-[20px] font-medium uppercase leading-[1.18] tracking-[0.08em] text-primary">
                    {currentPulse.secondaryTitle}
                  </p>
                  <Link
                    href={resolveCmsHref(locale, currentPulse.secondaryCtaHref, '/news')}
                    className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[16px] leading-none tracking-[0.12em] transition duration-hover ease-brand md:text-[15px]"
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
              <h2 className="font-body text-[16px] font-normal leading-[1.75] text-primary md:text-[15px] md:whitespace-nowrap">
                {content.signature.title}
              </h2>
            </div>
            <p className="max-w-[360px] whitespace-pre-line font-body text-[16px] leading-[1.75] text-text md:text-[15px]">
              {content.signature.body}
            </p>
          </Reveal>

          <Reveal className="grid items-stretch gap-[clamp(18px,1.6vw,26px)] sm:grid-cols-3">
            {content.signature.projects.map((item) => (
              <RevealItem key={item.image} className="h-full">
                <Link
                  href={resolveCmsHref(locale, item.href, '/mastery/creations')}
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

      <section className="home-video-section bg-bg px-container py-[clamp(74px,8vw,126px)]">
        <Reveal className="mx-auto max-w-[1320px]">
          <div className="overflow-hidden bg-primary shadow-[0_26px_90px_rgba(16,29,48,0.10)]">
            <video
              className="block aspect-video w-full object-cover"
              src={homeVideoSrc(content.videoSection?.src, 'home2.mp4')}
              poster={imageSrc(content.videoSection?.poster || 'home2_video_poster.jpg')}
              controls
              loop
              playsInline
              preload="metadata"
              aria-label={
                content.videoSection?.ariaLabel || (locale === 'ko' ? '대호 제작 영상' : 'DAEHO production video')
              }
            />
          </div>
        </Reveal>
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
          {partnerRows.map((row, rowIndex) => {
            const rowWithLogos = row.filter((brand) => brand.logo);
            const rowStyle: HomeBrandRowStyle = {
              '--home-brand-marquee-duration': `${Math.max(rowWithLogos.length, 1) * homeBrandSecondsPerLogo}s`
            };

            return (
              <div className="home-brand-row" key={rowIndex} style={rowStyle}>
                {[...rowWithLogos, ...rowWithLogos].map((brand, brandIndex) => (
                  <span
                    aria-label={brand.label}
                    className="home-brand-item"
                    key={`${brand.label}-${brand.logo}-${brandIndex}`}
                  >
                    {brand.logo ? (
                      <Image
                        src={imageSrc(brand.logo)}
                        alt={brand.label}
                        width={96}
                        height={96}
                        className="home-brand-logo"
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            );
          })}
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

function homeVideoSrc(value: string | undefined, fallback: string) {
  return resolveVideoSource(value) || resolveVideoSource(fallback);
}
