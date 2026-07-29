import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./heritage-hero.tsx', import.meta.url), 'utf8');
const loyaltySource = readFileSync(new URL('./loyalty-commitment-page.tsx', import.meta.url), 'utf8');
const credibilitySource = readFileSync(new URL('./credibility-compliance-page.tsx', import.meta.url), 'utf8');
const achievementSource = readFileSync(new URL('./achievement-records-page.tsx', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8'));

test('heritage hero body copy uses Pretendard across all heritage pages', () => {
  assert.ok(source.includes('const bodyTextClass = "[font-family:\'Pretendard\',sans-serif] font-normal"'));
  assert.ok(!source.includes("const bodyTextClass =\n    locale === 'ko'"));
  assert.ok(
    source.includes(
      'className={`${bodyTextClass} ${mobileSupportingTextClass} whitespace-pre-line text-[15px] leading-[1.8] tracking-normal'
    )
  );
});

test('heritage hero backgrounds are editable through CMS hero image fields', () => {
  for (const pageKey of ['heritage-loyalty', 'heritage-credibility', 'heritage-achievement']) {
    const page = pageCatalog.find((entry) => entry.pageKey === pageKey);
    const imageField = page?.fields.find((field) => field.path === 'hero.image');

    assert.equal(imageField?.type, 'image', `${pageKey} should expose hero.image as an image field`);
    assert.ok(
      !page?.fields.some((field) => field.path === 'copy.imagePlaceholder'),
      `${pageKey} should not ask CMS editors to change a placeholder field for the hero background`
    );
  }

  for (const pageSource of [loyaltySource, credibilitySource, achievementSource]) {
    assert.ok(pageSource.includes('const heroImage = resolveHeritageHeroImage('));
    assert.ok(pageSource.includes('image={heroImage}'));
  }

  assert.ok(source.includes("import {ResponsiveCmsImage} from '@/components/responsive-cms-image';"));
  assert.ok(source.includes('filename={visibleImage}'));
  assert.ok(source.includes('mobileFilename={mobileImage}'));
});

test('heritage hero restores its named placeholder when a Storage image fails', () => {
  assert.ok(source.includes('const [imageFailed, setImageFailed] = useState(false)'));
  assert.ok(source.includes('onDesktopError={() => setImageFailed(true)}'));
  assert.ok(source.includes('!visibleImage && imagePlaceholder'));
});

test('heritage hero images render without the previous red tint overlay', () => {
  assert.ok(!source.includes('bg-[#653433]/58'));
  assert.ok(!source.includes('absolute inset-0 bg-[#653433]'));
});

test('heritage hero mobile copy stays readable over dark background images', () => {
  assert.ok(source.includes('max-md:bg-gradient-to-b'));
  assert.ok(source.includes('max-md:from-black/25'));
  assert.ok(source.includes('max-md:via-black/55'));
  assert.ok(source.includes('max-md:to-black/70'));
  assert.ok(source.includes("const mobileTitleTextClass = visibleImage ? 'max-md:text-white' : ''"));
  assert.ok(source.includes("const mobileSupportingTextClass = visibleImage ? 'max-md:text-white/90' : ''"));
  assert.ok(source.includes('className={`${englishTextClass} ${mobileTitleTextClass} mobile-display'));
});

test('credibility CMS textarea rows preserve manual line breaks on the public page', () => {
  assert.match(
    credibilitySource,
    /className="whitespace-pre-line \[font-family:'Pretendard',sans-serif\] text-\[15px\] font-normal leading-\[1\.82\] text-\[#111827\]"/
  );
  assert.match(
    credibilitySource,
    /className="mt-\[10px\] whitespace-pre-line \[font-family:'Pretendard',sans-serif\]/
  );
});
