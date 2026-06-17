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
      />

      <section className="bg-bg py-[clamp(96px,10vw,156px)]">
        <div className="mx-auto max-w-[1180px] space-y-20 px-container">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(220px,0.28fr)_minmax(0,0.72fr)] lg:items-center xl:gap-[72px]">
            <div className="max-w-[260px] space-y-7 lg:text-center">
              <h2 className="font-heading text-[clamp(20px,1.7vw,30px)] font-medium uppercase leading-tight text-primary">
                {currentPulse.primaryTitle}
              </h2>
              <Link
                href={withLocale(locale, '/heritage/loyalty')}
                className="home-feature-link inline-flex font-body text-[16px] leading-none transition duration-hover ease-brand"
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

            <div className="space-y-7 lg:max-w-[260px] lg:justify-self-end lg:text-center">
              <p className="font-heading text-[clamp(20px,1.7vw,30px)] font-medium uppercase leading-tight text-primary">
                {currentPulse.secondaryTitle}
              </p>
              <Link
                href={withLocale(locale, '/news')}
                className="home-feature-link inline-flex font-body text-[16px] leading-none transition duration-hover ease-brand"
              >
                {currentPulse.secondaryCta}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-bg pb-[clamp(54px,5.5vw,88px)] pt-[clamp(36px,5vw,72px)]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-container lg:grid-cols-[minmax(320px,0.30fr)_minmax(0,0.70fr)] lg:items-center xl:grid-cols-[minmax(390px,0.30fr)_minmax(0,0.70fr)] xl:gap-20">
          <Reveal className="max-w-[390px] space-y-7">
            <div className="space-y-5">
              <p className="font-heading text-[12px] font-medium uppercase leading-tight text-accent">
                {content.signature.eyebrow}
              </p>
              <h2 className="font-heading text-[clamp(20px,1.8vw,26px)] font-semibold leading-tight text-primary">
                {content.signature.title}
              </h2>
            </div>
            <p className="max-w-sm whitespace-pre-line font-body text-[13px] leading-6 text-text">
              {content.signature.body}
            </p>
          </Reveal>

          <Reveal className="grid items-stretch gap-6 sm:grid-cols-3">
            {content.signature.projects.map((item) => (
              <RevealItem key={item.image} className="h-full">
                <Link
                  href={withLocale(locale, '/mastery/creations')}
                  className="group grid h-full grid-rows-[auto_1fr] bg-white p-2.5 shadow-[0_18px_70px_rgba(16,29,48,0.055)] transition duration-hover ease-brand hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(16,29,48,0.10)]"
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
                  <div className="grid min-h-[98px] grid-rows-[auto_1fr] gap-2 px-1 pb-4 pt-4 text-center">
                    <h3 className="font-heading text-[clamp(16px,1.15vw,20px)] font-semibold leading-tight text-primary">
                      {item.title}
                    </h3>
                    <p className="self-start whitespace-pre-line font-heading text-[11px] font-medium uppercase leading-[1.1] text-primary">
                      {item.caption}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-[#62302F] py-[clamp(92px,10vw,150px)] text-[#F4E6E1]">
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
