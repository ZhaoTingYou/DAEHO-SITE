# Mobile LCP And Font Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload the correct CMS-managed Hero image and remove external font stylesheet blocking while preserving separate mobile/desktop art direction and current typography.

**Architecture:** Keep `ResponsiveCmsImage` as the client-side failure boundary, but restore the Next.js preload behavior that `getImageProps` metadata currently loses by generating media-qualified React DOM preload hints from the same optimized `srcSet`. Bundle pinned font-face CSS into the application stylesheet, retain CDN-hosted immutable font binaries, and replace 828 fixed-weight Pretendard faces with 92 variable subset faces.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.6 resource hints, TypeScript 5.9, Node test runner, Docker standalone build, Google Lighthouse.

## Global Constraints

- Keep separate mobile and desktop CMS image fields and preserve their current composition.
- Do not modify CMS content, cache invalidation, database schema, or Spring CMS APIs.
- Preserve desktop video and mobile poster behavior.
- Keep the public Korean, public English, and CMS typography visually unchanged.
- Keep Pretendard pinned to v1.3.9 and retain `font-display: swap`.
- A priority responsive image must download only the source matching the active viewport.
- Existing lazy images and mobile-image failure fallback behavior must remain unchanged.
- Do not add binary font files or a new runtime dependency.

---

## File Structure

- Create `lib/responsive-image-preload.mjs`: pure construction of media-qualified image preload descriptors.
- Create `lib/responsive-image-preload.d.mts`: TypeScript contract consumed by the TSX image component.
- Create `lib/responsive-image-preload.test.mjs`: behavior tests for priority, media selection, and desktop-only fallback.
- Modify `components/responsive-cms-image.tsx`: use optimized props for eager/high-priority rendering and invoke React DOM preloads.
- Create `scripts/sync-font-css.mjs`: reproducibly fetch and normalize the two pinned upstream font CSS sources.
- Create generated `styles/vendor-fonts.css`: repository-owned font-face declarations loaded in the main CSS bundle.
- Modify `components/site/font-links.tsx`: keep only font-file connection hints; remove external stylesheet links.
- Modify `components/site/font-links.test.mjs`: enforce local CSS, variable subset invariants, version pinning, and useful preconnects.
- Modify `app/globals.css`: import the generated font stylesheet while retaining MaruBuri declarations.
- Modify `README.md`: document the font loading and priority image conventions.

---

### Task 1: Restore Responsive Hero Preload Priority

**Files:**
- Create: `lib/responsive-image-preload.test.mjs`
- Create: `lib/responsive-image-preload.mjs`
- Create: `lib/responsive-image-preload.d.mts`
- Modify: `components/responsive-cms-image.tsx`

**Interfaces:**
- Consumes: optimized `src`, `srcSet`, and `sizes` returned by Next.js `getImageProps`.
- Produces: `getResponsiveImagePreloads(input): ResponsiveImagePreload[]` and priority `<img>` props used by every existing `ResponsiveCmsImage` caller.

- [x] **Step 1: Write the preload behavior test before the helper exists**

Create `lib/responsive-image-preload.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelper() {
  const helper = await import('./responsive-image-preload.mjs').catch(() => null);
  assert.ok(helper, 'responsive image preload helper must exist');
  return helper;
}

const desktop = {
  src: '/_next/image?url=desktop&w=3840&q=75',
  srcSet: 'desktop-640 640w, desktop-1200 1200w',
  sizes: '100vw'
};

const mobile = {
  src: '/_next/image?url=mobile&w=3840&q=75',
  srcSet: 'mobile-640 640w, mobile-1200 1200w',
  sizes: '100vw'
};

test('priority art direction preloads one viewport-matched source at high priority', async () => {
  const {
    DESKTOP_IMAGE_MEDIA,
    MOBILE_IMAGE_MEDIA,
    getResponsiveImagePreloads
  } = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: true, desktop, mobile}), [
    {
      href: mobile.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: mobile.srcSet,
        imageSizes: mobile.sizes,
        media: MOBILE_IMAGE_MEDIA
      }
    },
    {
      href: desktop.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: desktop.srcSet,
        imageSizes: desktop.sizes,
        media: DESKTOP_IMAGE_MEDIA
      }
    }
  ]);
});

test('a priority desktop-only image has one unconditional preload', async () => {
  const {getResponsiveImagePreloads} = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: true, desktop}), [
    {
      href: desktop.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: desktop.srcSet,
        imageSizes: desktop.sizes
      }
    }
  ]);
});

test('lazy images do not create resource hints', async () => {
  const {getResponsiveImagePreloads} = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: false, desktop, mobile}), []);
});
```

