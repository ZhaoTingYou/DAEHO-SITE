# CMS External Sites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded, globally hidden DAEHO/OH/VULCAN links with one CMS-managed list shared by the desktop header, mobile header, and footer.

**Architecture:** Store locale-shaped external-site arrays in the existing `common` CMS page, but edit them through one dedicated bilingual CMS component. A pure shared module validates and aligns submitted Korean/English labels with shared IDs, URLs, enabled states, and ordering; front-end components consume only normalized visible HTTP(S) links.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, TypeScript, Node.js built-in test runner, existing CMS page repository and server actions.

## Global Constraints

- Header desktop, header mobile, and footer must use the same CMS list.
- Korean and English share item IDs, URLs, enabled states, and order; only labels are localized.
- CMS must support add, delete, edit, enable/disable, and move up/down.
- Only enabled entries with a valid `http://` or `https://` URL and a non-empty localized label render publicly.
- DAEHO, OH, and VULCAN remain as initial disabled records with empty URLs.
- Do not change the existing header/footer visual language beyond replacing fixed entries with a dynamic list.
- Preserve unrelated working-tree changes and temporary directories.

---

## File Structure

- Create `lib/cms/external-sites-core.mjs`: pure validation, submission normalization, and public visibility filtering.
- Create `lib/cms/external-sites-core.d.ts`: TypeScript interfaces for the JavaScript core module.
- Create `lib/cms/external-sites-core.test.mjs`: behavioral tests for shared fields, localized labels, URL validation, and visibility.
- Create `app/admin/_components/external-sites-editor.tsx`: unified bilingual dynamic-list editor and serialized form payload.
- Create `app/admin/external-sites-editor.test.mjs`: CMS integration/source contract tests.
- Create `components/site/external-sites-cms.test.mjs`: public header/footer integration/source contract tests.
- Modify `messages/ko.json` and `messages/en.json`: add the disabled default list.
- Modify `app/admin/actions.ts`: normalize the dedicated editor payload into the Korean and English `common` page content.
- Modify `app/admin/(dashboard)/footer/page.tsx`: replace fixed external-site fields with the dedicated editor.
- Modify `lib/admin-i18n.ts`: add editor labels in Chinese, English, and Korean.
- Modify `components/site/site-header.tsx`: render the visible dynamic list on desktop and mobile.
- Modify `components/site/site-footer.tsx`: render the same visible dynamic list.
- Modify `lib/config.ts`: remove the obsolete static `externalLinks` export once no code imports it.

---

### Task 1: Pure external-site validation and normalization

**Files:**
- Create: `lib/cms/external-sites-core.mjs`
- Create: `lib/cms/external-sites-core.d.ts`
- Create: `lib/cms/external-sites-core.test.mjs`

**Interfaces:**
- Consumes: JSON-compatible values from CMS storage and the admin form.
- Produces:
  - `parseExternalSitesSubmission(raw: string): {ko: ExternalSiteItem[]; en: ExternalSiteItem[]}`
  - `getVisibleExternalSites(value: unknown): ExternalSiteItem[]`
  - `isValidExternalSiteHref(value: unknown): boolean`

- [ ] **Step 1: Write failing behavioral tests**

```js
test('submission shares IDs, URLs, state, and order while preserving localized labels', () => {
  const result = parseExternalSitesSubmission(JSON.stringify([
    {id: 'oh', labelKo: '오에이치', labelEn: 'OH', href: 'https://oh.example', enabled: true},
    {id: 'vulcan', labelKo: '불칸', labelEn: 'VULCAN', href: '', enabled: false}
  ]));

  assert.deepEqual(result.ko[0], {
    id: 'oh',
    label: '오에이치',
    href: 'https://oh.example/',
    enabled: true
  });
  assert.deepEqual(result.en[0], {
    id: 'oh',
    label: 'OH',
    href: 'https://oh.example/',
    enabled: true
  });
  assert.deepEqual(result.ko.map((item) => item.id), result.en.map((item) => item.id));
});

test('unsafe non-empty URLs are rejected', () => {
  assert.throws(
    () => parseExternalSitesSubmission(JSON.stringify([
      {id: 'bad', labelKo: '나쁨', labelEn: 'Bad', href: 'javascript:alert(1)', enabled: true}
    ])),
    /http/i
  );
});

test('public filtering keeps only enabled HTTP(S) entries with labels', () => {
  assert.deepEqual(
    getVisibleExternalSites([
      {id: 'on', label: 'ON', href: 'https://example.com/path', enabled: true},
      {id: 'off', label: 'OFF', href: 'https://off.example', enabled: false},
      {id: 'unsafe', label: 'BAD', href: 'javascript:alert(1)', enabled: true}
    ]),
    [{id: 'on', label: 'ON', href: 'https://example.com/path', enabled: true}]
  );
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run:

```bash
node --test lib/cms/external-sites-core.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the pure module**

