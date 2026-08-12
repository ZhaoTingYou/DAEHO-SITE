# Contact B2B Direct Phone Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual, CMS-editable B2B direct-phone notice above the Contact form with only the phone number rendered in the site's brand red.

**Architecture:** Store the notice as a `contact.directPhone` object with `before`, `phone`, and `after` strings in each locale. Register those paths in the existing Contact CMS page catalog, then render them through a focused `ContactDirectPhoneNotice` component before `ContactForm`; the component owns empty-state handling, the single inter-fragment space before the phone, and phone-only accent styling.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS utilities, JSON-backed localized CMS content, Node.js `node:test` source-contract tests.

## Global Constraints

- Render the notice inside the right-hand Contact form card and before the first form field.
- Use `14px` text on desktop and `16px` text on mobile.
- Use normal Contact-page text color for surrounding copy and existing `text-accent` brand red only for the phone number.
- Korean and English values must be independently editable from the existing Contact CMS editor.
- Default Korean visible output must be `B2B 주문 및 기업 고객은 직통전화 010 4325 0369로도 상담하실 수 있습니다.`
- Default English visible output must be `B2B orders and corporate customers can also reach us directly at 010 4325 0369.`
- Omit the entire notice when all three values are empty; tolerate any individual empty value.
- Do not add click-to-call behavior, rich text, database schema changes, inquiry payload changes, analytics changes, or unrelated refactors.
- Preserve all unrelated changes already present in the worktree and stage only files named by this plan.

## File map

- Create `lib/cms/contact-direct-phone-notice-cms.test.mjs`: contract tests for localized defaults, CMS field registration, and the static CMS preview.
- Modify `messages/ko.json`: Korean `contact.directPhone` defaults.
- Modify `messages/en.json`: English `contact.directPhone` defaults.
- Modify `lib/cms/page-catalog.json`: three editable fields in the Contact `main` group.
- Modify `data/cms-preview.json`: Korean and English Contact snapshot values for frontend-only builds.
- Create `components/forms/contact-direct-phone-notice.test.mjs`: source contract for component behavior, styles, and page placement.
- Create `components/forms/contact-direct-phone-notice.tsx`: focused presentation component.
- Modify `app/[locale]/(site)/contact/page.tsx`: render the notice before `ContactForm`.

---

### Task 1: Add the localized CMS content contract

**Files:**
- Create: `lib/cms/contact-direct-phone-notice-cms.test.mjs`
- Modify: `messages/ko.json:1599-1621`
- Modify: `messages/en.json:1599-1621`
- Modify: `lib/cms/page-catalog.json:698-725`
- Modify: `data/cms-preview.json:72-79`

**Interfaces:**
- Consumes: the existing `contact` locale-message object, Contact page catalog definition, and `cms_pages` static snapshot rows.
- Produces: `contact.directPhone: {before: string; phone: string; after: string}` for both locales and editable CMS paths `directPhone.before`, `directPhone.phone`, and `directPhone.after` in group `main`.

- [ ] **Step 1: Write the failing CMS contract test**

Create `lib/cms/contact-direct-phone-notice-cms.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));
const pageCatalog = JSON.parse(readFileSync(new URL('./page-catalog.json', import.meta.url), 'utf8'));
const cmsPreview = JSON.parse(readFileSync(new URL('../../data/cms-preview.json', import.meta.url), 'utf8'));

const expectedKo = {
  before: 'B2B 주문 및 기업 고객은 직통전화',
  phone: '010 4325 0369',
  after: '로도 상담하실 수 있습니다.'
};

const expectedEn = {
  before: 'B2B orders and corporate customers can also reach us directly at',
  phone: '010 4325 0369',
  after: '.'
};

test('Contact direct-phone notice has bilingual defaults', () => {
  assert.deepEqual(koMessages.contact.directPhone, expectedKo);
  assert.deepEqual(enMessages.contact.directPhone, expectedEn);
});

test('Contact CMS exposes each direct-phone notice fragment in the main group', () => {
  const contactDefinition = pageCatalog.find((page) => page.pageKey === 'contact');
  const mainPaths = contactDefinition.fields
    .filter((field) => field.groupKey === 'main')
    .map((field) => field.path);

  assert.ok(mainPaths.includes('directPhone.before'));
  assert.ok(mainPaths.includes('directPhone.phone'));
  assert.ok(mainPaths.includes('directPhone.after'));
});

test('frontend-only Contact snapshot carries the bilingual direct-phone notice', () => {
  const contactPage = cmsPreview.tables.cms_pages.find((page) => page.page_key === 'contact');
  const koContent = JSON.parse(contactPage.content_ko);
  const enContent = JSON.parse(contactPage.content_en);

  assert.deepEqual(koContent.__groups.main.directPhone, expectedKo);
  assert.deepEqual(enContent.__groups.main.directPhone, expectedEn);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test lib/cms/contact-direct-phone-notice-cms.test.mjs
```

