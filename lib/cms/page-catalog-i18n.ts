import type {AdminLocale} from '@/lib/admin-locales';

import type {
  PageArrayItemFieldDefinition,
  PageContentGroupDefinition,
  PageDefinition,
  PageFieldDefinition
} from './page-catalog';

type PageMetadata = {
  title: string;
  description: string;
};

const pageMetadataLabels: Record<Exclude<AdminLocale, 'zh'>, Record<string, PageMetadata>> = {
  ko: {
    home: {
      title: '홈',
      description: '홈페이지 첫 화면, Signature 프로젝트, 숫자 지표와 홈 CTA 콘텐츠를 관리합니다.'
    },
    archive: {
      title: '아카이브',
      description: '브랜드 히스토리 타임라인과 Archive 페이지 핵심 콘텐츠를 관리합니다.'
    },
    'heritage-loyalty': {
      title: 'Heritage / Loyalty',
      description: '신의 페이지의 Hero, 지표와 설명 콘텐츠를 관리합니다.'
    },
    'heritage-credibility': {
      title: 'Heritage / Credibility',
      description: '신뢰 페이지의 Hero, 숫자 증거와 파트너 콘텐츠를 관리합니다.'
    },
    'heritage-achievement': {
      title: 'Heritage / Achievement',
      description: '성과 페이지의 Hero, 지표와 수상 갤러리를 관리합니다.'
    },
    'mastery-making': {
      title: 'Mastery / Making',
      description: '제작 공정 페이지의 Hero, 7단계 프로세스와 디테일 콘텐츠를 관리합니다.'
    },
    'mastery-creations': {
      title: 'Mastery / Creations',
      description: '작품 홈, 필터 분류와 작품 Finder 콘텐츠를 관리합니다.'
    },
    'mastery-creations-champion': {
      title: 'Creations / Champion',
      description: '챔피언 반지 분류 페이지의 카드와 SEO 기본 콘텐츠를 관리합니다.'
    },
    'mastery-creations-appointment': {
      title: 'Creations / Appointment',
      description: '임관 및 기념 작품 분류 페이지의 카드와 SEO 기본 콘텐츠를 관리합니다.'
    },
    'mastery-creations-bespoke': {
      title: 'Creations / Bespoke',
      description: '주문제작 작품 분류 페이지의 카드와 SEO 기본 콘텐츠를 관리합니다.'
    },
    news: {
      title: '뉴스',
      description: 'News 목록 페이지 문구를 관리합니다. 개별 뉴스 기사는 뉴스 모듈에서 관리합니다.'
    },
    golf: {
      title: 'Golf',
      description: 'Golf 맞춤 팔찌 페이지의 구성기, 소재와 전시 콘텐츠를 관리합니다.'
    },
    'golf-inquiry': {
      title: 'Golf / Inquiry',
      description: 'Golf 문의 제출 페이지의 안내와 구성 요약 문구를 관리합니다.'
    },
    contact: {
      title: 'Contact',
      description: '연락처 페이지 문구, 연락 정보와 FAQ를 관리합니다.'
    },
    terms: {
      title: '이용약관',
      description: '이용약관 페이지를 관리합니다.'
    },
    privacy: {
      title: '개인정보 처리방침',
      description: '개인정보 처리방침 페이지를 관리합니다.'
    },
    common: {
      title: '공통 / 내비게이션',
      description: '푸터, 내비게이션, 기본 SEO와 공통 UI 문구를 관리합니다.'
    }
  },
  en: {
    home: {
      title: 'Home',
      description: 'Manage the homepage hero, Signature projects, proof points, and home CTAs.'
    },
    archive: {
      title: 'Archive',
      description: 'Manage the brand history timeline and core Archive page content.'
    },
    'heritage-loyalty': {
      title: 'Heritage / Loyalty',
      description: 'Manage the Loyalty page hero, metrics, and supporting content.'
    },
    'heritage-credibility': {
      title: 'Heritage / Credibility',
      description: 'Manage the Credibility page hero, proof points, and partner content.'
    },
    'heritage-achievement': {
      title: 'Heritage / Achievement',
      description: 'Manage the Achievement page hero, metrics, and award gallery.'
    },
    'mastery-making': {
      title: 'Mastery / Making',
      description: 'Manage the Making page hero, seven-step process, and detail content.'
    },
    'mastery-creations': {
      title: 'Mastery / Creations',
      description: 'Manage the creations index, filters, and Finder content.'
    },
    'mastery-creations-champion': {
      title: 'Creations / Champion',
      description: 'Manage the Champion category card and SEO defaults.'
    },
    'mastery-creations-appointment': {
      title: 'Creations / Appointment',
      description: 'Manage the appointment and commemorative category card and SEO defaults.'
    },
    'mastery-creations-bespoke': {
      title: 'Creations / Bespoke',
      description: 'Manage the bespoke category card and SEO defaults.'
    },
    news: {
      title: 'News',
      description: 'Manage News listing copy. Individual articles are maintained in the News module.'
    },
    golf: {
      title: 'Golf',
      description: 'Manage the Golf custom bracelet configurator, materials, and showcase content.'
    },
    'golf-inquiry': {
      title: 'Golf / Inquiry',
      description: 'Manage the Golf inquiry page instructions and configuration summary copy.'
    },
    contact: {
      title: 'Contact',
      description: 'Manage Contact page copy, contact information, and FAQ.'
    },
    terms: {
      title: 'Terms',
      description: 'Manage the Terms page.'
    },
    privacy: {
      title: 'Privacy',
      description: 'Manage the Privacy page.'
    },
    common: {
      title: 'Common / Navigation',
      description: 'Manage footer, navigation, default SEO, and shared UI copy.'
    }
  }
};

