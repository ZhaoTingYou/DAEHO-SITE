# CMS Header Copy and Dropdown Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every header text value editable per locale in the existing CMS, strengthen Korean-header typography and contrast, and give the desktop dropdown a clearly visible full border.

**Architecture:** Extend the existing `common.navigation` locale messages and Common / Navigation CMS field list instead of adding another content model. The header continues to consume merged `next-intl` messages, while locale-scoped CSS improves the Korean header without affecting body or footer typography.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, TypeScript, Tailwind utility classes, global CSS, Node.js built-in test runner, ESLint.

## Global Constraints

- Keep the current navigation hierarchy, routes, active-state logic, animation, keyboard handling, locale switch, English-site switch, Golf switch, and external-site editor.
- Expose brand text, language short labels, navigation labels, contact copy, dropdown headings/descriptions, and accessibility helper copy for Korean and English.
- Add the currently omitted `navigation.items.making` field to the CMS form.
- Missing new fields in old CMS records must fall back through the existing static-message merge.
- Scope typography changes to the Korean header; do not change body, footer, or admin typography.
- Keep the current full-width desktop mega-menu structure and add a complete visible 1px border.
- Preserve unrelated working-tree changes and commit only files belonging to this feature.

---

## File Map

- Create `components/site/site-header-cms.test.mjs`: contract tests for fallback messages, CMS field coverage, header message usage, Korean style hooks, and dropdown border.
- Modify `messages/ko.json`: add Korean defaults for the editable brand and language short labels.
- Modify `messages/en.json`: add English defaults for the editable brand and language short labels.
- Modify `lib/cms/page-catalog.json`: expose every header text path as a Common / Navigation CMS field.
- Modify `app/admin/(dashboard)/footer/page.tsx`: render every header text field in the navigation section, including `MAKING`.
- Modify `components/site/site-header.tsx`: consume CMS brand/language labels and add focused style hooks.
- Modify `app/globals.css`: add Korean-header typography/contrast rules.

---

### Task 1: Complete the localized CMS header-copy contract

**Files:**

- Create: `components/site/site-header-cms.test.mjs`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `lib/cms/page-catalog.json`
- Modify: `app/admin/(dashboard)/footer/page.tsx`

**Interfaces:**

- Produces `common.navigation.brandLabel: string`.
- Produces `common.navigation.languageLabels: {ko: string; en: string}`.
- Exposes every string read by `SiteHeader` under `common.navigation` in the existing bilingual Common / Navigation CMS form.
- Preserves `common.navigation.hrefs` and the external-site editor unchanged.

- [ ] **Step 1: Write a failing CMS contract test**

Create `components/site/site-header-cms.test.mjs` with a `headerTextPaths` list:

```js
const headerTextPaths = [
  'navigation.brandLabel',
  'navigation.primaryLabel',
  'navigation.mobileLabel',
  'navigation.languageSwitcherLabel',
  'navigation.languageLabels.ko',
  'navigation.languageLabels.en',
  'navigation.openMenu',
  'navigation.closeMenu',
  'navigation.logoHome',
  'navigation.submenuLabel',
  'navigation.expand',
  'navigation.collapse',
  'navigation.contactCta',
  'navigation.items.home',
  'navigation.items.chronicle',
  'navigation.items.legacy',
  'navigation.items.loyalty',
  'navigation.items.credibility',
  'navigation.items.achievement',
  'navigation.items.specialty',
  'navigation.items.technique',
  'navigation.items.making',
  'navigation.items.collection',
  'navigation.items.news',
  'navigation.items.golf',
  'navigation.mega.legacy.eyebrow',
  'navigation.mega.legacy.title',
  'navigation.mega.legacy.descriptions.loyalty',
  'navigation.mega.legacy.descriptions.credibility',
  'navigation.mega.legacy.descriptions.achievement',
  'navigation.mega.specialty.eyebrow',
  'navigation.mega.specialty.title',
  'navigation.mega.specialty.descriptions.technique',
  'navigation.mega.specialty.descriptions.making',
  'navigation.mega.specialty.descriptions.collection'
];

test('every header text value has locale defaults and a CMS field', () => {
  const common = catalog.find((page) => page.pageKey === 'common');
  const fieldPaths = new Set(common.fields.map((field) => field.path));

  for (const path of headerTextPaths) {
    const messagePath = `common.${path}`;
    assert.equal(typeof valueAtPath(koMessages, messagePath), 'string', `Missing Korean ${messagePath}`);
    assert.equal(typeof valueAtPath(enMessages, messagePath), 'string', `Missing English ${messagePath}`);
    assert.ok(fieldPaths.has(path), `Missing CMS field ${path}`);
    assert.match(footerAdminSource, new RegExp(`['"]${escapeRegExp(path)}['"]`));
  }
});
```

The test file must read `messages/ko.json`, `messages/en.json`, `lib/cms/page-catalog.json`, `app/admin/(dashboard)/footer/page.tsx`, `components/site/site-header.tsx`, and `app/globals.css` once at module load, with `valueAtPath` and `escapeRegExp` helpers defined locally.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test components/site/site-header-cms.test.mjs
```

