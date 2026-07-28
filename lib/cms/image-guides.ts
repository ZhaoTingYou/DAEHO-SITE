import type {AdminLocale} from '@/lib/admin-locales';

type ImageGuideSpec = {
  ratio: string;
  size: string;
  note?: Partial<Record<AdminLocale, string>>;
};

type PageImageGuideInput = {
  pageKey: string;
  groupKey?: string;
  path: string;
  locale: AdminLocale;
};

const guideSpecs = {
  heroBackground: spec('16:9 - 3:2', '2560 x 1440 / 2400 x 1600', {
    zh: '大面积 object-cover 裁切，主体放中间或避开文字区。',
    ko: '넓은 object-cover 영역입니다. 주 피사체는 중앙 또는 문구 반대편에 두세요.',
    en: 'Large object-cover area. Keep the subject centered or away from text.'
  }),
  mobileHero: spec('9:16', '1080 x 1920', {
    zh: '手机 Hero 专用竖图；主体放在中央安全区，避免贴近上下边缘。',
    ko: '모바일 Hero 전용 세로 이미지입니다. 피사체는 중앙 안전 영역에 두세요.',
    en: 'Portrait mobile Hero image. Keep the subject inside the center safe area.'
  }),
  mobileWide: spec('4:3', '1600 x 1200', {
    zh: '手机横图；主体居中并预留裁切空间。',
    ko: '모바일 가로 이미지입니다. 피사체를 중앙에 두고 재단 여백을 남기세요.',
    en: 'Mobile landscape image. Center the subject and leave crop room.'
  }),
  mobileCollectionBackground: spec('4:5', '1200 x 1500', {
    zh: 'Creations 手机分类背景；产品和主体放在中间区域。',
    ko: 'Creations 모바일 카테고리 배경입니다. 제품과 피사체를 중앙에 두세요.',
    en: 'Mobile Creations category background. Keep the product and subject centered.'
  }),
  seo: spec('1.91:1', '1200 x 630', {
    zh: '用于搜索和社交分享预览。',
    ko: '검색 및 소셜 공유 미리보기에 사용합니다.',
    en: 'Used for search and social share previews.'
  }),
  homePulse: spec('2.05:1', '2400 x 1170', {
    zh: '横向展示图，object-cover；主体放中心 70%。',
    ko: '가로형 object-cover 이미지입니다. 주요 피사체는 중앙 70% 안에 두세요.',
    en: 'Wide object-cover image. Keep key content inside the center 70%.'
  }),
  videoPoster: spec('16:9', '1920 x 1080', {
    zh: '视频封面，避免文字贴边。',
    ko: '영상 포스터입니다. 문구나 로고가 가장자리에 붙지 않게 해주세요.',
    en: 'Video poster. Avoid text or logos near the edges.'
  }),
  square: spec('1:1', '1600 x 1600', {
    zh: '正方形 object-cover；产品居中，四周留白一致。',
    ko: '정사각 object-cover 영역입니다. 제품은 중앙에 두고 여백을 일정하게 유지하세요.',
    en: 'Square object-cover area. Center the product with even margins.'
  }),
  logo: spec('1:1', '512 x 512 以上', {
    zh: '建议透明 PNG/SVG，Logo 居中留白。',
    ko: '투명 PNG/SVG 권장. 로고를 중앙에 두고 여백을 남기세요.',
    en: 'Transparent PNG/SVG recommended. Center the logo with padding.'
  }),
  archive: spec('3:2', '1800 x 1200', {
    zh: '横向卷轴图，图片会轻微放大裁切。',
    ko: '가로 아카이브 이미지이며 약간 확대되어 잘립니다.',
    en: 'Horizontal archive image; it is slightly scaled and cropped.'
  }),
  portrait: spec('3:4', '1200 x 1600', {
    zh: '竖图 object-cover；主体不要贴近上下边缘。',
    ko: '세로형 object-cover 이미지입니다. 피사체가 상하 가장자리에 붙지 않게 해주세요.',
    en: 'Portrait object-cover image. Keep the subject away from top and bottom edges.'
  }),
  sitePopup: spec('3:4 或 4:3', '1200 x 1600 / 1600 x 1200', {
    zh: '弹窗会按原比例完整显示，不裁切。',
    ko: '팝업에서 원본 비율로 전체 이미지를 표시하며 잘리지 않습니다.',
    en: 'The popup shows the complete image at its natural ratio without cropping.'
  }),
  firstRecord: spec('16:9', '1920 x 1080', {
    zh: 'FIRST RECORDS 横向图，object-cover；主体放在中央安全区并预留裁切空间。',
    ko: 'FIRST RECORDS 가로형 이미지입니다. object-cover에 맞춰 피사체를 중앙 안전 영역에 두세요.',
    en: 'FIRST RECORDS landscape image. Keep the subject in the center safe area for object-cover cropping.'
  }),
  techniqueCarousel: spec('2:1', '2000 x 1000', {
    zh: '超宽工艺轮播图，object-cover；主体放在中央 70% 安全区，两侧预留裁切空间。',
    ko: '2:1 테크닉 캐러셀 이미지입니다. 피사체는 중앙 70% 안전 영역에 두고 양옆에 여백을 남기세요.',
    en: 'Wide 2:1 technique carousel image. Keep the subject inside the center 70% with crop room at both sides.'
  }),
  wide43: spec('4:3', '1600 x 1200', {
    zh: '4:3 横图，object-cover；主体居中。',
    ko: '4:3 가로 이미지입니다. object-cover로 중앙 피사체를 권장합니다.',
    en: '4:3 landscape object-cover image. Center the subject.'
  }),
  wide43Scaled: spec('4:3', '1600 x 1200', {
    zh: '显示时会放大约 132% 再裁切，主体放正中并多留边。',
    ko: '표시 시 약 132% 확대 후 잘립니다. 피사체는 중앙에 두고 여백을 넉넉히 남기세요.',
    en: 'Displayed around 132% scaled then cropped. Center the subject with extra margins.'
  }),
  newsCover: spec('3:4', '1200 x 1600', {
    zh: '用于 News 卡片和 Home 弹窗；object-cover 裁切。',
    ko: 'News 카드와 Home 팝업에 사용합니다. object-cover로 잘립니다.',
    en: 'Used by News cards and the Home popup; cropped with object-cover.'
  }),
  newsFeatured: spec('4:3，移动端会裁到 16:9', '1600 x 1200', {
    zh: '主体放中间，移动端顶部/底部可能被裁切。',
    ko: '주 피사체는 중앙에 두세요. 모바일에서는 상하가 잘릴 수 있습니다.',
    en: 'Center the subject. Mobile may crop top and bottom.'
  }),
  newsBlock: spec('16:9 或 4:3', '1920 x 1080 / 1600 x 1200', {
    zh: '全宽图片建议 16:9；图文区块建议 4:3，主体居中留安全边。',
    ko: '전체 이미지 블록은 16:9, 이미지+텍스트 블록은 4:3 권장입니다.',
    en: 'Use 16:9 for full image blocks and 4:3 for image/text blocks.'
  }),
  collectionProduct: spec('1:1', '1600 x 1600', {
    zh: 'Collection 主图/图库通用比例；详情页会以正方形为主裁切。',
    ko: 'Collection 대표/갤러리 공통 비율입니다. 상세 페이지는 정사각 중심으로 표시됩니다.',
    en: 'General Collection cover/gallery ratio. Detail pages mostly crop square.'
  }),
  collectionBackground: spec('16:9 - 3:2', '2560 x 1440 / 2400 x 1600', {
    zh: '分类整屏背景，文字区左右交替，主体尽量居中。',
    ko: '카테고리 전체 화면 배경입니다. 문구 위치가 바뀌므로 피사체는 중앙 권장입니다.',
    en: 'Full-screen category background. Text sides vary, so keep the subject centered.'
  }),
  collectionStageProduct: spec('约 16:9 透明图', '1800 x 1000 以上', {
    zh: '透明 PNG/WebP 产品图，object-contain；四周留 3%-6% 空白。',
    ko: '투명 PNG/WebP 제품 이미지 권장. object-contain이며 3%-6% 여백을 남기세요.',
    en: 'Transparent PNG/WebP product image. Object-contain with 3%-6% padding.'
  }),
  mobileCollectionAct: spec('9:16', '1440 x 2560', {
    zh: '移动端整屏入口图，object-cover 裁切；主体放在中央偏上，并为底部文字预留空间。',
    ko: '모바일 전체 화면 입구 이미지입니다. object-cover로 잘리므로 피사체를 중앙보다 약간 위에 두고 하단 문구 공간을 남겨 주세요.',
    en: 'Full-screen mobile entrance image. Keep the subject slightly above center and leave room for copy at the bottom.'
  }),
  appointmentHero: spec('约 1.14:1', '1400 x 1220', {
    zh: '透明或浅底产品图，按原图比例显示。',
    ko: '투명/밝은 배경 제품 이미지입니다. 원본 비율로 표시됩니다.',
    en: 'Transparent or light product image, displayed in its natural ratio.'
  }),
  appointmentHonor: spec('约 0.70:1', '1200 x 1720', {
    zh: '竖向产品图，按原图比例显示。',
    ko: '세로 제품 이미지이며 원본 비율로 표시됩니다.',
    en: 'Vertical product image displayed in its natural ratio.'
  }),
  appointmentKeepsake: spec('约 1:1', '1200 x 1200', {
    zh: '产品居中，四周保留留白。',
    ko: '제품은 중앙에 두고 여백을 남기세요.',
    en: 'Center the product with padding.'
  }),
  thumbnailProduct: spec('1:1 透明图', '800 x 800', {
    zh: '圆形缩略图内 object-contain，产品完整不要贴边。',
    ko: '원형 썸네일 안에서 object-contain으로 표시됩니다. 제품이 가장자리에 닿지 않게 해주세요.',
    en: 'Object-contain inside circular thumbnails. Keep the product fully visible.'
  }),
  ultrawide: spec('21:9', '2400 x 1028', {
    zh: '超宽横图，object-cover；主体放中间。',
    ko: '초광각 가로 이미지입니다. object-cover로 중앙 피사체를 권장합니다.',
    en: 'Ultrawide object-cover image. Center the subject.'
  }),
  marketWide: spec('1.45:1', '1800 x 1240', {
    zh: '市场图文区横图，浅底、低饱和更稳。',
    ko: '시장 섹션 가로 이미지입니다. 밝고 낮은 채도 권장입니다.',
    en: 'Wide market-section image. Light, low-saturation images work best.'
  }),
  golfHeroProduct: spec('透明产品图，约 2:1 - 3:1', '1800 x 900 以上', {
    zh: 'object-contain，产品必须完整，四周留白。',
    ko: 'object-contain으로 표시됩니다. 제품 전체가 보이도록 여백을 남기세요.',
    en: 'Object-contain. Keep the full product visible with padding.'
  }),
  golfHead: spec('1:1', '1600 x 1600', {
    zh: '白底卡片内 object-cover，球杆头居中。',
    ko: '흰 카드 안에서 object-cover로 표시됩니다. 헤드는 중앙에 두세요.',
    en: 'Object-cover inside a white card. Center the club head.'
  }),
  golfShaft: spec('0.68:1 竖图', '1080 x 1600', {
    zh: '显示时会放大 135% 并按颜色位置裁切，主体留在纵向中线。',
    ko: '135% 확대 후 색상 위치별로 잘립니다. 피사체는 세로 중심에 두세요.',
    en: 'Scaled 135% and cropped by color position. Keep the subject on the vertical centerline.'
  }),
  golfEngravingPrimary: spec('0.74:1', '1200 x 1620', {
    zh: '右侧竖图，object-cover；主体居中偏上更稳。',
    ko: '오른쪽 세로 이미지입니다. object-cover이며 피사체는 중앙-상단 권장입니다.',
    en: 'Right-side portrait object-cover image. Center or slightly raise the subject.'
  }),
  golfEngravingDetail: spec('1.36:1', '1800 x 1320', {
    zh: '左下横图，object-cover；避免主体贴边。',
    ko: '좌하단 가로 이미지입니다. 피사체가 가장자리에 붙지 않게 해주세요.',
    en: 'Lower-left landscape object-cover image. Keep the subject away from edges.'
  }),
  golfLifestyle: spec('0.82:1 - 0.94:1', '1400 x 1700', {
    zh: 'Lifestyle 竖向拼贴图，object-cover；主体在中间。',
    ko: '라이프스타일 세로 콜라주 이미지입니다. object-cover이며 피사체는 중앙 권장입니다.',
    en: 'Portrait lifestyle collage image. Object-cover with centered subject.'
  })
} satisfies Record<string, ImageGuideSpec>;

