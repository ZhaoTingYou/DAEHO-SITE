import {existsSync} from 'node:fs';
import path from 'node:path';

import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';

import {HomeHero} from '@/components/home/home-hero';
import {HomeNewsPopups, type HomeNewsPopupCard} from '@/components/home/home-news-popups';
import {HomeStatBand} from '@/components/home/home-stat-band';
import {Reveal, RevealItem} from '@/components/motion/reveal';
import {SafeImage} from '@/components/safe-image';
import type {Locale} from '@/i18n/routing';
import {getHomeNewsCardsForSite} from '@/lib/cms/public-content';
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

  const messages = getLocaleMessages(locale);
  const content = messages.home;
  const homeUi = messages.homeUi;
  const heroVideo = getHomeHeroVideo();
  const latestNews: HomeNewsPopupCard[] = getHomeNewsCardsForSite(locale);

  return <HomeContent content={content} heroVideo={heroVideo} homeUi={homeUi} latestNews={latestNews} locale={locale} />;
}

function getHomeHeroVideo() {
  const videoDir = path.join(process.cwd(), 'public', 'videos');
  const imageDir = path.join(process.cwd(), 'public', 'images');
  const mp4Candidates = ['home_hero.mp4', 'home.mp4'];
  const webmCandidates = ['home_hero.webm', 'home.webm'];
  const posterCandidates = ['home_video_poster.jpg', 'home_video_poster.png'];
  const mp4 = mp4Candidates.find((filename) => existsSync(path.join(videoDir, filename)));
  const webm = webmCandidates.find((filename) => existsSync(path.join(videoDir, filename)));
  const videoPoster = posterCandidates.find((filename) => existsSync(path.join(imageDir, filename)));

  return {
    videoSrc: mp4 ? `/videos/${mp4}` : undefined,
    webmSrc: webm ? `/videos/${webm}` : undefined,
    videoPoster
  };
}

type HomeContentProps = {
  content: typeof koMessages.home;
  homeUi: typeof koMessages.homeUi;
  heroVideo: {
    videoSrc?: string;
    webmSrc?: string;
    videoPoster?: string;
  };
  latestNews: HomeNewsPopupCard[];
  locale: Locale;
};