```js
export function isValidExternalSiteHref(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseExternalSitesSubmission(raw) {
  const submitted = JSON.parse(raw);
  if (!Array.isArray(submitted)) throw new Error('External sites must be an array.');

  const ids = new Set();
  const rows = submitted.map((row) => {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!id || ids.has(id)) throw new Error('External site IDs must be unique.');
    ids.add(id);

    const hrefInput = typeof row.href === 'string' ? row.href.trim() : '';
    if (hrefInput && !isValidExternalSiteHref(hrefInput)) {
      throw new Error('External site URL must use http:// or https://.');
    }

    const href = hrefInput ? new URL(hrefInput).toString() : '';
    const labelKo = typeof row.labelKo === 'string' ? row.labelKo.trim() : '';
    const labelEn = typeof row.labelEn === 'string' ? row.labelEn.trim() : '';
    return {id, href, enabled: row.enabled === true, labelKo, labelEn};
  });

  return {
    ko: rows.map(({id, href, enabled, labelKo, labelEn}) => ({
      id, href, enabled, label: labelKo || labelEn
    })),
    en: rows.map(({id, href, enabled, labelKo, labelEn}) => ({
      id, href, enabled, label: labelEn || labelKo
    }))
  };
}

export function getVisibleExternalSites(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: typeof item?.id === 'string' ? item.id.trim() : '',
      label: typeof item?.label === 'string' ? item.label.trim() : '',
      href: typeof item?.href === 'string' ? item.href.trim() : '',
      enabled: item?.enabled === true
    }))
    .filter((item) => item.id && item.label && item.enabled && isValidExternalSiteHref(item.href));
}
```

- [ ] **Step 4: Add matching TypeScript declarations**

```ts
export type ExternalSiteItem = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
};

export type SubmittedExternalSiteItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  enabled: boolean;
};

export function parseExternalSitesSubmission(raw: string): {
  ko: ExternalSiteItem[];
  en: ExternalSiteItem[];
};
export function getVisibleExternalSites(value: unknown): ExternalSiteItem[];
export function isValidExternalSiteHref(value: unknown): boolean;
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
node --test lib/cms/external-sites-core.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add lib/cms/external-sites-core.mjs lib/cms/external-sites-core.d.ts lib/cms/external-sites-core.test.mjs
git commit -m "Add external site normalization"
```

---

### Task 2: Persist shared external-site configuration in the common CMS page

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `app/admin/actions.ts`
- Test: `app/admin/external-sites-editor.test.mjs`

**Interfaces:**
- Consumes: `parseExternalSitesSubmission()` from Task 1 and form field `externalSites.payload`.
- Produces: synchronized arrays at `footer.externalSites.items` in both locale payloads.

- [ ] **Step 1: Add failing integration tests**