Expected: FAIL on `navigation.brandLabel`, because the fallback messages and CMS field do not exist.

- [ ] **Step 3: Add localized fallback values**

Under `common.navigation` in both message files, add:

```json
"brandLabel": "DAEHO",
"languageLabels": {
  "ko": "KO",
  "en": "EN"
},
```

Keep every existing navigation value unchanged.

- [ ] **Step 4: Add all header text paths to the Common page catalog**

Keep the existing item/contact fields, and insert these missing fields in `lib/cms/page-catalog.json`:

```json
{"path": "navigation.brandLabel", "label": "顶部栏品牌文字", "labels": {"ko": "헤더 브랜드 문구", "en": "Header brand text"}},
{"path": "navigation.primaryLabel", "label": "主导航辅助标签", "labels": {"ko": "주요 내비게이션 보조 라벨", "en": "Primary navigation accessibility label"}},
{"path": "navigation.mobileLabel", "label": "移动导航辅助标签", "labels": {"ko": "모바일 내비게이션 보조 라벨", "en": "Mobile navigation accessibility label"}},
{"path": "navigation.languageSwitcherLabel", "label": "语言切换辅助标签", "labels": {"ko": "언어 선택 보조 라벨", "en": "Language switcher accessibility label"}},
{"path": "navigation.languageLabels.ko", "label": "韩语短标签", "labels": {"ko": "한국어 짧은 라벨", "en": "Korean short label"}},
{"path": "navigation.languageLabels.en", "label": "英语短标签", "labels": {"ko": "영어 짧은 라벨", "en": "English short label"}},
{"path": "navigation.openMenu", "label": "打开菜单辅助文字", "labels": {"ko": "메뉴 열기 보조 문구", "en": "Open menu accessibility text"}},
{"path": "navigation.closeMenu", "label": "关闭菜单辅助文字", "labels": {"ko": "메뉴 닫기 보조 문구", "en": "Close menu accessibility text"}},
{"path": "navigation.logoHome", "label": "品牌首页辅助文字", "labels": {"ko": "브랜드 홈 보조 문구", "en": "Brand home accessibility text"}},
{"path": "navigation.submenuLabel", "label": "子菜单辅助文字", "labels": {"ko": "하위 메뉴 보조 문구", "en": "Submenu accessibility text"}},
{"path": "navigation.expand", "label": "展开菜单辅助文字", "labels": {"ko": "메뉴 펼치기 보조 문구", "en": "Expand menu accessibility text"}},
{"path": "navigation.collapse", "label": "收起菜单辅助文字", "labels": {"ko": "메뉴 접기 보조 문구", "en": "Collapse menu accessibility text"}},
{"path": "navigation.mega.legacy.eyebrow", "label": "HERITAGE 下拉眉题", "labels": {"ko": "HERITAGE 드롭다운 아이브로우", "en": "HERITAGE dropdown eyebrow"}},
{"path": "navigation.mega.legacy.title", "label": "HERITAGE 下拉标题", "labels": {"ko": "HERITAGE 드롭다운 제목", "en": "HERITAGE dropdown title"}},
{"path": "navigation.mega.legacy.descriptions.loyalty", "label": "LOYALTY 下拉说明", "labels": {"ko": "LOYALTY 드롭다운 설명", "en": "LOYALTY dropdown description"}},
{"path": "navigation.mega.legacy.descriptions.credibility", "label": "CREDIBILITY 下拉说明", "labels": {"ko": "CREDIBILITY 드롭다운 설명", "en": "CREDIBILITY dropdown description"}},
{"path": "navigation.mega.legacy.descriptions.achievement", "label": "ACHIEVEMENT 下拉说明", "labels": {"ko": "ACHIEVEMENT 드롭다운 설명", "en": "ACHIEVEMENT dropdown description"}},
{"path": "navigation.mega.specialty.eyebrow", "label": "MASTERY 下拉眉题", "labels": {"ko": "MASTERY 드롭다운 아이브로우", "en": "MASTERY dropdown eyebrow"}},
{"path": "navigation.mega.specialty.title", "label": "MASTERY 下拉标题", "labels": {"ko": "MASTERY 드롭다운 제목", "en": "MASTERY dropdown title"}},
{"path": "navigation.mega.specialty.descriptions.technique", "label": "TECHNIQUE 下拉说明", "labels": {"ko": "TECHNIQUE 드롭다운 설명", "en": "TECHNIQUE dropdown description"}},
{"path": "navigation.mega.specialty.descriptions.making", "label": "MAKING 下拉说明", "labels": {"ko": "MAKING 드롭다운 설명", "en": "MAKING dropdown description"}},
{"path": "navigation.mega.specialty.descriptions.collection", "label": "CREATIONS 下拉说明", "labels": {"ko": "CREATIONS 드롭다운 설명", "en": "CREATIONS dropdown description"}}
```

