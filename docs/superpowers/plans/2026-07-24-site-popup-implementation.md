# DAEHO Scheduled Site Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one CMS-controlled, image-only announcement popup that appears across all Korean and English public pages during a configured Korea-time window.

**Architecture:** Store one shared `site-popup` CMS page and merge it into the existing locale messages. Keep schedule parsing, versioning, activity checks, and dismissal decisions in a framework-independent core module; render one client dialog from the public site layout and persist ordinary closes in `sessionStorage` and “do not show again” closes in `localStorage`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner, existing CMS API/PostgreSQL repositories, existing S3 media upload helpers, Tailwind CSS.

## Global Constraints

- The popup applies to every Korean and English public page and never to CMS routes.
- The CMS supports exactly one current announcement with `enabled`, `image`, `startsAt`, and `endsAt`.
- Content is image-only; do not add title, body, link, video, history, audience targeting, or popup analytics.
- Schedule input is minute-precision and always interpreted as `Asia/Seoul` (`+09:00`).
- Display only when enabled, image is present, and `startsAt <= now < endsAt`.
- An ordinary close suppresses the current version for the current browser-tab session.
- “Do not show again” suppresses the current version in persistent browser storage.
- Changing image, start time, or end time creates a new version; toggling `enabled` does not.
- Preserve image aspect ratio with no crop on mobile or desktop.
- Reuse the existing S3 upload and media library flows; do not add a database table.
- Preserve all unrelated dirty worktree changes and stage only files named by each task.

---

## File Structure

### Create

- `lib/site-popup-core.mjs`: framework-independent config normalization, Seoul-time conversion, validation, versioning, active-state and dismissal helpers.
- `lib/site-popup-core.d.ts`: TypeScript declarations consumed by server and client components.
- `lib/site-popup-core.test.mjs`: boundary and storage-decision unit tests.
- `app/admin/site-popup.test.mjs`: source and catalog contract tests for the dedicated CMS page and action.
- `app/admin/(dashboard)/popup/page.tsx`: one-language-independent popup settings screen.
- `components/site/site-popup.tsx`: accessible public popup client component.
- `components/site/site-popup.test.mjs`: integration contract tests for layout mounting and dialog behavior.

### Modify

- `lib/cms/page-catalog.json`: register the `site-popup` managed page.
- `messages/ko.json`: add static popup defaults.
- `messages/en.json`: add structurally identical static popup defaults.
- `lib/admin-i18n.ts`: add Chinese, English, and Korean CMS navigation, field, status, and validation copy.
- `app/admin/_components/admin-shell.tsx`: add `/admin/popup` to desktop and mobile navigation.
- `app/admin/(dashboard)/pages/[pageKey]/page.tsx`: redirect generic `site-popup` editing to the dedicated page.
- `app/admin/actions.ts`: add authenticated shared-config save action using existing upload and cleanup helpers.
- `app/[locale]/(site)/layout.tsx`: render one popup for all public locale routes.

---

### Task 1: Popup Domain Rules

**Files:**
- Create: `lib/site-popup-core.mjs`
- Create: `lib/site-popup-core.d.ts`
- Create: `lib/site-popup-core.test.mjs`

**Interfaces:**
- Produces: `normalizeSitePopupConfig(value): SitePopupConfig`
- Produces: `seoulDateTimeInputToIso(value): string`
- Produces: `sitePopupIsoToDateTimeInput(value): string`
- Produces: `validateSitePopupSubmission(input): SitePopupValidationResult`
- Produces: `createSitePopupVersion(config): string`
- Produces: `isSitePopupActive(config, now): boolean`
- Produces: `getSitePopupStatus(config, now): 'inactive' | 'scheduled' | 'active' | 'expired'`
- Produces: `sitePopupStorageKeys(version): {session: string; persistent: string}`
- Produces: `isSitePopupDismissed(version, sessionValue, persistentValue): boolean`

- [ ] **Step 1: Write failing unit tests for normalization and Seoul time conversion**

Create `lib/site-popup-core.test.mjs` with:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSitePopupVersion,
  getSitePopupStatus,
  isSitePopupActive,
  isSitePopupDismissed,
  normalizeSitePopupConfig,
  seoulDateTimeInputToIso,
  sitePopupIsoToDateTimeInput,
  sitePopupStorageKeys,
  validateSitePopupSubmission
} from './site-popup-core.mjs';

const activeConfig = {
  enabled: true,
  image: 'https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/holiday.png',
  startsAt: '2026-08-01T00:00:00+09:00',
  endsAt: '2026-08-16T00:00:00+09:00'
};

test('normalizes untrusted popup data without inventing enabled content', () => {
  assert.deepEqual(normalizeSitePopupConfig(null), {
    enabled: false,
    image: '',
    startsAt: '',
    endsAt: ''
  });
  assert.deepEqual(normalizeSitePopupConfig({...activeConfig, enabled: 'true'}), {
    ...activeConfig,
    enabled: false
  });
});