- [x] **Step 2: Run the new test and verify the missing feature is detected**

Run:

```bash
node --test lib/responsive-image-preload.test.mjs
```

Expected: FAIL with the assertion `responsive image preload helper must exist`.

- [x] **Step 3: Add the pure preload descriptor helper**

Create `lib/responsive-image-preload.mjs`:

```js
export const MOBILE_IMAGE_MEDIA = '(max-width: 767px)';
export const DESKTOP_IMAGE_MEDIA = '(min-width: 768px)';

export function getResponsiveImagePreloads({priority, desktop, mobile}) {
  if (!priority) {
    return [];
  }

  if (!mobile) {
    return [toPreload(desktop)];
  }

  return [
    toPreload(mobile, MOBILE_IMAGE_MEDIA),
    toPreload(desktop, DESKTOP_IMAGE_MEDIA)
  ];
}

function toPreload(resource, media) {
  return {
    href: resource.src,
    options: {
      as: 'image',
      fetchPriority: 'high',
      ...(resource.srcSet ? {imageSrcSet: resource.srcSet} : {}),
      ...(resource.sizes ? {imageSizes: resource.sizes} : {}),
      ...(media ? {media} : {})
    }
  };
}
```

Create `lib/responsive-image-preload.d.mts`:

```ts
export const MOBILE_IMAGE_MEDIA: '(max-width: 767px)';
export const DESKTOP_IMAGE_MEDIA: '(min-width: 768px)';

export type ResponsiveImageResource = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

export type ResponsiveImagePreload = {
  href: string;
  options: {
    as: 'image';
    fetchPriority: 'high';
    imageSrcSet?: string;
    imageSizes?: string;
    media?: string;
  };
};

export function getResponsiveImagePreloads(input: {
  priority: boolean;
  desktop: ResponsiveImageResource;
  mobile?: ResponsiveImageResource;
}): ResponsiveImagePreload[];
```

- [x] **Step 4: Run the helper tests and verify they pass**

Run:

```bash
node --test lib/responsive-image-preload.test.mjs
```

Expected: 3 tests pass, 0 fail.

- [x] **Step 5: Extend the test to require production component wiring**

Add `readFileSync` to the imports at the top of `lib/responsive-image-preload.test.mjs`:

```js
import {readFileSync} from 'node:fs';
```

Then append this source integration test:

```js
const responsiveImageSource = readFileSync(
  new URL('../components/responsive-cms-image.tsx', import.meta.url),
  'utf8'
);

test('ResponsiveCmsImage invokes React preloads and marks the selected image eager and high priority', () => {
  assert.match(responsiveImageSource, /import \{preload\} from 'react-dom'/);
  assert.match(responsiveImageSource, /getResponsiveImagePreloads/);
  assert.match(responsiveImageSource, /fetchPriority: priority \? 'high' : undefined/);
  assert.match(responsiveImageSource, /loading: priority \? 'eager' : loading/);
  assert.match(responsiveImageSource, /preload\(hint\.href, hint\.options\)/);
});
```

- [x] **Step 6: Run the focused test and verify component wiring is absent**

Run:

```bash
node --test lib/responsive-image-preload.test.mjs
```

Expected: the first 3 tests pass and the component-wiring test fails on the missing React DOM preload import.

- [x] **Step 7: Wire optimized props and viewport-qualified preloads into the component**

Modify `components/responsive-cms-image.tsx`:

```tsx
import {preload} from 'react-dom';

import {imageSrc} from '@/lib/image-src';
import {getResponsiveImagePreloads} from '@/lib/responsive-image-preload.mjs';
```

Replace both `getImageProps` priority spreads with explicit browser attributes:

```tsx
getImageProps({
  src: desktopSource,
  alt,
  fill: true,
  sizes,
  className,
  fetchPriority: priority ? 'high' : undefined,
  loading: priority ? 'eager' : loading
}).props
```

