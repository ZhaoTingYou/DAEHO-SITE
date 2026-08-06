import type {Metadata} from 'next';

import type {Locale} from '@/i18n/routing';
import {getPage} from '@/lib/cms/repositories';
import {isEnglishEnabledForSite} from '@/lib/english-visibility';
import {imageSrc} from '@/lib/image-src';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';

type PageKey =
  | 'home'
  | 'chronicle'
  | 'loyalty'
  | 'credibility'
  | 'achievement'
  | 'technique'
  | 'techniqueRecords'
  | 'collection'
  | 'news'
  | 'golf'
  | 'contact'
  | 'golfInquiry';

type PageSeo = {
  path: string;
  title: string;
  description: string;
};

type SeoOverride = {
  title: string;
  description: string;
  image: string;
};

const cmsPageKeyByPageKey: Record<PageKey, string> = {
  home: 'home',
  chronicle: 'archive',
  loyalty: 'heritage-loyalty',
  credibility: 'heritage-credibility',
  achievement: 'heritage-achievement',
  technique: 'mastery-making',
  techniqueRecords: 'mastery-technique',
  collection: 'mastery-creations',
  news: 'news',
  golf: 'golf',
  contact: 'contact',
  golfInquiry: 'golf-inquiry'
};

export const metadataBase = getMetadataBase();

const pathByPageKey: Record<PageKey, string> = {
  home: '/',
  chronicle: '/archive',
  loyalty: '/heritage/loyalty',
  credibility: '/heritage/credibility',
  achievement: '/heritage/achievement',
  technique: '/mastery/making',
  techniqueRecords: '/mastery/technique',
  collection: '/mastery/creations',
  news: '/news',
  golf: '/golf',
  contact: '/contact',
  golfInquiry: '/golf/inquiry'
};