test('converts minute-precision Seoul input to canonical ISO and back', () => {
  assert.equal(seoulDateTimeInputToIso('2026-08-01T09:30'), '2026-08-01T09:30:00+09:00');
  assert.equal(sitePopupIsoToDateTimeInput('2026-08-01T09:30:00+09:00'), '2026-08-01T09:30');
  assert.equal(seoulDateTimeInputToIso('2026-02-30T09:30'), '');
  assert.equal(seoulDateTimeInputToIso('not-a-date'), '');
});
```

- [ ] **Step 2: Run the core test and confirm the missing-module failure**

Run:

```bash
node --test lib/site-popup-core.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `site-popup-core.mjs`.

- [ ] **Step 3: Add validation, time-window, version, and dismissal tests**

Append to `lib/site-popup-core.test.mjs`:

```js
test('requires complete active configuration and ordered dates', () => {
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: '',
      startsAtInput: '2026-08-01T00:00',
      endsAtInput: '2026-08-16T00:00'
    }),
    {ok: false, error: 'imageRequired'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: 'holiday.png',
      startsAtInput: '',
      endsAtInput: '2026-08-16T00:00'
    }),
    {ok: false, error: 'scheduleRequired'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: false,
      image: 'holiday.png',
      startsAtInput: '2026-08-16T00:00',
      endsAtInput: '2026-08-01T00:00'
    }),
    {ok: false, error: 'endAfterStart'}
  );
  assert.deepEqual(
    validateSitePopupSubmission({
      enabled: true,
      image: 'holiday.png',
      startsAtInput: '2026-08-01T00:00',
      endsAtInput: '2026-08-16T00:00'
    }),
    {
      ok: true,
      config: {
        enabled: true,
        image: 'holiday.png',
        startsAt: '2026-08-01T00:00:00+09:00',
        endsAt: '2026-08-16T00:00:00+09:00'
      }
    }
  );
});

test('uses an inclusive start and exclusive end', () => {
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-07-31T14:59:59Z')), false);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-07-31T15:00:00Z')), true);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-08-15T14:59:59Z')), true);
  assert.equal(isSitePopupActive(activeConfig, Date.parse('2026-08-15T15:00:00Z')), false);
  assert.equal(isSitePopupActive({...activeConfig, enabled: false}, Date.parse('2026-08-02T00:00:00Z')), false);
});

test('describes inactive, scheduled, active, and expired states', () => {
  assert.equal(getSitePopupStatus({...activeConfig, enabled: false}, Date.parse('2026-08-02T00:00:00Z')), 'inactive');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-07-30T00:00:00Z')), 'scheduled');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-08-02T00:00:00Z')), 'active');
  assert.equal(getSitePopupStatus(activeConfig, Date.parse('2026-08-16T00:00:00Z')), 'expired');
});

test('versions change for content or schedule but not enabled state', () => {
  const version = createSitePopupVersion(activeConfig);
  assert.equal(createSitePopupVersion({...activeConfig, enabled: false}), version);
  assert.notEqual(createSitePopupVersion({...activeConfig, image: 'new.png'}), version);
  assert.notEqual(createSitePopupVersion({...activeConfig, endsAt: '2026-08-17T00:00:00+09:00'}), version);
});

test('uses separate session and persistent dismissal keys', () => {
  const version = createSitePopupVersion(activeConfig);
  const keys = sitePopupStorageKeys(version);
  assert.notEqual(keys.session, keys.persistent);
  assert.equal(isSitePopupDismissed(version, version, ''), true);
  assert.equal(isSitePopupDismissed(version, '', version), true);
  assert.equal(isSitePopupDismissed(version, 'old-version', 'old-version'), false);
});
```

- [ ] **Step 4: Implement the framework-independent core**

Create `lib/site-popup-core.mjs`:

```js
const dateTimeInputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const canonicalIsoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\+09:00$/;

export const emptySitePopupConfig = Object.freeze({
  enabled: false,
  image: '',
  startsAt: '',
  endsAt: ''
});

export function normalizeSitePopupConfig(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    enabled: source.enabled === true,
    image: typeof source.image === 'string' ? source.image.trim() : '',
    startsAt: typeof source.startsAt === 'string' ? source.startsAt.trim() : '',
    endsAt: typeof source.endsAt === 'string' ? source.endsAt.trim() : ''
  };
}

export function seoulDateTimeInputToIso(value) {
  const match = dateTimeInputPattern.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) return '';

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const parts = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const [year, month, day, hour, minute] = parts;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    return '';
  }

  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:00+09:00`;
}

export function sitePopupIsoToDateTimeInput(value) {
  const match = canonicalIsoPattern.exec(typeof value === 'string' ? value.trim() : '');
  return match?.[1] ?? '';
}