Return full mobile props from the mobile memo instead of only `srcSet`:

```tsx
const mobileProps = useMemo(() => {
  if (!mobileSource || mobileFailed) {
    return null;
  }

  return getImageProps({
    src: mobileSource,
    alt,
    fill: true,
    sizes: mobileSizes,
    className,
    fetchPriority: priority ? 'high' : undefined,
    loading: priority ? 'eager' : loading
  }).props;
}, [alt, className, loading, mobileFailed, mobileSizes, mobileSource, priority]);

const mobileSrcSet = mobileProps?.srcSet ?? '';

const preloadHints = getResponsiveImagePreloads({
  priority,
  desktop: {
    src: desktopProps.src,
    srcSet: desktopProps.srcSet,
    sizes: desktopProps.sizes
  },
  ...(mobileProps
    ? {
        mobile: {
          src: mobileProps.src,
          srcSet: mobileProps.srcSet,
          sizes: mobileProps.sizes
        }
      }
    : {})
});

preloadHints.forEach((hint) => preload(hint.href, hint.options));
```

Keep the existing `<picture>`, `handleError`, and state transitions unchanged.

- [x] **Step 8: Run image regression tests and type checking**

Run:

```bash
node --test lib/responsive-image-preload.test.mjs components/responsive-page-images.test.mjs components/home/hero-media-mobile-poster.test.mjs
npx tsc --noEmit
```

Expected: all focused tests pass and TypeScript exits 0.

- [x] **Step 9: Commit the image preload fix**

```bash
git add lib/responsive-image-preload.mjs lib/responsive-image-preload.d.mts lib/responsive-image-preload.test.mjs components/responsive-cms-image.tsx
git commit -m "perf: preload responsive hero images"
```

---

### Task 2: Bundle Font CSS And Reduce Pretendard Swap Events

**Files:**
- Create: `scripts/sync-font-css.mjs`
- Create: `styles/vendor-fonts.css` (generated)
- Modify: `components/site/font-links.test.mjs`
- Modify: `components/site/font-links.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: pinned Google Fonts CSS endpoint and Pretendard v1.3.9 variable dynamic-subset CSS.
- Produces: one application-bundled `styles/vendor-fonts.css`; `FontLinks()` becomes font-file resource hints only.

- [x] **Step 1: Replace the old font-link tests with local-bundle requirements**

Update `components/site/font-links.test.mjs` to read `font-links.tsx`, `app/globals.css`, and the generated CSS when it exists:

```js
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const fontLinks = readFileSync(new URL('./font-links.tsx', import.meta.url), 'utf8');
const globalsCss = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
const vendorFontUrl = new URL('../../styles/vendor-fonts.css', import.meta.url);

test('font-face CSS is bundled locally instead of using external stylesheets', () => {
  assert.match(globalsCss, /@import "\.\.\/styles\/vendor-fonts\.css";/);
  assert.doesNotMatch(fontLinks, /rel="stylesheet"/);
  assert.doesNotMatch(fontLinks, /fonts\.googleapis\.com/);
  assert.doesNotMatch(fontLinks, /pretendard-dynamic-subset\.css/);
  assert.equal(existsSync(vendorFontUrl), true);
});

test('remaining font-file origins are preconnected', () => {
  assert.match(fontLinks, /https:\/\/fonts\.gstatic\.com/);
  assert.match(fontLinks, /https:\/\/cdn\.jsdelivr\.net/);
  assert.match(fontLinks, /https:\/\/hangeul\.pstatic\.net/);
});

test('local Pretendard uses the pinned variable subset with one face per Unicode range', () => {
  assert.equal(existsSync(vendorFontUrl), true);
  const css = readFileSync(vendorFontUrl, 'utf8');
  const faces = css.match(/@font-face\s*\{[^}]*font-family:\s*'Pretendard'[^}]*\}/g) ?? [];

  assert.equal(faces.length, 92);
  faces.forEach((face) => {
    assert.match(face, /font-weight:\s*45 920/);
    assert.match(face, /font-display:\s*swap/);
    assert.match(face, /unicode-range:/);
    assert.match(face, /pretendard@v1\.3\.9/);
  });
  assert.doesNotMatch(css, /Pretendard Variable/);
  assert.doesNotMatch(css, /\.\.\/\.\.\/\.\.\/packages/);
  assert.match(css, /font-family:\s*'Cormorant Garamond'/);
  assert.match(css, /font-family:\s*'Inter'/);
});
```

- [x] **Step 2: Run the font tests and verify the old external loading fails them**

Run:

```bash
node --test components/site/font-links.test.mjs
```

Expected: FAIL because `globals.css` has no vendor import, `FontLinks` still renders external stylesheets, and the generated file does not exist.

- [x] **Step 3: Add a reproducible font CSS synchronization script**

Create `scripts/sync-font-css.mjs`:

```js
import {writeFile} from 'node:fs/promises';