const defaultSeoByLocale: Record<Locale, Record<PageKey, Omit<PageSeo, 'path'>>> = {
  ko: {
    home: {
      title: '대호 우승반지·챔피언십 반지·맞춤 트로피 제작',
      description:
        '대호는 1988년부터 우승반지, 챔피언십 반지, 맞춤 트로피, 스포츠 행사 기념품을 프로스포츠 구단과 학교, 단체에 맞춤 제작합니다.'
    },
    chronicle: {
      title: '대호 1988년 우승반지 제작 아카이브',
      description:
        '1988년부터 이어진 대호의 우승반지, 임관반지, 단체 기념반지 제작 기록과 한국 시장에서 쌓은 납품 경험을 정리합니다.'
    },
    loyalty: {
      title: '대호 제작 신의와 장기 고객 관계',
      description:
        '대호는 반복 의뢰와 장기 고객 관계를 바탕으로 우승반지, 임관반지, 단체 기념 제품 제작의 신의를 쌓아왔습니다.'
    },
    credibility: {
      title: '대호 맞춤 반지 제작 신뢰 기준',
      description:
        '대호는 디자인, 3D 설계, 세공, 각인, 검수, 포장까지 자체 기준으로 관리해 단체 주문과 맞춤 반지 제작의 신뢰를 높입니다.'
    },
    achievement: {
      title: '대호 우승반지 제작 실적과 기록',
      description:
        '프로스포츠 구단과 단체 프로젝트에서 쌓은 대호의 챔피언십 링, 임관반지, 기념반지 제작 실적과 시장 기록을 확인합니다.'
    },
    technique: {
      title: '우승반지·맞춤 트로피 제작 공정',
      description:
        '대호는 우승반지, 챔피언십 반지, 맞춤 트로피 제작을 디자인 상담부터 3D 모델링, 주조, 세공, 각인, 검수까지 자체 공정으로 관리합니다.'
    },
    techniqueRecords: {
      title: '대호 기술 기록과 맞춤 트로피·반지 세공 기준',
      description:
        '대호의 우승반지, 맞춤 트로피, 행사 기념품 제작 기술과 세공 기준, 표면 처리, 구조 설계 자료를 정리하는 기술 기록 페이지입니다.'
    },
    collection: {
      title: '대호 우승반지·임관반지·주문제작 컬렉션',
      description:
        '대호의 우승반지, 임관반지, 주문제작 반지 사례를 카테고리별로 살펴보고 프로스포츠 구단, 학교, 단체 맞춤 제작 방향을 확인하세요.'
    },
    news: {
      title: '대호 뉴스와 우승반지 제작 사례',
      description:
        '대호의 최근 제작 사례, 프로젝트 스토리, 언론/피처, 협업 소식을 통해 우승반지와 맞춤 반지 제작 현장을 전합니다.'
    },
    golf: {
      title: '대호 맞춤 골프 팔찌 제작',
      description:
        '대호는 골프 클럽 형태와 개인 각인을 반영한 맞춤 골프 팔찌를 상담 기반으로 제작해 라운드의 기록과 선물을 오브젝트로 남깁니다.'
    },
    contact: {
      title: '대호 우승반지 제작 문의',
      description:
        '우승반지, 임관반지, 단체 기념반지, 맞춤 주얼리 제작 상담을 위해 프로젝트 목적, 수량, 일정, 참고 자료를 보내주세요.'
    },
    golfInquiry: {
      title: '대호 골프 팔찌 상담 신청',
      description:
        '맞춤 골프 팔찌 제작을 위한 구성, 수량, 희망 일정, 각인 정보를 보내면 대호가 상담과 제작 가능 여부를 확인합니다.'
    }
  },
  en: {
    home: {
      title: 'Korean Championship Ring Maker',
      description:
        'DAEHO is a Korean maker of championship rings, commission rings, commemorative rings, and bespoke symbolic jewelry since 1988.'
    },
    chronicle: {
      title: 'DAEHO Ring Archive Since 1988',
      description:
        'Explore DAEHO records in championship rings, appointment rings, group commemorative rings, and delivery experience since 1988.'
    },
    loyalty: {
      title: 'DAEHO Long-Term Trust in Ring Production',
      description:
        'DAEHO builds long-term client relationships through repeat championship ring, appointment ring, and group commemorative projects.'
    },
    credibility: {
      title: 'DAEHO Custom Ring Production Standards',
      description:
        'DAEHO manages design, 3D planning, craft, engraving, inspection, and packing to support reliable group and custom ring production.'
    },
    achievement: {
      title: 'DAEHO Championship Ring Records',
      description:
        'Review DAEHO achievements in championship rings, appointment rings, commemorative ring projects, and professional sports production.'
    },
    technique: {
      title: 'Championship Ring Production Process',
      description:
        'DAEHO manages championship ring production from consultation, 3D modeling, casting, craft, engraving, and inspection based on experience since 1988.'
    },
    techniqueRecords: {
      title: 'DAEHO Technical Records and Craft Standards',
      description:
        'A technical record page for DAEHO custom ring craft standards, surface treatment, structure planning, and future verification materials.'
    },
    collection: {
      title: 'DAEHO Championship, Appointment, and Bespoke Rings',
      description:
        'Browse DAEHO championship rings, appointment rings, and bespoke ring examples for professional sports teams, schools, and organizations.'
    },
    news: {
      title: 'DAEHO News and Ring Production Stories',
      description:
        'Read DAEHO production stories, project updates, press features, and collaborations around championship rings and custom commemorative work.'
    },
    golf: {
      title: 'DAEHO Custom Golf Bracelet Production',
      description:
        'DAEHO creates custom golf bracelets shaped from golf club forms, personal engraving, and consultation-based production details.'
    },
    contact: {
      title: 'Contact DAEHO for Custom Ring Production',
      description:
        'Send project goals, quantity, schedule, and reference materials for championship rings, appointment rings, group commemorative rings, or bespoke jewelry.'
    },
    golfInquiry: {
      title: 'DAEHO Golf Bracelet Inquiry',
      description:
        'Share configuration, quantity, schedule, and engraving details for a DAEHO custom golf bracelet consultation.'
    }
  }
};

export async function getPageMetadata(locale: Locale, pageKey: PageKey): Promise<Metadata> {
  const page = await getPageSeo(locale, pageKey);
  const override = await getCmsPageSeoOverride(locale, cmsPageKeyByPageKey[pageKey]);

  return getDetailMetadata(
    locale,
    page.path,
    override.title || page.title,
    override.description || page.description,
    override.image || undefined
  );
}

export async function getCmsPageSeoOverride(locale: Locale, cmsPageKey: string): Promise<SeoOverride> {
  if (!cmsPageKey) {
    return emptySeoOverride();
  }

  try {
    const page = await getPage(cmsPageKey);
    const seo = page?.seo?.[locale];

    if (!seo || typeof seo !== 'object') {
      return emptySeoOverride();
    }

    const fields = seo as Record<string, unknown>;
    const image = stringValue(fields.ogImagePath);

    return {
      title: stringValue(fields.title),
      description: stringValue(fields.description),
      image: image ? imageSrc(image) : ''
    };
  } catch (error) {
    if (!isNextDynamicServerError(error)) {
      console.error(`[seo] Falling back to page copy because CMS SEO could not be read for ${cmsPageKey}.`, error);
    }
    return emptySeoOverride();
  }
}