```js
test('both fallback locales contain aligned disabled defaults', () => {
  const ko = readJson('messages/ko.json').common.footer.externalSites.items;
  const en = readJson('messages/en.json').common.footer.externalSites.items;
  assert.deepEqual(ko.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.deepEqual(en.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.ok([...ko, ...en].every((item) => item.href === '' && item.enabled === false));
});

test('common page save synchronizes the dedicated external-sites payload', () => {
  const actions = readText('app/admin/actions.ts');
  assert.match(actions, /formData\.has\('externalSites\.payload'\)/);
  assert.match(actions, /parseExternalSitesSubmission/);
  assert.match(actions, /footer\.externalSites\.items/);
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run:

```bash
node --test app/admin/external-sites-editor.test.mjs
```

Expected: FAIL because the defaults and save hook do not exist.

- [ ] **Step 3: Add aligned fallback arrays**

Add this shape under both locale files’ existing `common.footer.externalSites` objects:

```json
"items": [
  {"id": "daeho", "label": "대호", "href": "", "enabled": false},
  {"id": "oh", "label": "OH", "href": "", "enabled": false},
  {"id": "vulcan", "label": "VULCAN", "href": "", "enabled": false}
]
```

Use `DAEHO`, `OH`, and `VULCAN` for the English labels.

- [ ] **Step 4: Normalize the dedicated payload before schema validation**

In `savePageAction`, after reading `contentKo` and `contentEn`, add:

```ts
if (pageKey === 'common' && formData.has('externalSites.payload')) {
  const externalSites = parseExternalSitesSubmission(
    stringFromForm(formData, 'externalSites.payload')
  );
  setObjectValueAtPath(contentKo, 'footer.externalSites.items', externalSites.ko);
  setObjectValueAtPath(contentEn, 'footer.externalSites.items', externalSites.en);
}
```

Import `parseExternalSitesSubmission` from `@/lib/cms/external-sites-core.mjs`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test lib/cms/external-sites-core.test.mjs app/admin/external-sites-editor.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add messages/ko.json messages/en.json app/admin/actions.ts app/admin/external-sites-editor.test.mjs
git commit -m "Persist CMS external site settings"
```

---

### Task 3: Build the unified bilingual CMS editor

**Files:**
- Create: `app/admin/_components/external-sites-editor.tsx`
- Modify: `app/admin/(dashboard)/footer/page.tsx`
- Modify: `lib/admin-i18n.ts`
- Test: `app/admin/external-sites-editor.test.mjs`

**Interfaces:**
- Consumes: Korean and English `ExternalSiteItem[]` from the footer page.
- Produces: one hidden JSON form field named `externalSites.payload`.

- [ ] **Step 1: Expand the failing editor contract test**

```js
test('footer CMS exposes one bilingual dynamic editor', () => {
  const editor = readText('app/admin/_components/external-sites-editor.tsx');
  const footerPage = readText('app/admin/(dashboard)/footer/page.tsx');
  assert.match(editor, /name="externalSites\.payload"/);
  assert.match(editor, /setItems/);
  assert.match(editor, /addItem/);
  assert.match(editor, /removeItem/);
  assert.match(editor, /moveItem/);
  assert.match(editor, /type="checkbox"/);
  assert.match(footerPage, /<ExternalSitesEditor/);
  assert.doesNotMatch(footerPage, /'footer\.externalSites\.daeho'/);
});
```

- [ ] **Step 2: Run the editor test and verify it fails**

Run:

```bash
node --test app/admin/external-sites-editor.test.mjs
```

Expected: FAIL because `ExternalSitesEditor` does not exist.

- [ ] **Step 3: Implement the client editor**

Create a client component with this state boundary:

```tsx
'use client';

type EditorItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  enabled: boolean;
};

export function ExternalSitesEditor({itemsKo, itemsEn, labels}: Props) {
  const [items, setItems] = useState(() => alignExternalSiteItems(itemsKo, itemsEn));
  const addItem = () => setItems((current) => [...current, {
    id: crypto.randomUUID(),
    labelKo: '',
    labelEn: '',
    href: '',
    enabled: false
  }]);
  const removeItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));
  const moveItem = (index: number, offset: -1 | 1) =>
    setItems((current) => reorder(current, index, index + offset));

  return (
    <section className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-5">
      <input
        type="hidden"
        name="externalSites.payload"
        value={JSON.stringify(items)}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
            {labels.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#98a2b3]">{labels.description}</p>
        </div>
        <button type="button" onClick={addItem}>{labels.add}</button>
      </div>
      {items.length === 0 ? <p>{labels.empty}</p> : null}
      {items.map((item, index) => (
        <div key={item.id} className="grid gap-3 rounded-md border border-[#eef2f6] p-4">
          <input
            aria-label={labels.labelKo}
            value={item.labelKo}
            onChange={(event) => updateItem(item.id, {labelKo: event.target.value})}
          />
          <input
            aria-label={labels.labelEn}
            value={item.labelEn}
            onChange={(event) => updateItem(item.id, {labelEn: event.target.value})}
          />
          <input
            aria-label={labels.href}
            inputMode="url"
            value={item.href}
            onChange={(event) => updateItem(item.id, {href: event.target.value})}
          />
          <label>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) => updateItem(item.id, {enabled: event.target.checked})}
            />
            {labels.enabled}
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)}>
              {labels.moveUp}
            </button>
            <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>
              {labels.moveDown}
            </button>
            <button type="button" onClick={() => removeItem(item.id)}>
              {labels.remove}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
```

