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

      <section className="bg-bg py-[clamp(110px,10vw,164px)]">
        <div className="mx-auto max-w-[1240px] space-y-[clamp(30px,3.2vw,46px)] px-container">
          <Reveal className="grid border-y border-primary/15 py-[clamp(30px,3.2vw,46px)] lg:grid-cols-[minmax(220px,0.28fr)_minmax(0,0.72fr)] lg:items-center lg:gap-[clamp(48px,6vw,82px)]">
            <div className="max-w-[260px] space-y-[10px] lg:text-center">
              <h2 className="font-heading text-[20px] font-medium uppercase leading-[1.18] text-primary">
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
                      aspect="aspect-[2.28/1]"
                      variant="plain"
                    />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal className="grid border-b border-primary/15 pb-[clamp(30px,3.2vw,46px)] lg:grid-cols-[minmax(0,0.72fr)_minmax(220px,0.28fr)] lg:items-center lg:gap-[clamp(48px,6vw,82px)]">
            <Link href={withLocale(locale, '/mastery/creations')} className="group block">
              <div className="hover-zoom">
                <div className="hover-zoom-media">
                  <SafeImage
                    filename="home_ring_01.png"
                    alt={currentPulse.secondaryTitle}
                    aspect="aspect-[2.28/1]"
                    variant="plain"
                  />
                </div>
              </div>
            </Link>

            <div className="space-y-[10px] lg:max-w-[260px] lg:justify-self-start lg:text-center">
              <p className="font-heading text-[20px] font-medium uppercase leading-[1.18] text-primary">
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

      <section className="bg-bg pb-[clamp(108px,10vw,168px)] pt-0">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(42px,4.5vw,72px)] px-container lg:grid-cols-[minmax(280px,0.32fr)_minmax(0,0.68fr)]">
          <Reveal className="mx-auto max-w-[390px] space-y-[18px] lg:mx-0">
            <div className="space-y-[14px]">
              <p className="font-heading text-[15px] font-medium uppercase leading-tight text-accent">
                {content.signature.eyebrow}
              </p>
              <h2 className="whitespace-nowrap font-heading text-[20px] font-semibold leading-tight text-primary">
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
                  className="group mx-auto grid h-full w-full max-w-[300px] grid-rows-[auto_1fr] border border-primary/10 bg-white p-[clamp(12px,0.95vw,16px)] transition duration-hover ease-brand hover:-translate-y-1 hover:border-accent/35"
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
                  <div className="flex min-h-[clamp(98px,7vw,128px)] flex-col items-center justify-center gap-[8px] px-1 py-[clamp(16px,1.4vw,22px)] text-center">
                    <h3 className="font-heading text-[clamp(20px,1.35vw,25px)] font-semibold leading-tight text-primary">
                      {item.title}
                    </h3>
                    <p className="whitespace-pre-line font-heading text-[15px] font-medium uppercase leading-[1.05] text-primary">
                      {item.caption}
                    </p>
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
              <h2 className="font-heading text-[clamp(24px,2.4vw,36px)] font-semibold leading-tight text-primary">
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