const GOOGLE_CSS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';
const PRETENDARD_VERSION = 'v1.3.9';
const PRETENDARD_CSS =
  `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${PRETENDARD_VERSION}/dist/web/variable/pretendardvariable-dynamic-subset.css`;
const PRETENDARD_RELATIVE =
  'url(../../../packages/pretendard/dist/web/variable/woff2-dynamic-subset/';
const PRETENDARD_FONT_BASE =
  `url(https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${PRETENDARD_VERSION}/packages/pretendard/dist/web/variable/woff2-dynamic-subset/`;
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

const [googleCss, pretendardCss] = await Promise.all([
  fetchCss(GOOGLE_CSS, {headers: {'user-agent': CHROME_USER_AGENT}}),
  fetchCss(PRETENDARD_CSS)
]);

assertIncludes(googleCss, "font-family: 'Cormorant Garamond'", 'Cormorant Garamond');
assertIncludes(googleCss, "font-family: 'Inter'", 'Inter');

const normalizedPretendard = pretendardCss
  .replaceAll("'Pretendard Variable'", "'Pretendard'")
  .replaceAll(PRETENDARD_RELATIVE, PRETENDARD_FONT_BASE);
const pretendardFaces =
  normalizedPretendard.match(/@font-face\s*\{[^}]*font-family:\s*'Pretendard'[^}]*\}/g) ?? [];

if (pretendardFaces.length !== 92) {
  throw new Error(`Expected 92 Pretendard variable subsets, received ${pretendardFaces.length}.`);
}
pretendardFaces.forEach((face, index) => {
  assertIncludes(face, 'font-weight: 45 920', `Pretendard weight range in face ${index}`);
  assertIncludes(face, 'font-display: swap', `Pretendard display in face ${index}`);
  assertIncludes(face, 'unicode-range:', `Pretendard range in face ${index}`);
  assertIncludes(face, `pretendard@${PRETENDARD_VERSION}`, `Pretendard pin in face ${index}`);
});

const output = `/* Generated by scripts/sync-font-css.mjs. Do not edit by hand.\n` +
  ` * Cormorant Garamond, Inter, and Pretendard are distributed under the SIL Open Font License.\n` +
  ` * Font binaries remain on their immutable upstream CDNs; CSS is bundled locally.\n` +
  ` */\n\n${googleCss.trim()}\n\n${normalizedPretendard.trim()}\n`;

await writeFile(new URL('../styles/vendor-fonts.css', import.meta.url), output, 'utf8');
console.log(`Wrote styles/vendor-fonts.css (${Buffer.byteLength(output)} bytes).`);

async function fetchCss(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label} is missing from the downloaded CSS.`);
  }
}
```

- [x] **Step 4: Generate and inspect the local font CSS**

Run:

```bash
node scripts/sync-font-css.mjs
wc -c styles/vendor-fonts.css
rg -c "font-family: 'Pretendard'" styles/vendor-fonts.css
rg -c 'font-weight: 45 920' styles/vendor-fonts.css
```

Expected: the script exits 0; both Pretendard counts are 92; the file includes license attribution and only absolute Pretendard font URLs.

- [x] **Step 5: Import the local CSS and remove external stylesheet links**

Add this import with the existing top-level imports in `app/globals.css`:

```css
@import "../styles/vendor-fonts.css";
```

Replace `components/site/font-links.tsx` with resource hints only:

```tsx
// Font-face CSS is bundled through app/globals.css. These hints only prepare
// connections to the immutable font-file origins used by that CSS.
export function FontLinks() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="preconnect" href="https://hangeul.pstatic.net" crossOrigin="" />
    </>
  );
}
```