const sectionLabels: Record<Exclude<AdminLocale, 'zh'>, Record<string, string>> = {
  ko: {
    Home: '홈',
    Archive: '아카이브',
    Heritage: '헤리티지',
    Mastery: '마스터리',
    News: '뉴스',
    Golf: '골프',
    Contact: '연락처',
    Legal: '법적 고지',
    Settings: '설정'
  },
  en: {
    Home: 'Home',
    Archive: 'Archive',
    Heritage: 'Heritage',
    Mastery: 'Mastery',
    News: 'News',
    Golf: 'Golf',
    Contact: 'Contact',
    Legal: 'Legal',
    Settings: 'Settings'
  }
};

const contentGroupLabels: Record<Exclude<AdminLocale, 'zh'>, Record<string, string>> = {
  ko: {
    'home:main': '홈 주요 콘텐츠',
    'home:homeUi': '홈 팝업, 버튼 및 보조 문구',
    'archive:main': 'Archive 주요 콘텐츠',
    'archive:chronicleUi': 'Archive 가로 탐색 및 마지막 버튼',
    'mastery-creations:main': 'Creations 주요 콘텐츠',
    'mastery-creations:collectionUi': '작품 목록, 필터 및 상세 공통 문구',
    'mastery-creations-champion:main': 'Champion 분류 카드',
    'mastery-creations-champion:finder': 'Champion Finder 문구',
    'mastery-creations-appointment:main': 'Appointment 분류 카드',
    'mastery-creations-appointment:appointment': 'Appointment 페이지 콘텐츠',
    'mastery-creations-bespoke:main': 'Bespoke 분류 카드',
    'mastery-creations-bespoke:bespoke': 'Bespoke 페이지 콘텐츠',
    'news:main': 'News 목록 주요 콘텐츠',
    'news:newsUi': 'News 필터, 공유 및 상세 공통 문구',
    'golf-inquiry:main': 'Golf 문의 페이지 주요 콘텐츠',
    'golf-inquiry:form': 'Golf 문의 폼 필드와 제출 메시지',
    'contact:main': 'Contact 페이지 콘텐츠',
    'contact:form': 'Contact 폼 필드, 옵션 및 제출 메시지',
    'common:main': '내비게이션 및 푸터',
    'common:metadata': '전체 사이트 SEO 기본 제목과 설명',
    'common:legacyUi': 'Heritage 공통 버튼 문구',
    'common:specialtyUi': 'Mastery 공통 보조 문구',
    'common:notFound': '404 페이지 문구'
  },
  en: {
    'home:main': 'Home main content',
    'home:homeUi': 'Home popups, buttons, and helper copy',
    'archive:main': 'Archive main content',
    'archive:chronicleUi': 'Archive horizontal browsing and end button',
    'mastery-creations:main': 'Creations main content',
    'mastery-creations:collectionUi': 'Collection list, filters, and detail copy',
    'mastery-creations-champion:main': 'Champion category card',
    'mastery-creations-champion:finder': 'Champion Finder copy',
    'mastery-creations-appointment:main': 'Appointment category card',
    'mastery-creations-appointment:appointment': 'Appointment page content',
    'mastery-creations-bespoke:main': 'Bespoke category card',
    'mastery-creations-bespoke:bespoke': 'Bespoke page content',
    'news:main': 'News listing main content',
    'news:newsUi': 'News filters, sharing, and detail copy',
    'golf-inquiry:main': 'Golf inquiry page main content',
    'golf-inquiry:form': 'Golf inquiry form fields and submit messages',
    'contact:main': 'Contact page content',
    'contact:form': 'Contact form fields, options, and submit messages',
    'common:main': 'Navigation and footer',
    'common:metadata': 'Sitewide SEO default title and description',
    'common:legacyUi': 'Heritage shared button copy',
    'common:specialtyUi': 'Mastery shared helper copy',
    'common:notFound': '404 page copy'
  }
};