export function validateSitePopupSubmission({enabled, image, startsAtInput, endsAtInput}) {
  const normalizedImage = typeof image === 'string' ? image.trim() : '';
  const startsAt = startsAtInput ? seoulDateTimeInputToIso(startsAtInput) : '';
  const endsAt = endsAtInput ? seoulDateTimeInputToIso(endsAtInput) : '';

  if ((startsAtInput && !startsAt) || (endsAtInput && !endsAt)) {
    return {ok: false, error: 'invalidDate'};
  }
  if (enabled && !normalizedImage) {
    return {ok: false, error: 'imageRequired'};
  }
  if (enabled && (!startsAt || !endsAt)) {
    return {ok: false, error: 'scheduleRequired'};
  }
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return {ok: false, error: 'endAfterStart'};
  }

  return {
    ok: true,
    config: {enabled: enabled === true, image: normalizedImage, startsAt, endsAt}
  };
}

export function isSitePopupActive(value, now = Date.now()) {
  return getSitePopupStatus(value, now) === 'active';
}

export function getSitePopupStatus(value, now = Date.now()) {
  const config = normalizeSitePopupConfig(value);
  const startsAt = Date.parse(config.startsAt);
  const endsAt = Date.parse(config.endsAt);
  if (!config.enabled || !config.image || !Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return 'inactive';
  }
  if (now < startsAt) {
    return 'scheduled';
  }
  if (now >= endsAt) {
    return 'expired';
  }
  return 'active';
}