Add these exact helpers in the same component:

```tsx
const updateItem = (id: string, patch: Partial<EditorItem>) =>
  setItems((current) => current.map((item) => item.id === id ? {...item, ...patch} : item));

function reorder(items: EditorItem[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
```

- [ ] **Step 4: Mount one editor above the two locale panels**

In the footer page:

```tsx
function externalSiteItems(content: unknown): ExternalSiteItem[] {
  const value = getObjectValueAtPath(content, 'footer.externalSites.items');
  return Array.isArray(value) ? value as ExternalSiteItem[] : [];
}

const koMain = localeData.find((data) => data.locale === 'ko')
  ?.groups.find((group) => group.key === mainGroupKey)?.content;
const enMain = localeData.find((data) => data.locale === 'en')
  ?.groups.find((group) => group.key === mainGroupKey)?.content;

<ExternalSitesEditor
  itemsKo={externalSiteItems(koMain)}
  itemsEn={externalSiteItems(enMain)}
  labels={{
    title: t('externalSites.title'),
    add: t('externalSites.add'),
    labelKo: t('externalSites.labelKo'),
    labelEn: t('externalSites.labelEn'),
    href: t('externalSites.href'),
    enabled: t('externalSites.enabled'),
    moveUp: t('externalSites.moveUp'),
    moveDown: t('externalSites.moveDown'),
    remove: t('externalSites.remove'),
    empty: t('externalSites.empty')
  }}
/>
```

Remove the three fixed external-site paths from `footerFieldSections`.

- [ ] **Step 5: Add all editor translations**

Add the following keys to the Chinese, English, and Korean maps in `lib/admin-i18n.ts`:

```ts
'externalSites.title'
'externalSites.description'
'externalSites.add'
'externalSites.labelKo'
'externalSites.labelEn'
'externalSites.href'
'externalSites.enabled'
'externalSites.moveUp'
'externalSites.moveDown'
'externalSites.remove'
'externalSites.empty'
```

- [ ] **Step 6: Run focused tests and lint changed files**

Run:

```bash
node --test app/admin/external-sites-editor.test.mjs
npx eslint app/admin/_components/external-sites-editor.tsx 'app/admin/(dashboard)/footer/page.tsx' app/admin/actions.ts lib/admin-i18n.ts
```

Expected: tests PASS and ESLint exits 0.

- [ ] **Step 7: Commit Task 3**

```bash
git add app/admin/_components/external-sites-editor.tsx 'app/admin/(dashboard)/footer/page.tsx' lib/admin-i18n.ts app/admin/external-sites-editor.test.mjs
git commit -m "Add CMS external sites editor"
```

---

### Task 4: Render the shared list in header and footer

**Files:**
- Modify: `components/site/site-header.tsx`
- Modify: `components/site/site-footer.tsx`
- Modify: `lib/config.ts`
- Create: `components/site/external-sites-cms.test.mjs`

**Interfaces:**
- Consumes: `getVisibleExternalSites()` from Task 1 and `common.footer.externalSites.items`.
- Produces: identical visible item order in desktop header, mobile header, and footer.

- [ ] **Step 1: Write failing public integration tests**

