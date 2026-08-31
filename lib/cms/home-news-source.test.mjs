import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const homePageSource = readFileSync(new URL('../../app/[locale]/(site)/page.tsx', import.meta.url), 'utf8');
const homeNewsPopupsSource = readFileSync(new URL('../../components/home/home-news-popups.tsx', import.meta.url), 'utf8');
const heroMediaSource = readFileSync(new URL('../../components/home/hero-media.tsx', import.meta.url), 'utf8');
const newsJournalGridSource = readFileSync(new URL('../../components/news/news-journal-grid.tsx', import.meta.url), 'utf8');
const newsFormSource = readFileSync(new URL('../../app/admin/_components/news-form.tsx', import.meta.url), 'utf8');
const newsBlocksEditorSource = readFileSync(new URL('../../app/admin/_components/news-blocks-editor.tsx', import.meta.url), 'utf8');
const adminI18nSource = readFileSync(new URL('../admin-i18n.ts', import.meta.url), 'utf8');
const adminActionsSource = readFileSync(new URL('../../app/admin/actions.ts', import.meta.url), 'utf8');
const newsDetailPageSource = readFileSync(new URL('../../app/[locale]/(site)/news/[slug]/page.tsx', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('./public-content.ts', import.meta.url), 'utf8');
const validationSource = readFileSync(new URL('./validation.ts', import.meta.url), 'utf8');
const snapshotSource = readFileSync(new URL('./static-snapshot-core.ts', import.meta.url), 'utf8');
const repositorySource = readFileSync(
  new URL('../../backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java', import.meta.url),
  'utf8'
);
const pageCatalog = JSON.parse(readFileSync(new URL('./page-catalog.json', import.meta.url), 'utf8'));

test('home latest news is sourced from the News CMS list, not duplicated page JSON', () => {
  assert.match(homePageSource, /getHomeNewsCardsForSite/);
  assert.match(homePageSource, /await getHomeNewsCardsForSite\(locale\)/);
  assert.doesNotMatch(homePageSource, /getHomeNewsCardsFromPage/);
  assert.doesNotMatch(homePageSource, /latestNews\.cards/);
});

test('home production video section sits between stats and latest news', () => {
  const statIndex = homePageSource.indexOf('<HomeStatBand');
  const videoIndex = homePageSource.indexOf('home-video-section');
  const newsIndex = homePageSource.indexOf('<HomeNewsPopups');

  assert.ok(statIndex >= 0, 'home page should render the stats band before the video');
  assert.ok(videoIndex > statIndex, 'home video section should appear after the stats band');
  assert.ok(newsIndex > videoIndex, 'latest news should be sourced after the video section');
  assert.match(homePageSource, /homeVideoSrc\(content\.videoSection\?\.src/);
  assert.match(homePageSource, /imageSrc\(content\.videoSection\?\.poster/);
  assert.match(homePageSource, /controls/);
  assert.match(homePageSource, /playsInline/);
  assert.doesNotMatch(homePageSource, /autoPlay/);
  assert.doesNotMatch(homePageSource, /muted/);
});

test('home hero video and production video are editable from the Home CMS page', () => {
  const homePage = pageCatalog.find((page) => page.pageKey === 'home');
  const paths = homePage.fields.map((field) => field.path);
  const mediaModeField = homePage.fields.find((field) => field.path === 'mediaMode');

  assert.equal(mediaModeField?.type, 'select');
  assert.deepEqual(mediaModeField?.options.map((option) => option.value), ['image', 'video']);
  assert.ok(paths.includes('image'));
  assert.ok(paths.includes('mediaMode'));
  assert.ok(paths.includes('videoSrc'));
  assert.ok(paths.includes('videoPoster'));
  assert.ok(paths.includes('webmSrc'));
  assert.ok(paths.includes('videoSection.src'));
  assert.ok(paths.includes('videoSection.poster'));
  assert.ok(paths.includes('videoSection.ariaLabel'));
  assert.match(homePageSource, /const heroMediaMode = content\.mediaMode === 'image' \? 'image' : 'video'/);
  assert.match(homePageSource, /videoSrc=\{heroMediaMode === 'video' \? content\.videoSrc \|\| 'home\.mp4' : undefined\}/);
  assert.match(homePageSource, /webmSrc=\{heroMediaMode === 'video' \? content\.webmSrc \|\| undefined : undefined\}/);
  assert.match(homePageSource, /poster=\{content\.image \|\| 'home hero\.png'\}/);
  assert.match(homePageSource, /videoPoster=\{content\.videoPoster \|\| content\.image \|\| 'home hero\.png'\}/);
  assert.match(heroMediaSource, /import \{imageSrc\} from '@\/lib\/image-src'/);
  assert.match(heroMediaSource, /resolveVideoSource/);
});

test('home CMS editor no longer exposes a separate latest news cards field', () => {
  const homePage = pageCatalog.find((page) => page.pageKey === 'home');
  const paths = homePage.fields.map((field) => field.path);

  assert.ok(paths.includes('latestNews.title'));
  assert.ok(paths.includes('latestNews.body'));
  assert.ok(!paths.includes('latestNews.cards'));
});

test('home news popup renders the localized excerpt without pulling in article body blocks', () => {
  assert.doesNotMatch(homeNewsPopupsSource, /splitModalBody/);
  assert.match(homeNewsPopupsSource, /\{activeCard\.body \? \(/);
  assert.match(homeNewsPopupsSource, /whitespace-pre-line/);
  assert.match(publicContentSource, /body: typeof item\.excerpt === 'string' \? item\.excerpt : ''/);
  assert.doesNotMatch(publicContentSource, /body: ''/);
  assert.match(adminI18nSource, /'form\.excerpt': '首页弹窗摘要'/);
  assert.match(adminI18nSource, /'form\.excerpt': 'Home popup summary'/);
  assert.match(adminI18nSource, /'form\.excerpt': '홈 팝업 요약'/);
});

test('home latest news cards and News page cards use the same portrait image frame', () => {
  assert.match(homeNewsPopupsSource, /: 'aspect-\[3\/4\]'/);
  assert.match(newsJournalGridSource, /aspect-\[3\/4\]/);
});

test('home and News cards render responsive CMS images with a mobile cover fallback', () => {
  assert.match(homeNewsPopupsSource, /import \{ResponsiveCmsImage\} from '@\/components\/responsive-cms-image'/);
  assert.match(newsJournalGridSource, /import \{ResponsiveCmsImage\} from '@\/components\/responsive-cms-image'/);
  assert.match(homeNewsPopupsSource, /filename=\{card\.image\}/);
  assert.match(homeNewsPopupsSource, /mobileFilename=\{card\.mobileImage\}/);
  assert.match(newsJournalGridSource, /filename=\{card\.image\}/);
  assert.match(newsJournalGridSource, /mobileFilename=\{card\.mobileImage\}/);
});

test('News page CMS editor no longer exposes individual news cards', () => {
  const newsPage = pageCatalog.find((page) => page.pageKey === 'news');
  const paths = newsPage.fields.map((field) => field.path);

  assert.ok(paths.includes('grid.filters'));
  assert.ok(!paths.includes('grid.cards'));
  assert.doesNotMatch(publicContentSource, /getNewsPageCardOverrides/);
  assert.doesNotMatch(publicContentSource, /applyNewsCardImageOverride/);
});

test('News detail route and SEO are derived from canonical article fields', () => {
  assert.doesNotMatch(publicContentSource, /const overrides = await getNewsPageCardOverrides\(locale\)/);
  assert.match(publicContentSource, /function toNewsCard/);
  assert.match(publicContentSource, /const image = cmsImageName\(item\.imagePath\)/);
  assert.match(publicContentSource, /href: resolveCmsHref\(locale, `\/news\/\$\{String\(item\.slug\)\}`\)/);
  assert.match(publicContentSource, /seoTitle: String\(cmsItem\.title \|\| ''\)/);
  assert.match(publicContentSource, /seoDescription: String\(cmsItem\.excerpt \|\| cmsItem\.title \|\| ''\)/);
  assert.match(publicContentSource, /ogImagePath: card\.image/);
  assert.doesNotMatch(publicContentSource, /cmsItem\.(seoTitle|seoDescription|ogImagePath)/);
  assert.doesNotMatch(newsDetailPageSource, /filename=\{card\.image\}/);
  assert.doesNotMatch(newsDetailPageSource, /detail\.ogImagePath \|\| card\.image/);
});

test('News article editor keeps visible content and removes derived link and SEO inputs', () => {
  assert.match(newsFormSource, /NewsBlocksEditor/);
  assert.doesNotMatch(newsFormSource, /form\.lead/);
  assert.doesNotMatch(newsFormSource, /form\.paragraphs/);
  assert.doesNotMatch(newsFormSource, /form\.quote/);
  assert.match(newsFormSource, /form\.ctaTitle/);
  assert.match(newsFormSource, /form\.ctaHref/);
  assert.doesNotMatch(newsFormSource, /form\.linkHref/);
  assert.doesNotMatch(newsFormSource, /form\.(seoTitle|seoDescription|ogImage)/);
  assert.doesNotMatch(newsFormSource, /ogImage(Path|Upload)/);
  assert.match(newsBlocksEditorSource, /type NewsBodyBlock/);
  assert.match(newsBlocksEditorSource, /type: 'text' \| 'imageFull' \| 'imageCentered' \| 'imageText' \| 'quote'/);
  assert.match(newsBlocksEditorSource, /name=\{`\$\{locale\}\.body\.blocks\.\$\{index\}\.type`\}/);
  assert.match(newsBlocksEditorSource, /name=\{`\$\{locale\}\.body\.blocks\.\$\{index\}\.image`\}/);
  assert.match(newsBlocksEditorSource, /moveBlock/);
  assert.match(newsBlocksEditorSource, /removeBlock/);
  assert.match(newsBlocksEditorSource, /addBlock/);
  assert.match(newsFormSource, /desktopImageGuide=\{t\('imageGuide\.newsCover'\)\}/);
  assert.match(newsFormSource, /mobileImageGuide=\{t\('imageGuide\.newsMobileCover'\)\}/);
  assert.match(newsFormSource, /imageGuide: t\('imageGuide\.newsBlock'\)/);
  assert.match(newsBlocksEditorSource, /imageGuide=\{labels\.imageGuide\}/);
  assert.match(adminActionsSource, /readNewsBlocks/);
});

test('News save and transport no longer retain derived link and SEO fields', () => {
  const readTranslationSource = adminActionsSource.slice(
    adminActionsSource.indexOf('async function readNewsTranslation('),
    adminActionsSource.indexOf('async function readNewsBlocks(')
  );

  assert.doesNotMatch(readTranslationSource, /(linkHref|seoTitle|seoDescription|ogImagePath)/);
  assert.doesNotMatch(validationSource, /(seoTitle|seoDescription|ogImagePath): optionalText/);
  assert.doesNotMatch(snapshotSource, /(seoTitle|seoDescription|ogImagePath): stringValue\(translation\./);
  assert.doesNotMatch(repositorySource, /translation\.get\("(seoTitle|seoDescription|ogImagePath)"\)/);
  assert.doesNotMatch(repositorySource, /"seoTitle", rs\.getString\("seo_title"\)/);
});

test('News detail renders CMS body blocks without legacy paragraph fallback', () => {
  assert.match(publicContentSource, /blocks: normalizeNewsBlocks\(body\.blocks\)/);
  assert.match(newsDetailPageSource, /NewsDetailBlocks/);
  assert.match(newsDetailPageSource, /const hasBlocks = detail\.blocks\.length > 0/);
  assert.match(newsDetailPageSource, /const adjacentNews = \[/);
  assert.doesNotMatch(newsDetailPageSource, /NewsLegacyBody/);
  assert.doesNotMatch(newsDetailPageSource, /detail\.paragraphs/);
  assert.doesNotMatch(newsDetailPageSource, /detail\.quote/);
  assert.doesNotMatch(newsDetailPageSource, /hasBlocks && related\.length/);
  assert.match(newsDetailPageSource, /imageText/);
  assert.match(newsDetailPageSource, /imageFull/);
});

test('News detail keeps an Omega-style fixed centered title lockup', () => {
  assert.match(newsDetailPageSource, /news-detail-title-lockup/);
  assert.match(newsDetailPageSource, /news-detail-title/);
  assert.match(newsDetailPageSource, /text-center/);
  assert.match(newsDetailPageSource, /text-accent/);
  assert.match(newsDetailPageSource, /md:text-\[48px\]/);
  assert.match(newsDetailPageSource, /lg:text-\[60px\]/);
  assert.doesNotMatch(newsDetailPageSource, /detail\.lead/);
});

test('News detail page does not auto-render the card cover as article content', () => {
  assert.match(newsDetailPageSource, /news-detail-hero/);
  assert.doesNotMatch(newsDetailPageSource, /news-detail-cover/);
  assert.match(newsDetailPageSource, /max-w-\[1440px\]/);
  assert.match(newsDetailPageSource, /max-w-\[760px\]/);
  assert.doesNotMatch(newsDetailPageSource, /lg:grid-cols-\[minmax\(0,0\.82fr\)_minmax\(320px,0\.52fr\)\]/);
});

test('CMS image normalization stores public image fields as bare filenames', () => {
  assert.match(publicContentSource, /\.replace\(\/\^images\\\//);
  assert.match(publicContentSource, /\.replace\(\/\^uploads\\\//);
  assert.doesNotMatch(publicContentSource, /normalized\.startsWith\('uploads\/'\)/);
});