Do not change the existing MaruBuri `@font-face` declarations.

- [x] **Step 6: Run font, type, and lint checks**

Run:

```bash
node --test components/site/font-links.test.mjs
npx tsc --noEmit
npm run lint
```

Expected: all commands exit 0.

- [x] **Step 7: Commit the local font loading change**

```bash
git add scripts/sync-font-css.mjs styles/vendor-fonts.css app/globals.css components/site/font-links.tsx components/site/font-links.test.mjs
git commit -m "perf: bundle font css locally"
```

---

### Task 3: Document And Verify The Integrated Production Build

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the completed responsive preload and bundled font CSS behavior.
- Produces: documented maintenance rules plus a verified Docker image and HTML resource graph.

- [x] **Step 1: Document the new conventions**

Extend the `README.md` typography and image sections with these rules:

```markdown
Font loading:

- Font-face CSS is generated by `node scripts/sync-font-css.mjs` and bundled from
  `styles/vendor-fonts.css`; public and admin layouts must not add external font
  stylesheet links.
- Keep Pretendard pinned to v1.3.9 and preserve the 92 variable Unicode subsets.
- `components/site/font-links.tsx` contains connection hints only.

Priority responsive images:

- `ResponsiveCmsImage` keeps separate mobile and desktop CMS art direction.
- Above-the-fold callers set `priority`; this emits mutually exclusive mobile and
  desktop preloads plus eager/high-priority image attributes.
- Below-the-fold callers remain lazy and must not emit preload hints.
```

- [x] **Step 2: Diagnose and fix the remaining streamed-route layout shift**

Use a throttled browser `LayoutShift` trace after the first production build. If the footer shifts when the route loading fallback is replaced, add a failing regression assertion to `mobile-public-site.test.mjs`, change the mobile loading fallback from `80svh` to `100svh`, and verify the focused test passes.

- [x] **Step 3: Run the complete source verification suite**

Run:

```bash
node --test --test-concurrency=1
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: at least the 497 baseline tests plus the new tests pass with 0 failures; TypeScript, ESLint, and diff checks exit 0.

- [x] **Step 4: Build the exact AWS Next.js Docker target**

Run:

```bash
docker build -f Dockerfile.next -t daeho-mobile-lcp-font-verify .
```

Expected: `npm run build` completes inside `Dockerfile.next` and the final standalone image is created.

- [x] **Step 5: Start the production image and wait for the Korean home page**

Run:

```bash
docker run --rm -d \
  --name daeho-mobile-lcp-font-verify \
  -p 18140:3000 \
  -e CMS_BACKEND_URL=https://daeho.works \
  -e NEXT_PUBLIC_SITE_URL=http://127.0.0.1:18140 \
  daeho-mobile-lcp-font-verify

for attempt in $(seq 1 30); do
  curl -fsS http://127.0.0.1:18140/ko >/dev/null && break
  sleep 1
done
curl -fsS -o /dev/null -w 'status=%{http_code}\n' http://127.0.0.1:18140/ko
```

Expected: status 200 within 30 seconds.

- [x] **Step 6: Verify generated HTML resource hints**

Run:

```bash
curl -fsS http://127.0.0.1:18140/ko | node -e '
let html = "";
process.stdin.on("data", (chunk) => { html += chunk; });
process.stdin.on("end", () => {
  const preloadTags = html.match(/<link[^>]+rel="preload"[^>]+as="image"[^>]*>/g) ?? [];
  const hasMobile = preloadTags.some((tag) => tag.includes("(max-width: 767px)"));
  const hasDesktop = preloadTags.some((tag) => tag.includes("(min-width: 768px)"));
  const externalFontCss = /<link[^>]+rel="stylesheet"[^>]+(?:fonts\.googleapis\.com|pretendard[^>]+\.css)/.test(html);
  const highPriorityHero = /<img[^>]+(?:fetchPriority|fetchpriority)="high"[^>]+loading="eager"/.test(html) ||
    /<img[^>]+loading="eager"[^>]+(?:fetchPriority|fetchpriority)="high"/.test(html);

  if (!hasMobile || !hasDesktop) throw new Error("Responsive Hero preload tags are missing.");
  if (externalFontCss) throw new Error("An external font stylesheet is still present.");
  if (!highPriorityHero) throw new Error("The Hero image is not eager/high priority.");

  console.log({hasMobile, hasDesktop, externalFontCss, highPriorityHero});
});
'
```

Expected: both conditional preloads are true, external font CSS is false, and high-priority Hero is true.

- [x] **Step 7: Run throttled Lighthouse smoke measurements**

Run:

```bash
npx --yes lighthouse@12.8.2 http://127.0.0.1:18140/ko \
  --quiet \
  --form-factor=mobile \
  --throttling-method=devtools \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json \
  --output-path=/tmp/daeho-mobile-lcp-font.json