function HomeContent({content, heroVideo, homeUi, latestNews, locale}: HomeContentProps) {
  const {currentPulse, latestNews: latestNewsText, partners} = homeUi;

  return (
    <main className="min-h-screen bg-bg">
      <HomeHero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
        poster={content.image}
        videoPoster={heroVideo.videoPoster}
        videoSrc={heroVideo.videoSrc}
        webmSrc={heroVideo.webmSrc}
        locale={locale}
      />

      <section className="bg-bg py-[clamp(96px,10vw,156px)]">
        <div className="mx-auto max-w-[1180px] space-y-20 px-container">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(220px,0.28fr)_minmax(0,0.72fr)] lg:items-center xl:gap-[72px]">
            <div className="max-w-[260px] space-y-[10px] lg:text-center">
              <h2 className="font-heading text-[20px] font-medium uppercase leading-tight text-primary">
                {currentPulse.primaryTitle}
              </h2>
              <Link
                href={withLocale(locale, '/heritage/loyalty')}
                className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[15px] leading-none transition duration-hover ease-brand"
              >
                {currentPulse.primaryCta}
              </Link>
            </div>

            <Link href={withLocale(locale, '/heritage/loyalty')} className="group block">
              <div className="relative overflow-hidden bg-bg">
                <div className="hover-zoom">
                  <div className="hover-zoom-media">
                    <SafeImage
                      filename="news_featured.png.png"
                      alt={currentPulse.primaryTitle}
                      aspect="aspect-[16/7]"
                      variant="plain"
                    />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(220px,0.28fr)] lg:items-center xl:gap-[72px]">
            <Link href={withLocale(locale, '/mastery/creations')} className="group block">
              <div className="hover-zoom">
                <div className="hover-zoom-media">
                  <SafeImage
                    filename="home_ring_01.png"
                    alt={currentPulse.secondaryTitle}
                    aspect="aspect-[16/7]"
                    variant="plain"
                  />
                </div>
              </div>
            </Link>

            <div className="space-y-[10px] lg:max-w-[260px] lg:justify-self-end lg:text-center">
              <p className="font-heading text-[20px] font-medium uppercase leading-tight text-primary">
                {currentPulse.secondaryTitle}
              </p>
              <Link
                href={withLocale(locale, '/news')}
                className="home-feature-link inline-flex [font-family:'Pretendard',sans-serif] text-[15px] leading-none transition duration-hover ease-brand"
              >
                {currentPulse.secondaryCta}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="flex min-h-screen items-center bg-bg py-[clamp(72px,7vw,112px)]">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-[clamp(40px,4.2vw,68px)] px-container lg:grid-cols-[minmax(280px,0.28fr)_minmax(0,0.72fr)]">
          <Reveal className="mx-auto max-w-[400px] space-y-5 lg:mx-0">
            <div className="space-y-3">
              <p className="font-heading text-[15px] font-medium uppercase leading-tight text-accent">
                {content.signature.eyebrow}
              </p>
              <h2 className="whitespace-nowrap font-heading text-[20px] font-semibold leading-tight text-primary">
                {content.signature.title}
              </h2>
            </div>
            <p className="max-w-[410px] whitespace-pre-line font-body text-[clamp(15px,0.95vw,15px)] leading-[1.9] text-text">
              {content.signature.body}
            </p>
          </Reveal>

          <Reveal className="grid items-stretch gap-[clamp(18px,1.4vw,24px)] sm:grid-cols-3">
            {content.signature.projects.map((item) => (
              <RevealItem key={item.image} className="h-full">
                <Link
                  href={withLocale(locale, '/mastery/creations')}
                  className="group mx-auto grid h-full w-full max-w-[330px] grid-rows-[auto_1fr] bg-white p-[clamp(14px,1.05vw,18px)] shadow-[0_18px_70px_rgba(16,29,48,0.055)] transition duration-hover ease-brand hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(16,29,48,0.10)]"
                >
                  <div className="hover-zoom">
                    <div className="hover-zoom-media">
                      <SafeImage
                        filename={item.image}
                        alt={item.caption}
                        aspect="aspect-[4/3]"
                        variant="plain"
                      />
                    </div>
                  </div>
                  <div className="flex min-h-[clamp(82px,5vw,98px)] flex-col items-center justify-center gap-1.5 px-1 py-3 text-center">
                    <h3 className="font-heading text-[clamp(19px,1.25vw,24px)] font-semibold leading-tight text-primary">
                      {item.title}
                    </h3>
                    <p className="whitespace-pre-line font-heading text-[clamp(11px,0.72vw,15px)] font-medium uppercase leading-[1.08] text-primary">
                      {item.caption}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#62302F] py-[clamp(64px,7vw,96px)] text-[#F4E6E1]">
        <HomeStatBand items={content.statBand} locale={locale} />
      </section>

      <section className="bg-bg pb-[clamp(92px,10vw,150px)] pt-[clamp(38px,4vw,64px)]">
        <div className="mx-auto max-w-[1320px] space-y-10 px-container">
          <Reveal className="max-w-[390px] space-y-7">
            <div className="space-y-5">
              <p className="font-heading text-[12px] font-medium uppercase leading-tight text-accent">
                {latestNewsText.eyebrow}
              </p>
              <h2 className="font-heading text-[clamp(20px,1.8vw,26px)] font-semibold leading-tight text-primary">
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
          {partners.rows.map((row, rowIndex) => (
            <div className="home-brand-row" key={rowIndex}>
              {[...row, ...row].map((brand, brandIndex) => (
                <span key={`${brand}-${brandIndex}`}>{brand}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