export function isPreviewNoindexEnabled() {
  return process.env.PREVIEW_NOINDEX === 'true';
}

export function previewNoindexRobots(): Metadata['robots'] | undefined {
  if (!isPreviewNoindexEnabled()) {
    return undefined;
  }

  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  };
}

export async function getDetailMetadata(
  locale: Locale,
  path: string,
  pageTitle: string,
  description: string,
  image = '/images/home_hero.png'
): Promise<Metadata> {
  const title = formatMetadataTitle(locale, pageTitle);
  const brandedDescription = formatMetadataDescription(locale, description);
  const englishEnabled = await isEnglishEnabledForSite();

  return {
    title,
    description: brandedDescription,
    robots: previewNoindexRobots(),
    alternates: {
      canonical: withLocale(locale, path),
      languages: englishEnabled
        ? {
            ko: withLocale('ko', path),
            en: withLocale('en', path),
            'x-default': withLocale('ko', path)
          }
        : {
            ko: withLocale('ko', path),
            'x-default': withLocale('ko', path)
          }
    },
    openGraph: {
      title,
      description: brandedDescription,
      url: withLocale(locale, path),
      siteName: locale === 'ko' ? '대호' : 'DAEHO',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      type: 'website',
      images: [
        {
          url: image,
          alt: 'DAEHO'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: brandedDescription,
      images: [image]
    }
  };
}

async function getPageSeo(locale: Locale, pageKey: PageKey): Promise<PageSeo> {
  const seo = defaultSeoByLocale[locale][pageKey];

  return {
    path: pathByPageKey[pageKey],
    title: seo.title,
    description: seo.description
  };
}

function withLocale(locale: Locale, path: string) {
  return `/${locale}${path === '/' ? '' : path}`;
}

function getMetadataBase() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;

  return new URL(normalizedUrl);
}

function emptySeoOverride(): SeoOverride {
  return {
    title: '',
    description: '',
    image: ''
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatMetadataTitle(locale: Locale, pageTitle: string) {
  const fallbackTitle = locale === 'ko' ? '대호' : 'DAEHO';
  const trimmedTitle = pageTitle.trim() || fallbackTitle;
  const titleWithKoreanBrand =
    locale === 'ko' && !trimmedTitle.includes('대호') ? `대호 | ${trimmedTitle}` : trimmedTitle;

  return /\bDAEHO\b/i.test(titleWithKoreanBrand) ? titleWithKoreanBrand : `${titleWithKoreanBrand} | DAEHO`;
}

function formatMetadataDescription(locale: Locale, description: string) {
  const fallbackDescription =
    locale === 'ko'
      ? '대호(DAEHO)는 우승반지, 임관반지, 단체 맞춤 반지를 전문으로 제작합니다.'
      : 'DAEHO (대호) creates championship rings, appointment rings, and custom group rings.';
  let nextDescription = description.trim() || fallbackDescription;

  if (locale === 'ko') {
    const hasKoreanBrand = nextDescription.includes('대호');
    const hasLatinBrand = /\bDAEHO\b/i.test(nextDescription);

    if (!hasKoreanBrand && !hasLatinBrand) {
      nextDescription = `대호(DAEHO)는 ${nextDescription}`;
    } else if (!hasKoreanBrand) {
      nextDescription = `대호 ${nextDescription}`;
    } else if (!hasLatinBrand) {
      nextDescription = nextDescription.replace('대호', '대호(DAEHO)');
    }

    return nextDescription;
  }

  if (!/\bDAEHO\b/i.test(nextDescription)) {
    nextDescription = `DAEHO ${nextDescription}`;
  }

  if (!nextDescription.includes('대호')) {
    nextDescription = appendSentence(nextDescription, 'Korean brand name: 대호.');
  }

  return nextDescription;
}

function appendSentence(value: string, sentence: string) {
  const trimmedValue = value.trim();
  const separator = /[.!?。]$/.test(trimmedValue) ? ' ' : '. ';

  return `${trimmedValue}${separator}${sentence}`;
}