const pathSegmentLabels: Record<AdminLocale, Record<string, string>> = {
  zh: {
    hero: '首屏',
    eyebrow: '眉标',
    title: '标题',
    titleLines: '标题行',
    koreanTitle: '本地标题',
    subtitle: '副标题',
    body: '正文',
    image: '图片',
    primary: '主',
    secondary: '次',
    primaryTitle: '上方标题',
    secondaryTitle: '下方标题',
    primaryImage: '第一张图片',
    secondaryImage: '第二张图片',
    primaryCta: '上方按钮',
    secondaryCta: '下方按钮',
    imagePrimary: '主图',
    imageDetail: '细节图',
    imageBox: '盒子图片',
    imageLifestyle: '场景图片',
    poster: '封面图',
    videoPoster: '视频封面',
    signature: 'Signature 区块',
    projects: '项目',
    rings: '戒指展示',
    stats: '数字统计',
    statBand: '数字带',
    pillars: '导流章节',
    golf: 'Golf 区块',
    timeline: '时间轴',
    items: '项目',
    metrics: '指标',
    statement: '说明',
    gallery: '图库',
    branches: '分支入口',
    details: '细节',
    closing: '结尾区块',
    process: '流程',
    steps: '步骤',
    bespoke: '定制区块',
    filters: '筛选项',
    masthead: '页头',
    grid: '列表',
    cards: '卡片',
    category: '分类',
    categoryLabel: '分类显示名',
    date: '日期',
    href: '链接',
    cta: '按钮文案',
    caption: '说明',
    value: '数值',
    suffix: '后缀',
    label: '标签',
    number: '编号',
    kicker: '小标题',
    year: '年份',
    first: '重点标记',
    specLabel: '规格标签',
    heads: '球杆头选项',
    shafts: '杆身颜色选项',
    engraving: '刻字区块',
    lifestyle: '生活方式区块',
    infoTitle: '联系信息标题',
    address: '地址',
    phone: '电话',
    email: '邮箱',
    hours: '营业时间',
    faqTitle: 'FAQ 标题',
    faqs: 'FAQ',
    question: '问题',
    answer: '回答',
    name: '姓名',
    organization: '公司/团队',
    contact: '联系方式',
    type: '类型',
    submit: '提交按钮',
    success: '成功提示',
    fallback: '失败提示',
    options: '选项',
    summary: '摘要标题',
    head: '球杆头标签',
    shaft: '杆身标签',
    edit: '返回编辑',
    nav: '导航',
    footer: '页脚',
    language: '语言',
    notice: '正文',
    hoverText: '翻面显示文字'
  },
  ko: {
    hero: '히어로',
    eyebrow: '상단 라벨',
    title: '제목',
    titleLines: '제목 줄',
    koreanTitle: '국문 제목',
    subtitle: '부제목',
    body: '본문',
    image: '이미지',
    primary: '대표',
    secondary: '보조',
    primaryTitle: '대표 제목',
    secondaryTitle: '보조 제목',
    primaryImage: '첫 번째 이미지',
    secondaryImage: '두 번째 이미지',
    primaryCta: '대표 버튼',
    secondaryCta: '보조 버튼',
    imagePrimary: '대표 이미지',
    imageDetail: '상세 이미지',
    imageBox: '박스 이미지',
    imageLifestyle: '라이프스타일 이미지',
    poster: '포스터',
    videoPoster: '영상 포스터',
    signature: '시그니처 섹션',
    projects: '프로젝트',
    rings: '반지 전시',
    stats: '숫자 통계',
    statBand: '숫자 영역',
    pillars: '이동 섹션',
    golf: '골프 섹션',
    timeline: '타임라인',
    items: '항목',
    metrics: '지표',
    statement: '설명',
    gallery: '갤러리',
    branches: '분기 링크',
    details: '상세',
    closing: '마무리 섹션',
    process: '프로세스',
    steps: '단계',
    bespoke: '주문제작 섹션',
    filters: '필터',
    masthead: '페이지 헤더',
    grid: '목록',
    cards: '카드',
    category: '분류',
    categoryLabel: '분류 표시명',
    date: '날짜',
    href: '링크',
    cta: '버튼 문구',
    caption: '설명',
    value: '값',
    suffix: '접미사',
    label: '라벨',
    number: '번호',
    kicker: '소제목',
    year: '연도',
    first: '강조 표시',
    specLabel: '사양 라벨',
    heads: '헤드 옵션',
    shafts: '샤프트 색상 옵션',
    engraving: '각인 섹션',
    lifestyle: '라이프스타일 섹션',
    infoTitle: '연락처 제목',
    address: '주소',
    phone: '전화',
    email: '이메일',
    hours: '운영 시간',
    faqTitle: 'FAQ 제목',
    faqs: 'FAQ',
    question: '질문',
    answer: '답변',
    name: '이름',
    organization: '회사/팀',
    contact: '연락처',
    type: '유형',
    submit: '제출 버튼',
    success: '성공 메시지',
    fallback: '오류 메시지',
    options: '옵션',
    summary: '요약 제목',
    head: '헤드 라벨',
    shaft: '샤프트 라벨',
    edit: '수정 링크',
    nav: '내비게이션',
    footer: '푸터',
    language: '언어',
    notice: '본문',
    hoverText: '뒤집힘 표시 문구'
  },
  en: {
    hero: 'Hero',
    eyebrow: 'Eyebrow',
    title: 'Title',
    titleLines: 'Title lines',
    koreanTitle: 'Local title',
    subtitle: 'Subtitle',
    body: 'Body',
    image: 'Image',
    primary: 'Primary',
    secondary: 'Secondary',
    primaryTitle: 'Primary title',
    secondaryTitle: 'Secondary title',
    primaryImage: 'Primary image',
    secondaryImage: 'Secondary image',
    primaryCta: 'Primary CTA',
    secondaryCta: 'Secondary CTA',
    imagePrimary: 'Primary image',
    imageDetail: 'Detail image',
    imageBox: 'Box image',
    imageLifestyle: 'Lifestyle image',
    poster: 'Poster',
    videoPoster: 'Video poster',
    signature: 'Signature section',
    projects: 'Projects',
    rings: 'Ring showcase',
    stats: 'Stats',
    statBand: 'Stat band',
    pillars: 'Entry sections',
    golf: 'Golf section',
    timeline: 'Timeline',
    items: 'Items',
    metrics: 'Metrics',
    statement: 'Statement',
    gallery: 'Gallery',
    branches: 'Branch links',
    details: 'Details',
    closing: 'Closing section',
    process: 'Process',
    steps: 'Steps',
    bespoke: 'Bespoke section',
    filters: 'Filters',
    masthead: 'Masthead',
    grid: 'Grid',
    cards: 'Cards',
    category: 'Category',
    categoryLabel: 'Category label',
    date: 'Date',
    href: 'Link',
    cta: 'CTA text',
    caption: 'Caption',
    value: 'Value',
    suffix: 'Suffix',
    label: 'Label',
    number: 'Number',
    kicker: 'Kicker',
    year: 'Year',
    first: 'Featured flag',
    specLabel: 'Spec label',
    heads: 'Club head options',
    shafts: 'Shaft color options',
    engraving: 'Engraving section',
    lifestyle: 'Lifestyle section',
    infoTitle: 'Contact info title',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    hours: 'Business hours',
    faqTitle: 'FAQ title',
    faqs: 'FAQ',
    question: 'Question',
    answer: 'Answer',
    name: 'Name',
    organization: 'Organization/team',
    contact: 'Contact',
    type: 'Type',
    submit: 'Submit button',
    success: 'Success message',
    fallback: 'Error message',
    options: 'Options',
    summary: 'Summary title',
    head: 'Club head label',
    shaft: 'Shaft label',
    edit: 'Edit link',
    nav: 'Navigation',
    footer: 'Footer',
    language: 'Language',
    notice: 'Body',
    hoverText: 'Flip-side copy'
  }
};