Do not expose the unused `motif` values.

- [ ] **Step 5: Render all fields in the existing admin navigation section**

In `footerFieldSections`, place these exact text paths before the existing `navigation.hrefs.*` paths:

```ts
'navigation.brandLabel',
'navigation.primaryLabel',
'navigation.mobileLabel',
'navigation.languageSwitcherLabel',
'navigation.languageLabels.ko',
'navigation.languageLabels.en',
'navigation.openMenu',
'navigation.closeMenu',
'navigation.logoHome',
'navigation.submenuLabel',
'navigation.expand',
'navigation.collapse',
'navigation.items.home',
'navigation.items.chronicle',
'navigation.items.legacy',
'navigation.items.loyalty',
'navigation.items.credibility',
'navigation.items.achievement',
'navigation.items.specialty',
'navigation.items.technique',
'navigation.items.making',
'navigation.items.collection',
'navigation.items.news',
'navigation.items.golf',
'navigation.contactCta',
'navigation.mega.legacy.eyebrow',
'navigation.mega.legacy.title',
'navigation.mega.legacy.descriptions.loyalty',
'navigation.mega.legacy.descriptions.credibility',
'navigation.mega.legacy.descriptions.achievement',
'navigation.mega.specialty.eyebrow',
'navigation.mega.specialty.title',
'navigation.mega.specialty.descriptions.technique',
'navigation.mega.specialty.descriptions.making',
'navigation.mega.specialty.descriptions.collection'
```

Keep all navigation link paths after the text paths in the same section.

- [ ] **Step 6: Re-run the focused test and confirm the CMS contract is GREEN**

Run:

```bash
node --test components/site/site-header-cms.test.mjs
```

Expected: the CMS coverage test passes; later rendering/style tests may still fail until Task 2.

- [ ] **Step 7: Commit the CMS contract**

```bash
git add components/site/site-header-cms.test.mjs messages/ko.json messages/en.json lib/cms/page-catalog.json 'app/admin/(dashboard)/footer/page.tsx'
git commit -m "feat: expose all header copy in CMS"
```

---

### Task 2: Consume the new copy and improve Korean/header dropdown clarity

**Files:**

- Modify: `components/site/site-header-cms.test.mjs`
- Modify: `components/site/site-header.tsx`
- Modify: `app/globals.css`

**Interfaces:**

- Consumes `common.navigation.brandLabel`.
- Consumes `common.navigation.languageLabels.<locale>`.
- Produces style hooks `site-header--ko`, `site-header-brand`, `site-header-actions`, `site-header-mega-menu`, `site-header-mega-eyebrow`, `site-header-mega-title`, `site-header-mega-description`, and `site-header-mobile-nav-label`.

- [ ] **Step 1: Add failing render and style assertions**

Add:

```js
test('header renders CMS-managed brand and language labels without hard-coded defaults', () => {
  assert.doesNotMatch(headerSource, /localeShortLabels/);
  assert.doesNotMatch(headerSource, />\s*DAEHO\s*</);
  assert.match(headerSource, /navText\('brandLabel'\)/);
  assert.match(headerSource, /navText\(`languageLabels\.\$\{targetLocale\}`\)/);
});

test('Korean header styles strengthen text and the desktop dropdown has a full border', () => {
  assert.match(headerSource, /site-header--\$\{locale\}/);
  assert.match(headerSource, /site-header-mega-menu[^"]*\bborder\b/);
  assert.doesNotMatch(headerSource, /site-header-mega-menu[^"]*\bborder-t\b/);
  assert.match(globalStyles, /\.site-header--ko \.site-nav-link[\s\S]*?font-size:\s*14px;[\s\S]*?font-weight:\s*600;/);
  assert.match(globalStyles, /\.site-header--ko \.site-header-mega-description[\s\S]*?font-size:\s*15px;[\s\S]*?font-weight:\s*500;[\s\S]*?color:\s*rgba\(16,\s*29,\s*48,\s*\.82\);/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test components/site/site-header-cms.test.mjs
```