const pageGuideKeys: Record<string, string> = {
  'site-popup|main|image': 'sitePopup',

  'home|main|image': 'heroBackground',
  'home|main|mobileImage': 'mobileHero',
  'home|main|videoPoster': 'heroBackground',
  'home|main|mobileVideoPoster': 'mobileHero',
  'home|homeUi|currentPulse.primaryImage': 'homePulse',
  'home|homeUi|currentPulse.primaryMobileImage': 'mobileWide',
  'home|homeUi|currentPulse.secondaryImage': 'homePulse',
  'home|homeUi|currentPulse.secondaryMobileImage': 'mobileWide',
  'home|main|signature.projects.*.image': 'square',
  'home|main|videoSection.poster': 'videoPoster',
  'home|homeUi|partners.items.*.logo': 'logo',

  'archive|main|timeline.items.*.image': 'archive',
  'archive|main|timeline.items.*.mobileImage': 'mobileWide',

  'heritage-loyalty|main|hero.image': 'heroBackground',
  'heritage-loyalty|main|hero.mobileImage': 'mobileHero',
  'heritage-loyalty|main|copy.featureSlides.*.backgroundImage': 'heroBackground',
  'heritage-loyalty|main|copy.featureSlides.*.mobileImage': 'mobileWide',
  'heritage-loyalty|main|copy.featureSlides.*.previewImage': 'portrait',

  'heritage-credibility|main|hero.image': 'heroBackground',
  'heritage-credibility|main|hero.mobileImage': 'mobileHero',
  'heritage-credibility|main|copy.rows.*.image': 'wide43Scaled',

  'heritage-achievement|main|hero.image': 'heroBackground',
  'heritage-achievement|main|hero.mobileImage': 'mobileHero',
  'heritage-achievement|main|copy.firstRecords.*.image': 'firstRecord',
  'heritage-achievement|main|copy.marketFeatures.*.image': 'marketWide',
  'heritage-achievement|main|gallery.items.*.image': 'portrait',

  'mastery-technique|main|hero.image': 'ultrawide',
  'mastery-technique|main|hero.mobileImage': 'mobileHero',
  'mastery-technique|main|records.items.*.image': 'techniqueCarousel',
  'mastery-technique|main|records.items.*.mobileImage': 'mobileWide',
  'mastery-technique|main|standards.items.*.image': 'square',

  'mastery-making|main|hero.image': 'ultrawide',
  'mastery-making|main|hero.mobileImage': 'mobileHero',
  'mastery-making|main|process.steps.*.image': 'square',
  'mastery-making|main|details.items.*.image': 'square',

  'mastery-creations|main|gallery.filters.*.image': 'collectionProduct',
  'mastery-creations|main|gallery.filters.*.background': 'collectionBackground',
  'mastery-creations|main|gallery.filters.*.mobileBackground': 'mobileCollectionBackground',
  'mastery-creations|main|gallery.filters.*.product': 'collectionStageProduct',
  'mastery-creations|main|gallery.filters.*.mobileImage': 'mobileCollectionAct',

  'mastery-creations-champion|main|image': 'collectionProduct',
  'mastery-creations-champion|main|background': 'collectionBackground',
  'mastery-creations-champion|main|mobileBackground': 'mobileCollectionBackground',
  'mastery-creations-champion|main|product': 'collectionStageProduct',
  'mastery-creations-champion|main|mobileImage': 'mobileCollectionAct',

  'mastery-creations-appointment|main|image': 'collectionProduct',
  'mastery-creations-appointment|main|background': 'collectionBackground',
  'mastery-creations-appointment|main|mobileBackground': 'mobileCollectionBackground',
  'mastery-creations-appointment|main|product': 'collectionStageProduct',
  'mastery-creations-appointment|main|mobileImage': 'mobileCollectionAct',
  'mastery-creations-appointment|appointment|heroImage': 'appointmentHero',
  'mastery-creations-appointment|appointment|honor.image': 'appointmentHonor',
  'mastery-creations-appointment|appointment|keepsake.image': 'appointmentKeepsake',
  'mastery-creations-appointment|appointment|thumbnails.*.image': 'thumbnailProduct',

  'mastery-creations-bespoke|main|image': 'collectionProduct',
  'mastery-creations-bespoke|main|background': 'collectionBackground',
  'mastery-creations-bespoke|main|mobileBackground': 'mobileCollectionBackground',
  'mastery-creations-bespoke|main|product': 'collectionStageProduct',
  'mastery-creations-bespoke|main|mobileImage': 'mobileCollectionAct',

  'news|main|featured.image': 'newsFeatured',

  'golf|main|hero.image': 'golfHeroProduct',
  'golf|main|hero.gallery.*.image': 'golfHeroProduct',
  'golf|main|statement.image': 'golfHeroProduct',
  'golf|main|heads.items.*.image': 'golfHead',
  'golf|main|shafts.items.*.image': 'golfShaft',
  'golf|main|engraving.imagePrimary': 'golfEngravingPrimary',
  'golf|main|engraving.imageDetail': 'golfEngravingDetail',
  'golf|main|lifestyle.imageBox': 'golfLifestyle',
  'golf|main|lifestyle.imageLifestyle': 'golfLifestyle'
};