Expected: three failing subtests because `contact.directPhone`, the CMS paths, and the preview values do not exist.

- [ ] **Step 3: Add the minimal localized defaults**

Add this sibling after `contact.hero` in `messages/ko.json`:

```json
"directPhone": {
  "before": "B2B 주문 및 기업 고객은 직통전화",
  "phone": "010 4325 0369",
  "after": "로도 상담하실 수 있습니다."
},
```

Add this sibling after `contact.hero` in `messages/en.json`:

```json
"directPhone": {
  "before": "B2B orders and corporate customers can also reach us directly at",
  "phone": "010 4325 0369",
  "after": "."
},
```

- [ ] **Step 4: Register the three CMS fields**

Add these fields after `hero.body` in the Contact definition in `lib/cms/page-catalog.json`:

```json
{"groupKey": "main", "path": "directPhone.before", "label": "B2B 直通电话前文案"},
{"groupKey": "main", "path": "directPhone.phone", "label": "B2B 直通电话号码"},
{"groupKey": "main", "path": "directPhone.after", "label": "B2B 直通电话后文案"},
```

These fields remain ordinary text fields; no page-editor component changes are required.

- [ ] **Step 5: Update the static Contact preview row**

Inside the Contact row's `content_ko` `__groups.main` JSON string in `data/cms-preview.json`, add:

```json
"directPhone":{"before":"B2B 주문 및 기업 고객은 직통전화","phone":"010 4325 0369","after":"로도 상담하실 수 있습니다."}
```

Inside the same row's `content_en` `__groups.main` JSON string, add:

```json
"directPhone":{"before":"B2B orders and corporate customers can also reach us directly at","phone":"010 4325 0369","after":"."}
```

Keep both outer snapshot strings valid escaped JSON.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
node --test lib/cms/contact-direct-phone-notice-cms.test.mjs
```

Expected: `3` tests pass, `0` fail.

- [ ] **Step 7: Validate every edited JSON file**

Run:

```bash
node -e "for (const file of ['messages/ko.json','messages/en.json','lib/cms/page-catalog.json','data/cms-preview.json']) JSON.parse(require('node:fs').readFileSync(file,'utf8')); console.log('JSON OK')"
```

Expected: `JSON OK` with exit code `0`.

- [ ] **Step 8: Commit the CMS content contract**

```bash
git add lib/cms/contact-direct-phone-notice-cms.test.mjs messages/ko.json messages/en.json lib/cms/page-catalog.json data/cms-preview.json
git commit -m "feat: add CMS copy for Contact B2B notice"
```

### Task 2: Render the direct-phone notice above the form

**Files:**
- Create: `components/forms/contact-direct-phone-notice.test.mjs`
- Create: `components/forms/contact-direct-phone-notice.tsx`
- Modify: `app/[locale]/(site)/contact/page.tsx:1-40`

**Interfaces:**
- Consumes: `contact.directPhone: {before: string; phone: string; after: string}` from Task 1.
- Produces: `ContactDirectPhoneNotice({copy}: {copy: ContactDirectPhoneNoticeCopy}): JSX.Element | null`, rendered before `ContactForm`.

- [ ] **Step 1: Write the failing rendering contract test**

Create `components/forms/contact-direct-phone-notice.test.mjs`:

```js
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const componentUrl = new URL('./contact-direct-phone-notice.tsx', import.meta.url);
const contactPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);