export function createSitePopupVersion(value) {
  const config = normalizeSitePopupConfig(value);
  const input = `${config.image}\u0000${config.startsAt}\u0000${config.endsAt}`;
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function sitePopupStorageKeys(version) {
  return {
    session: `daeho.sitePopup.session.${version}`,
    persistent: `daeho.sitePopup.dismissed.${version}`
  };
}

export function isSitePopupDismissed(version, sessionValue, persistentValue) {
  return sessionValue === version || persistentValue === version;
}
```

Create `lib/site-popup-core.d.ts` with the exact public types:

```ts
export type SitePopupConfig = {
  enabled: boolean;
  image: string;
  startsAt: string;
  endsAt: string;
};

export type SitePopupValidationError =
  | 'imageRequired'
  | 'scheduleRequired'
  | 'invalidDate'
  | 'endAfterStart';

export type SitePopupValidationResult =
  | {ok: true; config: SitePopupConfig}
  | {ok: false; error: SitePopupValidationError};

export const emptySitePopupConfig: Readonly<SitePopupConfig>;
export function normalizeSitePopupConfig(value: unknown): SitePopupConfig;
export function seoulDateTimeInputToIso(value: unknown): string;
export function sitePopupIsoToDateTimeInput(value: unknown): string;
export function validateSitePopupSubmission(input: {
  enabled: boolean;
  image: string;
  startsAtInput: string;
  endsAtInput: string;
}): SitePopupValidationResult;
export function isSitePopupActive(value: unknown, now?: number): boolean;
export function getSitePopupStatus(
  value: unknown,
  now?: number
): 'inactive' | 'scheduled' | 'active' | 'expired';
export function createSitePopupVersion(value: unknown): string;
export function sitePopupStorageKeys(version: string): {session: string; persistent: string};
export function isSitePopupDismissed(
  version: string,
  sessionValue: string | null,
  persistentValue: string | null
): boolean;
```

- [ ] **Step 5: Run the core tests**

Run:

```bash
node --test lib/site-popup-core.test.mjs
```

Expected: all popup core tests PASS.

- [ ] **Step 6: Commit the domain rules**

```bash
git add lib/site-popup-core.mjs lib/site-popup-core.d.ts lib/site-popup-core.test.mjs
git commit -m "Add scheduled popup domain rules"
```

---

### Task 2: CMS Catalog and Localized Defaults

**Files:**
- Create: `app/admin/site-popup.test.mjs`
- Modify: `lib/cms/page-catalog.json`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `lib/admin-i18n.ts`
- Modify: `app/admin/_components/admin-shell.tsx`
- Modify: `app/admin/(dashboard)/pages/[pageKey]/page.tsx`

**Interfaces:**
- Consumes: `SitePopupConfig` fields from Task 1.
- Produces: managed page key `site-popup` with source path `sitePopup`.
- Produces: admin translation keys under `nav.popup` and `popup.*`.
- Produces: generic editor redirect from `/admin/pages/site-popup` to `/admin/popup`.

- [ ] **Step 1: Write the failing catalog and navigation contract tests**

Create `app/admin/site-popup.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = (path) => JSON.parse(readText(path));

test('popup fallback config is structurally identical in both public locales', () => {
  const ko = readJson('../../messages/ko.json').sitePopup;
  const en = readJson('../../messages/en.json').sitePopup;
  const expected = {enabled: false, image: '', startsAt: '', endsAt: ''};
  assert.deepEqual(ko, expected);
  assert.deepEqual(en, expected);
});

test('popup is a managed site-wide page with a dedicated editor', () => {
  const catalog = readJson('../../lib/cms/page-catalog.json');
  const popup = catalog.find(({pageKey}) => pageKey === 'site-popup');
  assert.equal(popup.sourcePath, 'sitePopup');
  assert.deepEqual(popup.fields.map(({path}) => path), ['enabled', 'image', 'startsAt', 'endsAt']);

  const genericEditor = readText('./(dashboard)/pages/[pageKey]/page.tsx');
  assert.ok(genericEditor.includes("pageKey === 'site-popup'"));
  assert.ok(genericEditor.includes("redirect('/admin/popup')"));
});

test('desktop and mobile admin navigation expose popup settings', () => {
  const shell = readText('./_components/admin-shell.tsx');
  const messages = readText('../../lib/admin-i18n.ts');
  assert.ok(shell.includes("{href: '/admin/popup', labelKey: 'nav.popup'}"));
  assert.ok(messages.includes("'nav.popup'"));
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```bash
node --test app/admin/site-popup.test.mjs
```

Expected: FAIL because `sitePopup` and `/admin/popup` do not exist.

- [ ] **Step 3: Register the managed page and static defaults**

Add this object to `lib/cms/page-catalog.json`:

```json
{
  "pageKey": "site-popup",
  "title": "全站弹窗公告",
  "description": "设置全站定时显示的图片公告",
  "section": "settings",
  "sortOrder": 990,
  "href": "/",
  "sourcePath": "sitePopup",
  "fields": [
    {"path": "enabled", "label": "显示弹窗"},
    {"path": "image", "label": "公告图片", "type": "image"},
    {"path": "startsAt", "label": "开始时间"},
    {"path": "endsAt", "label": "结束时间"}
  ]
}
```

Add the same root object to `messages/ko.json` and `messages/en.json`:

```json
"sitePopup": {
  "enabled": false,
  "image": "",
  "startsAt": "",
  "endsAt": ""
}
```

- [ ] **Step 4: Add localized CMS copy**

Add each key to all three dictionaries in `lib/admin-i18n.ts`, using these exact values:

```ts
// Chinese
'nav.popup': '弹窗公告',
'popup.title': '弹窗公告',
'popup.description': '设置全站图片公告的显示时间和状态。',
'popup.enabled': '显示弹窗',
'popup.image': '公告图片',
'popup.startsAt': '开始时间（韩国时间）',
'popup.endsAt': '结束时间（韩国时间）',
'popup.timezoneHint': '时间固定按韩国时间 Asia/Seoul（UTC+9）执行。',
'popup.imageGuide': '建议竖图 1200×1600 或横图 1600×1200，前台完整显示、不裁切。',
'popup.active': '当前正在显示',
'popup.scheduled': '已排期，尚未开始',
'popup.inactive': '当前未显示',
'popup.expired': '显示时间已结束',
'popup.saved': '弹窗设置已保存。',
'popup.error.imageRequired': '开启弹窗时必须选择公告图片。',
'popup.error.scheduleRequired': '开启弹窗时必须填写开始和结束时间。',
'popup.error.invalidDate': '日期或时间格式无效。',
'popup.error.endAfterStart': '结束时间必须晚于开始时间。'

// English
'nav.popup': 'Site popup',
'popup.title': 'Site popup',
'popup.description': 'Schedule an image announcement across the public website.',
'popup.enabled': 'Show popup',
'popup.image': 'Announcement image',
'popup.startsAt': 'Start time (Korea time)',
'popup.endsAt': 'End time (Korea time)',
'popup.timezoneHint': 'The schedule always uses Asia/Seoul (UTC+9).',
'popup.imageGuide': 'Recommended: 1200×1600 portrait or 1600×1200 landscape. Images are shown without cropping.',
'popup.active': 'Currently visible',
'popup.scheduled': 'Scheduled, not started',
'popup.inactive': 'Currently hidden',
'popup.expired': 'Schedule has ended',
'popup.saved': 'Popup settings saved.',
'popup.error.imageRequired': 'Select an announcement image before enabling the popup.',
'popup.error.scheduleRequired': 'Enter both a start and end time before enabling the popup.',
'popup.error.invalidDate': 'The date or time format is invalid.',
'popup.error.endAfterStart': 'The end time must be later than the start time.'

// Korean
'nav.popup': '팝업 공지',
'popup.title': '팝업 공지',
'popup.description': '전체 공개 사이트에 표시할 이미지 공지와 일정을 설정합니다.',
'popup.enabled': '팝업 표시',
'popup.image': '공지 이미지',
'popup.startsAt': '시작 시간 (한국 시간)',
'popup.endsAt': '종료 시간 (한국 시간)',
'popup.timezoneHint': '일정은 항상 Asia/Seoul(UTC+9) 기준으로 적용됩니다.',
'popup.imageGuide': '세로형 1200×1600 또는 가로형 1600×1200을 권장하며 이미지는 잘리지 않고 표시됩니다.',
'popup.active': '현재 표시 중',
'popup.scheduled': '표시 예정',
'popup.inactive': '현재 숨김',
'popup.expired': '표시 기간 종료',
'popup.saved': '팝업 설정을 저장했습니다.',
'popup.error.imageRequired': '팝업을 켜려면 공지 이미지를 선택해 주세요.',
'popup.error.scheduleRequired': '팝업을 켜려면 시작 시간과 종료 시간을 모두 입력해 주세요.',
'popup.error.invalidDate': '날짜 또는 시간 형식이 올바르지 않습니다.',
'popup.error.endAfterStart': '종료 시간은 시작 시간보다 늦어야 합니다.'
```

- [ ] **Step 5: Add the dedicated navigation and redirect**

Insert into `navItems` in `app/admin/_components/admin-shell.tsx`:

```ts
{href: '/admin/popup', labelKey: 'nav.popup'},
```

Update the redirect guard in `app/admin/(dashboard)/pages/[pageKey]/page.tsx`:

```ts
if (pageKey === 'common') {
  redirect('/admin/footer');
}

if (pageKey === 'site-popup') {
  redirect('/admin/popup');
}
```

- [ ] **Step 6: Run the catalog contract test**

Run:

```bash
node --test app/admin/site-popup.test.mjs
```

Expected: all current site-popup tests PASS.

- [ ] **Step 7: Commit catalog and navigation**

```bash
git add app/admin/site-popup.test.mjs lib/cms/page-catalog.json messages/ko.json messages/en.json lib/admin-i18n.ts app/admin/_components/admin-shell.tsx 'app/admin/(dashboard)/pages/[pageKey]/page.tsx'
git commit -m "Register site popup settings"
```

---

### Task 3: Dedicated CMS Editor and Save Action

**Files:**
- Create: `app/admin/(dashboard)/popup/page.tsx`
- Modify: `app/admin/actions.ts`
- Modify: `app/admin/site-popup.test.mjs`

**Interfaces:**
- Consumes: `validateSitePopupSubmission`, `normalizeSitePopupConfig`, and `sitePopupIsoToDateTimeInput` from Task 1.
- Consumes: existing `ImageUploadField`, `TextField`, `SubmitButton`, `PageHeader`, `Panel`, `listMedia`, `savePublicImage`, `upsertPage`, and image cleanup helpers.
- Produces: `saveSitePopupAction(formData: FormData): Promise<void>`.
- Produces form fields: `enabled`, `image`, `imageUpload`, `startsAt`, and `endsAt`.

- [ ] **Step 1: Extend the source contract test for the editor and action**

Append to `app/admin/site-popup.test.mjs`:

```js
test('dedicated popup editor exposes one shared image and Seoul schedule', () => {
  const page = readText('./(dashboard)/popup/page.tsx');
  assert.ok(page.includes('action={saveSitePopupAction}'));
  assert.ok(page.includes('name="enabled"'));
  assert.ok(page.includes('name="image"'));
  assert.ok(page.includes('uploadName="imageUpload"'));
  assert.ok(page.includes('name="startsAt"'));
  assert.ok(page.includes('name="endsAt"'));
  assert.ok(page.includes('type="datetime-local"'));
  assert.ok(page.includes('sitePopupIsoToDateTimeInput'));
  assert.ok(page.includes('getMediaLibraryItems'));
});

test('popup save validates once and synchronizes both public locales', () => {
  const actions = readText('./actions.ts');
  assert.ok(actions.includes('export async function saveSitePopupAction'));
  assert.ok(actions.includes('validateSitePopupSubmission'));
  assert.ok(actions.includes('content: {ko: config, en: config}'));
  assert.ok(actions.includes('saveSharedPageImage(upload, returnTo, image)'));
  assert.ok(actions.includes('revalidateManagedPublicPaths()'));
});
```

- [ ] **Step 2: Run the test and verify the missing page/action failure**

Run:

```bash
node --test app/admin/site-popup.test.mjs
```

Expected: FAIL because the dedicated page and action are missing.

- [ ] **Step 3: Add the authenticated save action**

Import `validateSitePopupSubmission` into `app/admin/actions.ts`, then add:

```ts
const sitePopupErrorMessageKeys = {
  imageRequired: 'popup.error.imageRequired',
  scheduleRequired: 'popup.error.scheduleRequired',
  invalidDate: 'popup.error.invalidDate',
  endAfterStart: 'popup.error.endAfterStart'
} as const;

export async function saveSitePopupAction(formData: FormData) {
  await assertAdminSession();
  const returnTo = '/admin/popup';

  try {
    const previousPage = await getPage('site-popup');
    const previousImages = collectImageFilenames(previousPage);
    const file = formData.get('imageUpload');
    let image = stringFromForm(formData, 'image');
    const upload = file instanceof File && file.size > 0 ? file : null;

    const result = validateSitePopupSubmission({
      enabled: formData.get('enabled') === 'on',
      image: upload?.name || image,
      startsAtInput: stringFromForm(formData, 'startsAt'),
      endsAtInput: stringFromForm(formData, 'endsAt')
    });

    if (!result.ok) {
      const {t} = await getAdminI18n();
      throw new Error(t(sitePopupErrorMessageKeys[result.error]));
    }

    if (upload) {
      image = await saveSharedPageImage(upload, returnTo, image);
    }
    const config = {...result.config, image};
    const payload = pagePayloadSchema.parse({
      section: 'settings',
      sortOrder: 990,
      content: {ko: config, en: config},
      seo: {ko: {}, en: {}}
    });
    const savedPage = await upsertPage('site-popup', payload);

    await cleanupRemovedImages(previousImages, collectImageFilenames(savedPage));
    revalidatePath('/admin/pages');
    revalidatePath('/admin/pages/site-popup');
    revalidatePath(returnTo);
    revalidateManagedPublicPaths();
    redirect(`${returnTo}?saved=1`);
  } catch (error) {
    redirectWithAdminActionError(returnTo, error);
  }
}
```

- [ ] **Step 4: Build the dedicated CMS page**

Create `app/admin/(dashboard)/popup/page.tsx`:

```tsx
import {saveSitePopupAction} from '@/app/admin/actions';
import {getAdminI18n} from '@/lib/admin-i18n';
import {listMedia} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {
  getSitePopupStatus,
  normalizeSitePopupConfig,
  sitePopupIsoToDateTimeInput
} from '@/lib/site-popup-core.mjs';

import {AdminActionAlert} from '../../_components/admin-feedback';
import {
  ImageUploadField,
  SubmitButton,
  TextField,
  type MediaLibraryItem
} from '../../_components/admin-fields';
import {PageHeader, Panel} from '../../_components/admin-shell';

type AdminPopupPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AdminPopupPage({searchParams}: AdminPopupPageProps) {
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const [messages, mediaItems] = await Promise.all([
    getLocaleMessages('ko'),
    getMediaLibraryItems()
  ]);
  const config = normalizeSitePopupConfig(messages.sitePopup);
  const status = getSitePopupStatus(config);

  return (
    <>
      <PageHeader
        title={t('popup.title')}
        description={t('popup.description')}
        action={
          <span className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]">
            {t(`popup.${status}`)}
          </span>
        }
      />

      {query?.saved === '1' ? (
        <div role="status" className="mb-5 rounded-md border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#067647]">
          {t('popup.saved')}
        </div>
      ) : null}

      <AdminActionAlert
        searchParams={query}
        title={t('cmsAlert.title')}
        fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')}
      />

      <form action={saveSitePopupAction} className="grid gap-6 pb-24">
        <Panel className="grid gap-5 p-5">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#344054]">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={config.enabled}
              className="size-4 accent-[#7a2230]"
            />
            <span>{t('popup.enabled')}</span>
          </label>

          <ImageUploadField
            label={t('popup.image')}
            name="image"
            uploadName="imageUpload"
            defaultValue={config.image}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
            emptyLabel={t('common.noImage')}
            changedLabel={t('common.changed')}
            selectedLabel={t('common.imageSelected')}
            mediaItems={mediaItems}
            mediaSelectLabel={t('media.selectFromLibrary')}
            mediaLibraryTitle={t('media.libraryTitle')}
            mediaEmptyLabel={t('media.libraryEmpty')}
            mediaSelectedLabel={t('media.selectedExisting')}
            imageGuide={t('popup.imageGuide')}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={t('popup.startsAt')}
              name="startsAt"
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(config.startsAt)}
              editorControls={false}
            />
            <TextField
              label={t('popup.endsAt')}
              name="endsAt"
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(config.endsAt)}
              editorControls={false}
            />
          </div>

          <p className="text-sm text-[#647084]">{t('popup.timezoneHint')}</p>
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>{t('page.save')}</SubmitButton>
        </div>
      </form>
    </>
  );
}

async function getMediaLibraryItems(): Promise<MediaLibraryItem[]> {
  return (await listMedia()).map((item) => ({
    filename: item.filename,
    url: item.url,
    alt: item.altKo || item.altEn || item.filename
  }));
}
```

- [ ] **Step 5: Run the CMS contract and core tests**

Run:

```bash
node --test app/admin/site-popup.test.mjs lib/site-popup-core.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the CMS editor**

```bash
git add 'app/admin/(dashboard)/popup/page.tsx' app/admin/actions.ts app/admin/site-popup.test.mjs
git commit -m "Add popup CMS editor"
```

---

### Task 4: Accessible Public Popup

**Files:**
- Create: `components/site/site-popup.tsx`
- Create: `components/site/site-popup.test.mjs`
- Modify: `app/[locale]/(site)/layout.tsx`

**Interfaces:**
- Consumes: `SitePopupConfig`, `createSitePopupVersion`, `isSitePopupActive`, `isSitePopupDismissed`, and `sitePopupStorageKeys`.
- Produces: `SitePopup({config, locale}: {config: SitePopupConfig; locale: Locale})`.
- Stores only the current version string under version-scoped `daeho.sitePopup.session.*` or `daeho.sitePopup.dismissed.*` keys.

- [ ] **Step 1: Write the failing public integration contract test**

Create `components/site/site-popup.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./site-popup.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../../app/[locale]/(site)/layout.tsx', import.meta.url), 'utf8');

test('public locale layout mounts one popup with CMS config', () => {
  assert.ok(layout.includes("import {SitePopup}"));
  assert.ok(layout.includes('<SitePopup config={messages.sitePopup} locale={locale as Locale} />'));
});

test('popup applies active and dismissal rules before opening', () => {
  assert.ok(source.includes('isSitePopupActive(config)'));
  assert.ok(source.includes('createSitePopupVersion(config)'));
  assert.ok(source.includes('isSitePopupDismissed'));
  assert.ok(source.includes('sessionStorage.getItem'));
  assert.ok(source.includes('localStorage.getItem'));
});

test('popup supports persistent dismissal and accessible closing', () => {
  assert.ok(source.includes('sessionStorage.setItem'));
  assert.ok(source.includes('localStorage.setItem'));
  assert.ok(source.includes('role="dialog"'));
  assert.ok(source.includes('aria-modal="true"'));
  assert.ok(source.includes("event.key === 'Escape'"));
  assert.ok(source.includes("event.key !== 'Tab'"));
  assert.ok(source.includes("document.body.style.overflow = 'hidden'"));
  assert.ok(source.includes('onError={closeWithoutSaving}'));
  assert.ok(source.includes('object-contain'));
});
```

- [ ] **Step 2: Run the test and verify the missing component failure**

Run:

```bash
node --test components/site/site-popup.test.mjs
```

Expected: FAIL with `ENOENT` for `site-popup.tsx`.

- [ ] **Step 3: Implement the popup component**

Create `components/site/site-popup.tsx` as a client component with:

```tsx
'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Locale} from '@/i18n/routing';
import {
  createSitePopupVersion,
  isSitePopupActive,
  isSitePopupDismissed,
  sitePopupStorageKeys,
  type SitePopupConfig
} from '@/lib/site-popup-core.mjs';
import {imageSrc} from '@/lib/image-src';

export function SitePopup({config, locale}: {config: SitePopupConfig; locale: Locale}) {
  const version = useMemo(() => createSitePopupVersion(config), [config]);
  const [open, setOpen] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const labels = locale === 'ko'
    ? {close: '팝업 닫기', never: '다시 보지 않기', dialog: '공지 팝업'}
    : {close: 'Close popup', never: 'Do not show again', dialog: 'Announcement popup'};

  useEffect(() => {
    if (!isSitePopupActive(config)) return;
    const keys = sitePopupStorageKeys(version);
    let sessionValue: string | null = null;
    let persistentValue: string | null = null;
    try {
      sessionValue = window.sessionStorage.getItem(keys.session);
      persistentValue = window.localStorage.getItem(keys.persistent);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
    if (!isSitePopupDismissed(version, sessionValue, persistentValue)) setOpen(true);
  }, [config, version]);

  const closeWithoutSaving = useCallback(() => {
    setOpen(false);
  }, []);

  const closePopup = useCallback(() => {
    const keys = sitePopupStorageKeys(version);
    try {
      if (neverShow) {
        window.localStorage.setItem(keys.persistent, version);
      } else {
        window.sessionStorage.setItem(keys.session, version);
      }
    } catch {
      // The in-memory open state still closes the popup.
    }
    setOpen(false);
  }, [neverShow, version]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopup();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, input:not([disabled])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closePopup, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 md:p-8"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        className="relative flex max-h-[90dvh] max-w-[92vw] flex-col bg-white p-2 shadow-2xl md:p-3"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label={labels.close}
          onClick={closePopup}
          className="absolute right-2 top-2 z-10 grid size-11 place-items-center bg-white/95 text-2xl text-[#101827] shadow"
        >
          ×
        </button>
        <img
          src={imageSrc(config.image)}
          alt=""
          onError={closeWithoutSaving}
          className="max-h-[75dvh] max-w-[88vw] object-contain"
        />
        <label className="flex min-h-11 items-center gap-2 px-2 pt-2 text-sm font-semibold text-[#101827]">
          <input
            type="checkbox"
            checked={neverShow}
            onChange={(event) => setNeverShow(event.target.checked)}
            className="size-4 accent-[#7a2230]"
          />
          <span>{labels.never}</span>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount the popup once in the public layout**

Import and render in `app/[locale]/(site)/layout.tsx`:

```tsx
import {SitePopup} from '@/components/site/site-popup';
```

Inside `AnalyticsProvider`, before `.site-cursor-scope`:

```tsx
<SitePopup config={messages.sitePopup} locale={locale as Locale} />
```

- [ ] **Step 5: Run public popup and core tests**

Run:

```bash
node --test components/site/site-popup.test.mjs lib/site-popup-core.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the public popup**

```bash
git add components/site/site-popup.tsx components/site/site-popup.test.mjs 'app/[locale]/(site)/layout.tsx'
git commit -m "Show scheduled popup across public pages"
```

---

### Task 5: Full Local Verification

**Files:**
- Modify only if verification finds a popup-specific defect: files created or modified in Tasks 1-4.

**Interfaces:**
- Consumes the complete CMS and public popup flow.
- Produces a release candidate that passes automated and visual checks.

- [ ] **Step 1: Run all popup-focused tests**

```bash
node --test lib/site-popup-core.test.mjs app/admin/site-popup.test.mjs components/site/site-popup.test.mjs
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the complete Node test suite**

```bash
node --test
```

Expected: all repository tests PASS. Existing unrelated warnings may remain, but no test may fail.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: zero errors. If the new `<img>` produces `@next/next/no-img-element`, add a single local ESLint disable comment explaining that intrinsic CMS image dimensions are unknown and uncropped display is required; do not disable the rule globally.

- [ ] **Step 4: Run the production build**

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Rebuild the local website containers**

```bash
HTTP_PORT=18180 docker compose -p daeho-local up -d --build next nginx
```

Expected: `next` and `nginx` are healthy and `http://localhost:18180` responds.

- [ ] **Step 6: Configure a temporary active popup through the local CMS**

Use `/admin/popup` to:

- Upload or select a test image.
- Enable the popup.
- Set a start time five minutes before the current Korea time.
- Set an end time at least one hour later.
- Save and confirm the success message.

Expected: the same saved values remain after refresh, and no duplicate Korean/English fields are shown.

- [ ] **Step 7: Verify desktop and mobile behavior**

Use the in-app browser at desktop `1440×900` and mobile `390×844`:

- Visit `/ko`, `/ko/heritage/achievement`, and `/en`.
- Confirm one popup appears on each fresh browser session.
- Confirm the image is complete, not cropped, and within the viewport.
- Confirm background scrolling is locked.
- Confirm `Escape`, close button, and backdrop each close the popup.
- Confirm ordinary close stays hidden during same-session route changes and returns in a new context.
- Confirm “Do not show again” survives reload and a new browser context with preserved local storage.
- Change the popup end time by one minute and confirm the new version appears.
- Confirm no console errors or horizontal overflow.

- [ ] **Step 8: Verify invalid and inactive configurations**

In the CMS:

- Enable without an image: expect the localized image-required error.
- Enable without both times: expect the localized schedule-required error.
- Set end before start: expect the localized ordering error.
- Disable and save: expect no popup on any public route.
- Set a future start: expect no popup.
- Set an expired end: expect no popup.

- [ ] **Step 9: Commit only verification fixes if needed**

If verification required code changes:

```bash
git add lib/site-popup-core.mjs lib/site-popup-core.d.ts lib/site-popup-core.test.mjs app/admin/site-popup.test.mjs 'app/admin/(dashboard)/popup/page.tsx' app/admin/actions.ts components/site/site-popup.tsx components/site/site-popup.test.mjs 'app/[locale]/(site)/layout.tsx' lib/cms/page-catalog.json messages/ko.json messages/en.json lib/admin-i18n.ts app/admin/_components/admin-shell.tsx 'app/admin/(dashboard)/pages/[pageKey]/page.tsx'
git commit -m "Fix popup verification issues"
```

Expected: unrelated modified files and `output/`, `outputs/`, and `tmp/` remain unstaged.

---

### Task 6: Push, Deploy, and Production Verification

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes the verified commits on the current `main` branch.
- Produces a production deployment at `https://daeho.works`.

- [ ] **Step 1: Confirm release state**

```bash
git branch --show-current
git status --short
git log -5 --oneline
```

Expected: branch is `main`; popup commits are present; unrelated dirty files may remain but no popup file is uncommitted.

- [ ] **Step 2: Push the current branch**

```bash
git push origin main
```

Expected: `main -> main` succeeds.

- [ ] **Step 3: Deploy the pushed commit to AWS Lightsail**

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 'cd /home/ubuntu/daeho-site && git fetch origin main && git checkout main && git reset --hard origin/main && sudo docker compose -p daeho-prod up -d --build next nginx'
```

Expected: `daeho-prod-next-1` and `daeho-prod-nginx-1` are recreated or running successfully. Existing `postgres`, `cms-api`, and `backup` services remain available.

- [ ] **Step 4: Verify the production CMS**

At `https://daeho.works/admin/popup`:

- Confirm the dedicated sidebar item and settings page load.
- Select a production notice image from S3 media or upload it locally.
- Enter the intended August start/end times in Korea time.
- Save first with display disabled and confirm persistence.
- Enable only when the approved notice and schedule are ready.

- [ ] **Step 5: Verify the production public site**

In a clean browser context:

- Verify `/ko`, one nested Korean route, and `/en`.
- Confirm schedule, close, same-session suppression, persistent suppression, keyboard behavior, mobile layout, and image integrity.
- Confirm the browser console has zero new errors.
- Confirm `https://daeho.works/admin` never renders the public popup.

- [ ] **Step 6: Record the deployed commit**

```bash
git rev-parse --short HEAD
```

Expected: report this exact commit to the user together with test, build, local visual, and production verification results.