const ignoredPathSegments = new Set(['copy']);

export function getLocalizedPageTitle(definition: PageDefinition, adminLocale: AdminLocale) {
  if (adminLocale === 'zh') {
    return definition.title;
  }

  return pageMetadataLabels[adminLocale][definition.pageKey]?.title ?? titleFromPageKey(definition.pageKey);
}

export function getLocalizedPageDescription(definition: PageDefinition, adminLocale: AdminLocale) {
  if (adminLocale === 'zh') {
    return definition.description;
  }

  return pageMetadataLabels[adminLocale][definition.pageKey]?.description ?? definition.description;
}

export function getLocalizedPageSection(section: string, adminLocale: AdminLocale) {
  if (adminLocale === 'zh') {
    return section;
  }

  return sectionLabels[adminLocale][section] ?? section;
}

export function getLocalizedContentGroupTitle(
  definition: PageDefinition,
  group: PageContentGroupDefinition,
  adminLocale: AdminLocale
) {
  if (adminLocale === 'zh') {
    return group.title;
  }

  return (
    contentGroupLabels[adminLocale][`${definition.pageKey}:${group.key}`] ??
    getLocalizedPathLabel(group.key, adminLocale)
  );
}

export function getLocalizedPageFieldLabel(field: PageFieldDefinition, adminLocale: AdminLocale) {
  if (adminLocale === 'zh') {
    return field.label;
  }

  return getLocalizedPathLabel(field.path, adminLocale);
}