node - <<'NODE'
const report = require('/tmp/daeho-mobile-lcp-font.json');
console.log({
  lcp: report.audits['largest-contentful-paint'].displayValue,
  cls: report.audits['cumulative-layout-shift'].displayValue,
  blocking: report.audits['render-blocking-resources']?.displayValue ?? 'none'
});
NODE
```

Expected: the trace contains no external font stylesheet request; record LCP and CLS for comparison rather than treating local latency as the AWS result.

- [x] **Step 8: Stop the verification container**

```bash
docker stop daeho-mobile-lcp-font-verify
```

- [x] **Step 9: Commit the documentation**

```bash
git add README.md
git commit -m "docs: record responsive preload and font rules"
```

---

### Task 4: Publish A Reviewable PR And Gate AWS Deployment

**Files:**
- No new files; verify the complete branch diff.

**Interfaces:**
- Consumes: all commits from Tasks 1–3.
- Produces: a reviewable pull request; AWS remains unchanged until explicit merge/deploy approval.

- [ ] **Step 1: Rebase the branch on the latest remote main and rerun focused checks**

```bash
git fetch origin main
git rebase origin/main
node --test lib/responsive-image-preload.test.mjs components/site/font-links.test.mjs components/home/hero-media-mobile-poster.test.mjs
npx tsc --noEmit
```

Expected: rebase completes without losing the font or preload changes; all focused checks pass.

- [ ] **Step 2: Review the final diff and commit list**

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
```

Expected: only the design/plan docs, preload helper/component, generated font CSS/script, font resource hints/tests, globals import, and README are changed.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin codex/mobile-lcp-font-render
gh pr create \
  --base main \
  --head codex/mobile-lcp-font-render \
  --title "모바일 LCP 이미지 우선 로딩 및 폰트 CSS 최적화" \
  --body "모바일·데스크톱 히어로 이미지를 유지하면서 뷰포트별 preload를 추가하고, 외부 폰트 CSS를 앱 번들로 이동합니다. 전체 테스트·타입 검사·린트·Docker 빌드 및 로컬 Lighthouse 결과를 포함합니다. AWS 배포는 리뷰와 승인 후 진행합니다."
```

Expected: GitHub returns a new PR URL.

- [ ] **Step 4: After explicit approval, merge and deploy to AWS**

Do not execute this step before the user approves the reviewed PR.

```bash
pr_number=$(gh pr view codex/mobile-lcp-font-render --repo ZhaoTingYou/DAEHO-SITE --json number --jq .number)
gh pr merge "$pr_number" --repo ZhaoTingYou/DAEHO-SITE --merge
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem \
  -o BatchMode=yes ubuntu@15.164.62.44 \
  'set -e; cd /home/ubuntu/daeho-site; git fetch origin main; git checkout main; git reset --hard origin/main; sudo docker compose -p daeho-prod up -d --build next nginx; sudo docker compose -p daeho-prod ps; git rev-parse HEAD'
```

- [ ] **Step 5: Verify production and record the real AWS result**

```bash
curl -fsS -o /dev/null -w 'home=%{http_code} total=%{time_total}\n' https://daeho.works/ko
curl -fsS https://daeho.works/ko | rg 'max-width: 767px|min-width: 768px|fetchPriority="high"|fetchpriority="high"'
curl -fsS https://daeho.works/ko | rg 'fonts.googleapis.com|pretendard-dynamic-subset.css' && exit 1 || true
```

Then run PageSpeed Insights under the same conditions used for the 3.4-second LCP and 0.195 slow-network CLS report. Record the post-deployment mobile LCP, normal CLS, slow-network CLS, transferred font bytes, and total page bytes in the final handoff.