export function getAdminImageGuide(key: string, locale: AdminLocale) {
  return formatGuide(guideSpecs[key as keyof typeof guideSpecs], locale);
}

export function getPageImageGuide({pageKey, groupKey = 'main', path, locale}: PageImageGuideInput) {
  const guideKey = pageGuideKeys[`${pageKey}|${groupKey || 'main'}|${normalizeGuidePath(path)}`];
  return guideKey ? getAdminImageGuide(guideKey, locale) : '';
}

export function normalizeGuidePath(path: string) {
  return path.replace(/\.\d+(?=\.|$)/g, '.*');
}

function spec(ratio: string, size: string, note?: ImageGuideSpec['note']): ImageGuideSpec {
  return {ratio, size, note};
}

function formatGuide(specValue: ImageGuideSpec | undefined, locale: AdminLocale) {
  if (!specValue) {
    return '';
  }

  const label = {
    zh: '推荐',
    ko: '권장',
    en: 'Recommended'
  }[locale];
  const sizeLabel = {
    zh: '尺寸',
    ko: '크기',
    en: 'size'
  }[locale];
  const note = specValue.note?.[locale] ?? specValue.note?.zh ?? '';
  const base = `${label}: ${specValue.ratio}, ${sizeLabel} ${specValue.size}`;

  return note ? `${base}. ${note}` : base;
}