Expected: FAIL because brand/language labels are still hard-coded and Korean style hooks do not exist.

- [ ] **Step 3: Consume CMS-managed brand and language labels**

Remove `localeShortLabels` from the header import. Build language links as:

```ts
const languageLinks = getPublicLocales(locales, englishEnabled).map((targetLocale) => ({
  locale: targetLocale,
  label: navText(`languageLabels.${targetLocale}`),
  href: withLocale(targetLocale, relativePath === '/' ? '/' : relativePath)
}));
```

Replace both visible `DAEHO` strings with:

```tsx
{navText('brandLabel')}
```

Leave `logoHome` as the separately editable accessible label.

- [ ] **Step 4: Add focused locale and element style hooks**

Add `site-header--${locale}` to the header root class. Add the remaining hooks only to their corresponding brand, action area, mega-menu container, mega eyebrow, mega title, desktop/mobile child descriptions, and mobile navigation label elements.

Change the desktop mega-menu container from a top-only hairline to:

```tsx
className="site-header-mega-menu absolute inset-x-0 top-full hidden origin-top overflow-hidden border border-[#b7bec9] bg-bg text-primary shadow-[0_30px_90px_rgba(16,29,48,.12)] [text-shadow:none] lg:block"
```

- [ ] **Step 5: Add Korean-header typography and contrast rules**

In `app/globals.css`, add:

```css
.site-header--ko .site-nav-link {
  font-size: 14px;
  font-weight: 600;
}

.site-header--ko .site-header-brand {
  font-weight: 700;
}

.site-header--ko .site-header-actions,
.site-header--ko .site-header-external-link {
  font-size: 14px;
  font-weight: 600;
}

.site-header--ko .consult-cta {
  font-weight: 600;
}

.site-header--ko .consult-cta--large,
.site-header--ko .site-header-mobile-nav-label {
  font-size: 16px;
  font-weight: 600;
}

.site-header--ko .mobile-external-site-link {
  font-size: 14px;
  font-weight: 600;
}

.site-header--ko .site-header-mega-eyebrow {
  font-size: 12px;
  font-weight: 700;
}

.site-header--ko .site-header-mega-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.site-header--ko .site-header-mega-description {
  font-size: 15px;
  font-weight: 500;
  color: rgba(16, 29, 48, .82);
}

.site-header--ko .mobile-menu-panel {
  color: var(--primary);
}
```

Keep transparent-hero white text behavior through inherited root color; the explicit darker mega-menu rules apply only inside its solid background.

- [ ] **Step 6: Run focused and adjacent header tests**

Run:

```bash
node --test components/site/site-header-cms.test.mjs components/site/site-header-spacing.test.mjs components/site/external-sites-cms.test.mjs lib/cms-editable-links.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 7: Run type and lint verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit the rendering and styles**

```bash
git add components/site/site-header-cms.test.mjs components/site/site-header.tsx app/globals.css
git commit -m "feat: improve Korean header and dropdown clarity"
```

---

### Task 3: Full verification and handoff

**Files:**

- Modify only if verification finds a feature-scoped defect.

**Interfaces:**

- Confirms the CMS contract, public rendering, responsive behavior, and repository-wide compatibility.

- [ ] **Step 1: Run the complete Node test suite**

```bash
node --test
```

Expected: all tests PASS.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: Next.js production build exits 0.

- [ ] **Step 3: Inspect the feature diff only**

```bash
git diff de75d4c...HEAD -- components/site/site-header-cms.test.mjs messages/ko.json messages/en.json lib/cms/page-catalog.json 'app/admin/(dashboard)/footer/page.tsx' components/site/site-header.tsx app/globals.css
```

Confirm there are no unrelated edits, hard-coded visible brand/language labels, missing CMS paths, or top-only dropdown borders.

- [ ] **Step 4: Record verification fixes if needed**

If a feature-scoped fix was required, stage only its files and commit:

```bash
git add components/site/site-header-cms.test.mjs messages/ko.json messages/en.json lib/cms/page-catalog.json 'app/admin/(dashboard)/footer/page.tsx' components/site/site-header.tsx app/globals.css
git commit -m "fix: complete header CMS verification"
```

If no fix was needed, do not create an empty commit.