export function getLocalizedArrayItemFields(
  itemFields: PageArrayItemFieldDefinition[] | undefined,
  adminLocale: AdminLocale
) {
  if (!itemFields || adminLocale === 'zh') {
    return itemFields;
  }

  return itemFields.map((field) => ({
    ...field,
    label: getLocalizedPathLabel(field.path, adminLocale)
  }));
}

export function getLocalizedPathLabel(path: string, adminLocale: AdminLocale) {
  const parts: string[] = [];

  for (const segment of path.split('.')) {
    if (!segment || ignoredPathSegments.has(segment)) {
      continue;
    }

    if (/^\d+$/.test(segment)) {
      parts.push(indexLabel(Number(segment), adminLocale));
      continue;
    }

    const label = labelForSegment(segment, adminLocale);

    if (label && parts.at(-1) !== label) {
      parts.push(label);
    }
  }

  return parts.length > 0 ? parts.slice(-4).join(' / ') : titleFromPageKey(path);
}

function labelForSegment(segment: string, adminLocale: AdminLocale) {
  const exact = pathSegmentLabels[adminLocale][segment];

  if (exact) {
    return exact;
  }

  return splitPathSegment(segment)
    .map((token) => pathSegmentLabels[adminLocale][token] ?? humanizeToken(token))
    .join(' ');
}

function splitPathSegment(segment: string) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function indexLabel(index: number, adminLocale: AdminLocale) {
  if (adminLocale === 'ko') {
    return `항목 ${index + 1}`;
  }

  if (adminLocale === 'en') {
    return `Item ${index + 1}`;
  }

  return `项目 ${index + 1}`;
}

function titleFromPageKey(pageKey: string) {
  return pageKey
    .split(/[-_]/g)
    .filter(Boolean)
    .map(humanizeToken)
    .join(' / ');
}

function humanizeToken(token: string) {
  if (/^[A-Z0-9]+$/.test(token)) {
    return token;
  }

  return token.charAt(0).toUpperCase() + token.slice(1);
}