test('Contact direct-phone notice omits empty copy and accents only the phone', () => {
  assert.equal(existsSync(componentUrl), true, 'ContactDirectPhoneNotice component should exist');
  const componentSource = readFileSync(componentUrl, 'utf8');

  assert.match(componentSource, /const hasContent = Boolean\(copy\.before \|\| copy\.phone \|\| copy\.after\);/);
  assert.match(componentSource, /if \(!hasContent\) \{\s*return null;\s*\}/);
  assert.ok(componentSource.includes("{copy.before && copy.phone ? ' ' : null}"));
  assert.match(
    componentSource,
    /\{copy\.phone \? <span className="text-accent">\{copy\.phone\}<\/span> : null\}/
  );
  assert.match(componentSource, /text-\[16px\][^"]*md:text-\[14px\]/);
});

test('Contact page places the direct-phone notice before the form', () => {
  assert.ok(
    contactPageSource.includes(
      "import {ContactDirectPhoneNotice} from '@/components/forms/contact-direct-phone-notice';"
    )
  );
  assert.ok(contactPageSource.includes('<ContactDirectPhoneNotice copy={text.directPhone} />'));
  assert.ok(
    contactPageSource.indexOf('<ContactDirectPhoneNotice copy={text.directPhone} />') <
      contactPageSource.indexOf('<ContactForm')
  );
  assert.match(contactPageSource, /space-y-5[^"]*md:space-y-6/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test components/forms/contact-direct-phone-notice.test.mjs
```

Expected: the first subtest fails with `ContactDirectPhoneNotice component should exist`, and the page-integration subtest fails because the import and rendering are absent.

- [ ] **Step 3: Add the minimal presentation component**

Create `components/forms/contact-direct-phone-notice.tsx`:

```tsx
export type ContactDirectPhoneNoticeCopy = {
  before: string;
  phone: string;
  after: string;
};

type ContactDirectPhoneNoticeProps = {
  copy: ContactDirectPhoneNoticeCopy;
};

export function ContactDirectPhoneNotice({copy}: ContactDirectPhoneNoticeProps) {
  const hasContent = Boolean(copy.before || copy.phone || copy.after);

  if (!hasContent) {
    return null;
  }

  return (
    <p className="font-body text-[16px] font-normal leading-7 text-text md:text-[14px] md:leading-6">
      {copy.before}
      {copy.before && copy.phone ? ' ' : null}
      {copy.phone ? <span className="text-accent">{copy.phone}</span> : null}
      {copy.after}
    </p>
  );
}
```

The explicit conditional space is necessary because CMS text values are trimmed when saved. No space is added after the phone so the Korean suffix and English period render correctly.

- [ ] **Step 4: Integrate the component before the Contact form**

In `app/[locale]/(site)/contact/page.tsx`, add:

```tsx
import {ContactDirectPhoneNotice} from '@/components/forms/contact-direct-phone-notice';
```

Replace the form-card `Reveal` block with:

```tsx
<Reveal className="space-y-5 bg-bg p-4 shadow-[0_24px_80px_rgba(16,29,48,0.08)] md:space-y-6 md:p-8">
  <ContactDirectPhoneNotice copy={text.directPhone} />
  <ContactForm copy={messages.forms.contact} defaultType={defaultType} />
</Reveal>
```

- [ ] **Step 5: Run both focused tests and verify GREEN**

Run:

```bash
node --test lib/cms/contact-direct-phone-notice-cms.test.mjs components/forms/contact-direct-phone-notice.test.mjs
```

Expected: `5` tests pass, `0` fail.

- [ ] **Step 6: Run TypeScript checking**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 7: Commit the rendered feature**

```bash
git add components/forms/contact-direct-phone-notice.test.mjs components/forms/contact-direct-phone-notice.tsx 'app/[locale]/(site)/contact/page.tsx'
git commit -m "feat: show Contact B2B phone notice"
```

### Task 3: Verify the complete change

**Files:**
- Verify only; modify feature files from Tasks 1-2 only if a command exposes a defect.

**Interfaces:**
- Consumes: all Task 1 and Task 2 outputs.
- Produces: fresh evidence that the focused behavior, repository tests, lint, frontend-only production build, and four responsive page states are correct.

- [ ] **Step 1: Run the focused contract tests again**

```bash
node --test lib/cms/contact-direct-phone-notice-cms.test.mjs components/forms/contact-direct-phone-notice.test.mjs
```

Expected: `5` tests pass, `0` fail.

- [ ] **Step 2: Run the full Node test suite**

```bash
node --test
```

Expected: all discovered tests pass with `0` failures.

- [ ] **Step 3: Run lint and type checking**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both commands exit `0` without errors.

- [ ] **Step 4: Run the frontend-only production build**

```bash
npm run build:frontend-only
```

Expected: Next.js production build exits `0` and includes both `/ko/contact` and `/en/contact` without CMS connectivity.

- [ ] **Step 5: Verify the pages in a browser**

Run the local server:

```bash
npm run dev
```

Inspect these four states:

- `/ko/contact` at `1440 × 1024`: Korean sentence appears above the form; `010 4325 0369` alone is brand red; computed font size is `14px`.
- `/en/contact` at `1440 × 1024`: English sentence appears above the form; phone styling and `14px` size match Korean.
- `/ko/contact` at `375 × 812`: sentence wraps within the form card without horizontal overflow; computed font size is `16px`.
- `/en/contact` at `375 × 812`: sentence wraps within the form card without horizontal overflow; computed font size is `16px`.

Also open `/admin/pages/contact` in an authenticated CMS session and confirm the Korean and English panels each expose the three direct-phone fields. If no authenticated CMS session is available, record the automated catalog-test result as the CMS verification evidence rather than changing authentication state.

- [ ] **Step 6: Review only the feature diff**

Use the design commit as the fixed point:

```bash
git diff 0c4ef9a...HEAD -- docs/superpowers/plans/2026-08-12-contact-b2b-direct-phone-notice.md lib/cms/contact-direct-phone-notice-cms.test.mjs messages/ko.json messages/en.json lib/cms/page-catalog.json data/cms-preview.json components/forms/contact-direct-phone-notice.test.mjs components/forms/contact-direct-phone-notice.tsx 'app/[locale]/(site)/contact/page.tsx'
```

Check the diff against every Global Constraint and correct only confirmed feature defects. Re-run the affected focused test after every correction, then repeat Steps 1-4 before claiming completion.