```js
test('header and footer consume the CMS external-site array', () => {
  assert.match(header, /footerText\.raw\('externalSites\.items'\)/);
  assert.match(header, /getVisibleExternalSites/);
  assert.match(footer, /getVisibleExternalSites\(text\.footer\.externalSites\.items\)/);
  assert.doesNotMatch(header, /showExternalHeaderLinks/);
  assert.doesNotMatch(footer, /showFooterExternalLinks/);
  assert.doesNotMatch(header, /externalLinks\./);
  assert.doesNotMatch(footer, /externalLinks\./);
});

test('all public positions iterate the same visible list', () => {
  assert.ok((header.match(/visibleExternalSites\.map/g) ?? []).length >= 2);
  assert.ok((footer.match(/visibleExternalSites\.map/g) ?? []).length >= 1);
});
```

- [ ] **Step 2: Run the public test and verify it fails**

Run:

```bash
node --test components/site/external-sites-cms.test.mjs
```

Expected: FAIL because public components still use hard-coded entries and flags.

- [ ] **Step 3: Replace the desktop and mobile header blocks**

Read and normalize once:

```tsx
const visibleExternalSites = getVisibleExternalSites(
  footerText.raw('externalSites.items')
);
```

Render both header positions with:

```tsx
{visibleExternalSites.length > 0 ? (
  <>
    <div className="flex items-center gap-4">
      {visibleExternalSites.map((item) => (
        <ExternalSiteLink
          key={item.id}
          label={item.label}
          href={item.href}
          className="site-nav-link no-underline"
        />
      ))}
    </div>
    <span className="h-3 w-px bg-current opacity-25" aria-hidden="true" />
  </>
) : null}
```

Use the same array in the mobile block and retain its existing mobile layout classes.

- [ ] **Step 4: Replace the footer block**

```tsx
const visibleExternalSites = getVisibleExternalSites(
  text.footer.externalSites.items
);

{visibleExternalSites.length > 0 ? (
  <div>
    <p className="footer-label">{text.footer.otherSites}</p>
    <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
      {visibleExternalSites.map((item) => (
        <ExternalSiteLink
          key={item.id}
          label={item.label}
          href={item.href}
          className="footer-link"
        />
      ))}
    </div>
  </div>
) : null}
```

Update the locale-column class condition to use `visibleExternalSites.length > 0`.

- [ ] **Step 5: Remove obsolete static configuration**

Delete `externalLinks` imports from both components. Remove the export from `lib/config.ts`; delete the file only if it becomes empty and no other code imports it.

- [ ] **Step 6: Run focused tests and lint**

Run:

```bash
node --test lib/cms/external-sites-core.test.mjs app/admin/external-sites-editor.test.mjs components/site/external-sites-cms.test.mjs components/site/site-footer-cms.test.mjs
npx eslint components/site/site-header.tsx components/site/site-footer.tsx
```

Expected: all tests PASS and ESLint exits 0.

- [ ] **Step 7: Commit Task 4**

```bash
git add components/site/site-header.tsx components/site/site-footer.tsx components/site/external-sites-cms.test.mjs lib/config.ts
git commit -m "Render CMS external site links"
```

---

### Task 5: Full verification and documentation consistency

**Files:**
- Modify: `README.md`
- Verify: all files changed in Tasks 1–4

**Interfaces:**
- Consumes: completed feature from Tasks 1–4.
- Produces: a buildable, regression-tested feature ready for deployment.

- [ ] **Step 1: Update stale README behavior**

Replace documentation that says `showExternalHeaderLinks = false` or instructs editing `lib/config.ts` with the actual CMS workflow:

```md
External official-site links are managed in **CMS → Footer → External sites**.
Each item has Korean and English labels plus one shared URL, enabled state,
and order. Enabled valid HTTP(S) entries appear in desktop/mobile headers
and the footer.
```

- [ ] **Step 2: Run the complete Node test suite**

Run:

```bash
node --test
```

Expected: all tests PASS.

- [ ] **Step 3: Run project lint**

Run:

```bash
npm run lint
```

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only intended external-site feature files plus pre-existing unrelated changes are present.

- [ ] **Step 6: Commit documentation or final corrections**

```bash
git add README.md
git commit -m "Document CMS external site management"
```

Skip this commit only when README already reflects the new behavior and no final correction is needed.
