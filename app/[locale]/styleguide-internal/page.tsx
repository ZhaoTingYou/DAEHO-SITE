import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {ColorSwatchRow} from '@/components/color-swatch-row';
import {Hero} from '@/components/hero';
import {MediaText} from '@/components/media-text';
import {PageEntrance, PageEntranceItem} from '@/components/motion/page-entrance';
import {Reveal, RevealItem} from '@/components/motion/reveal';
import {StatRow} from '@/components/motion/stat-row';
import {PlaceholderImg} from '@/components/placeholder-img';
import {ProductGrid, type ProductGridItem} from '@/components/product-grid';
import {SectionIntro} from '@/components/section-intro';
import {TimelineEntry} from '@/components/timeline-entry';

type Props = {
  params: Promise<{locale: string}>;
};

export const metadata: Metadata = {
  title: 'DAEHO Styleguide',
  robots: {
    index: false,
    follow: false
  }
};

const productItems: ProductGridItem[] = [
  {
    title: 'Signature 01',
    caption: '밝은 제품 카드와 hover zoom 기준',
    image: 'home_ring_01.png',
    href: '/ko/mastery/creations'
  },
  {
    title: 'Signature 02',
    caption: '이미지 내부만 scale 1.04',
    image: 'home_ring_02.png',
    href: '/ko/mastery/creations'
  },
  {
    title: 'Signature 03',
    caption: '외부 카드 레이아웃은 고정',
    image: 'home_ring_03.png',
    href: '/ko/mastery/creations'
  },
  {
    title: 'Signature 04',
    caption: '문자 링크는 wine underline sweep',
    image: 'home_ring_04.png',
    href: '/ko/mastery/creations'
  }
];

const stats = [
  {value: 1988, label: 'ESTABLISHED'},
  {value: 38, label: 'YEARS OF CRAFT'},
  {value: 200000, suffix: '+', label: 'RINGS MADE'}
];

export default async function StyleguidePage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <main className="bg-bg text-text">
      <PageEntrance>
        <section className="mx-auto max-w-[1440px] px-container py-section">
          <PageEntranceItem className="max-w-4xl space-y-6">
            <p className="font-body text-eyebrow font-medium uppercase tracking-[0.22em] text-subtext">
              DAEHO STYLEGUIDE
            </p>
            <h1 className="font-heading text-hero font-bold leading-none tracking-normal text-primary">
              Bright Quiet Luxury
            </h1>
            <p className="font-body text-body text-text">
              Phase 1 sandbox for tokens, type, base components, and global motion language.
            </p>
          </PageEntranceItem>
        </section>
      </PageEntrance>

      <section className="bg-white py-section">
        <div className="mx-auto max-w-[1440px] space-y-12 px-container">
          <SectionIntro eyebrow="01 Tokens" title="Five-color foundation">
            <p>Only the documented DAEHO palette is represented here.</p>
          </SectionIntro>
          <ColorSwatchRow />
        </div>
      </section>

      <section className="py-section">
        <div className="mx-auto max-w-[1440px] space-y-12 px-container">
          <SectionIntro eyebrow="02 Type" title="Locale-driven hierarchy">
            <p>English uses Cormorant Garamond / Inter. Korean uses MaruBuri / Pretendard.</p>
          </SectionIntro>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="border border-hairline bg-white p-8">
              <p className="font-body text-eyebrow font-medium uppercase tracking-[0.22em] text-subtext">
                HERO
              </p>
              <p className="mt-4 font-heading text-hero font-bold leading-none text-primary">
                38 YEARS
              </p>
            </div>
            <div className="border border-hairline bg-white p-8">
              <p className="font-body text-eyebrow font-medium uppercase tracking-[0.22em] text-subtext">
                BODY
              </p>
              <p className="mt-4 font-body text-body text-text">
                승리의 순간을, 영원의 형태로. The moment of victory, shaped for eternity.
              </p>
            </div>
          </div>
          <StatRow items={stats} locale={locale} />
        </div>
      </section>

      <section className="bg-white py-section">
        <div className="mx-auto max-w-[1440px] space-y-12 px-container">
          <SectionIntro eyebrow="03 Components" title="Reusable page blocks" />
          <div className="grid gap-8 border border-hairline bg-bg p-8 lg:grid-cols-3">
            <SectionIntro
              eyebrow="Variant · Archive"
              title="THE ARCHIVE"
              variant="chronicle"
            >
              <p>Axis-attached intro treatment for the archive timeline pages.</p>
            </SectionIntro>
            <SectionIntro eyebrow="Variant · Heritage" title="THE MEANING" variant="legacy">
              <p>A centered, slow, monument-like intro with much larger title rhythm.</p>
            </SectionIntro>
            <SectionIntro eyebrow="Variant · News" title="NEWS" variant="news">
              <p>Masthead-style rule line for dense editorial pages.</p>
            </SectionIntro>
          </div>
          <Hero
            eyebrow="Hero"
            title="THE FIRST LIGHT"
            subtitle="A high-key hero composition with safe image fallback."
            image="home_hero.png"
            imageAlt="DAEHO championship ring in bright light"
          />
          <MediaText
            eyebrow="Media Text"
            title="Light defines the object"
            body="The component keeps a quiet editorial rhythm: media, title, body and one understated link treatment."
            image="missing_media_text.png"
            imageAlt="Missing image placeholder"
          />
          <ProductGrid items={productItems} />
          <TimelineEntry
            year="19XX"
            title="Engraved milestone"
            body="A lightweight entry shape for ARCHIVE before the full scroll-drawn timeline arrives."
            image="chronicle_milestone_01.png"
            first
          />
          <PlaceholderImg filename="placeholder_contract.png" />
        </div>
      </section>

      <section className="py-section">
        <div className="mx-auto max-w-[1440px] space-y-12 px-container">
          <SectionIntro eyebrow="04 Motion" title="Global action language">
            <p>Hover zoom, scroll reveal, light layer transition, and page entrance choreography.</p>
          </SectionIntro>

          <Reveal className="grid gap-5 md:grid-cols-3">
            {['Scroll reveal', 'Staggered child', 'Transform + opacity'].map((label) => (
              <RevealItem key={label} className="border border-hairline bg-white p-8">
                <p className="font-heading text-3xl font-semibold text-primary">{label}</p>
                <p className="mt-3 font-body text-sm leading-6 text-subtext">
                  Enters once at 20% viewport with the DAEHO reveal timing.
                </p>
              </RevealItem>
            ))}
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {['Ivory to white', 'Soft shadow', 'No dark field'].map((label) => (
              <div key={label} className="light-layer p-8">
                <p className="font-heading text-3xl font-semibold text-primary">{label}</p>
                <p className="mt-3 font-body text-sm leading-6 text-subtext">
                  Light-layer hover uses only transform, shadow and bright surfaces.
                </p>
              </div>
            ))}
          </div>

          <p className="font-body text-sm text-subtext">
            Hover any product card above to verify image zoom and wine underline behavior.
          </p>
        </div>
      </section>
    </main>
  );
}
