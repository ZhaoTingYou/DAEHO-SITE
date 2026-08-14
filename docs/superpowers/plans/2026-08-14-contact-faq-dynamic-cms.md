# Contact FAQ Dynamic CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the categorized public Contact FAQ together with a dedicated CMS editor that manages shared bilingual categories and aligned Korean/English FAQ content, then merge the verified result to `main` and deploy it to AWS Lightsail.

**Architecture:** A pure FAQ domain module owns public category normalization and legacy fallback. A separate CMS core pairs locale content and validates one bilingual editor payload. A dedicated client editor manages category and FAQ ordering, while the server action writes normalized data into only the Contact main group. The migration and public renderer accept both the new dynamic category arrays and all existing legacy shapes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Node.js ESM and built-in test runner, PostgreSQL through Docker Compose, AWS Lightsail.

## Global Constraints

- Do not add dependencies.
- Keep Contact Hero, form, form submission, SEO, and all non-FAQ CMS content unchanged.
- Keep all Korean FAQ facts and answers; English must remain complete and contain no Korean body copy.
- Korean and English share category IDs, category order, FAQ order, and FAQ category assignments.
- Category labels, questions, and answers remain locale-specific.
- A referenced category cannot be deleted; at least one category must remain.
- All public FAQ answers remain in server-rendered HTML.
- The migration is dry-run by default, backs up before apply, fails closed, and is idempotent.
- Existing English-route visibility continues to follow `englishEnabled`.

---

## File Structure

- `lib/contact-faq-core.mjs` and `.d.mts`: public category normalization, dynamic grouping, and legacy classification.
- `lib/cms/contact-faq-editor-core.mjs` and `.d.mts`: bilingual editor draft pairing, submission validation, and locale output normalization.
- `app/admin/_components/contact-faq-editor.tsx`: the only interactive CMS category/FAQ editor.
- `app/admin/(dashboard)/pages/[pageKey]/page.tsx`: loads paired drafts, renders the editor, and excludes duplicate generic FAQ fields.
- `app/admin/actions.ts`: validates `contactFaq.payload` and replaces only Contact FAQ leaves before save.
- `lib/admin-i18n.ts`: Chinese, English, and Korean editor labels and validation feedback.
- `messages/ko.json` and `messages/en.json`: canonical `faqCategories` and twenty localized FAQ items.
- `components/contact/contact-faq-section.tsx`: renders CMS-defined category order in the approved public layout.
- `lib/cms/contact-faq-migration-core.mjs` and `scripts/migrate-contact-faqs.mjs`: legacy-to-dynamic migration and guarded production apply.
- `lib/cms/page-catalog.json`: leaves Contact FAQ management to the dedicated editor instead of raw or generic fields.

---

### Task 1: Dynamic Public FAQ Domain

**Files:**
- Modify: `lib/contact-faq-core.mjs`
- Modify: `lib/contact-faq-core.d.mts`
- Modify: `lib/contact-faq-core.test.mjs`

**Interfaces:**
- Consumes: legacy `faqCategoryLabels`, optional `faqCategories`, and FAQ items with optional category strings.
- Produces: `normalizeContactFaqCategories(categories, labels)`, `groupContactFaqs(items, categories, otherLabel)`, `ContactFaqCategory`, and `ContactFaqSourceItem`.

- [ ] **Step 1: Write failing dynamic-category tests**

Add cases proving custom categories retain CMS order, legacy fixed labels synthesize the four default categories, and a missing category reference moves only that FAQ to `other`:

```js
const categories = [
  {id: 'consultation', label: 'Consultation'},
  {id: 'vip-gifts', label: 'VIP Gifts'}
];
const groups = groupContactFaqs([
  {category: 'vip-gifts', question: 'VIP?', answer: 'Yes'},
  {category: 'missing', question: 'Unknown?', answer: 'Visible'}
], categories, 'Other');
assert.deepEqual(groups.map(({id}) => id), ['vip-gifts', 'other']);
```

- [ ] **Step 2: Run the domain test and confirm the old signature fails**

Run: `node --test lib/contact-faq-core.test.mjs`

Expected: FAIL because `groupContactFaqs` does not yet accept dynamic category arrays.

- [ ] **Step 3: Implement category normalization and grouping**

Use the category array as the authoritative order, discard invalid/duplicate category definitions, resolve known legacy questions only when the item has no usable category, and append `other` only when needed:

```js
export function normalizeContactFaqCategories(categories, labels = {}) {
  const source = Array.isArray(categories) && categories.length
    ? categories
    : CONTACT_FAQ_CATEGORY_ORDER.map((id) => ({id, label: labels[id]}));
  const seen = new Set();
  return source.flatMap((item) => {
    const id = normalizeCategoryId(item?.id);
    const label = String(item?.label ?? '').trim();
    if (!id || !label || seen.has(id)) return [];
    seen.add(id);
    return [{id, label}];
  });
}
```

- [ ] **Step 4: Publish exact TypeScript contracts**

Define:

```ts
export type ContactFaqCategory = {id: string; label: string};
export type ContactFaqItem = {category: string; question: string; answer: string};
export type LegacyContactFaqItem = Omit<ContactFaqItem, 'category'> & {category?: string};
export function groupContactFaqs(
  items: Array<ContactFaqItem | LegacyContactFaqItem>,
  categories: ContactFaqCategory[],
  otherLabel: string
): ContactFaqGroup[];
```

- [ ] **Step 5: Run the domain tests**

Run: `node --test lib/contact-faq-core.test.mjs`

Expected: all dynamic, legacy, and exceptional `Other` cases PASS.

- [ ] **Step 6: Commit the public domain**

```bash
git add lib/contact-faq-core.mjs lib/contact-faq-core.d.mts lib/contact-faq-core.test.mjs
git commit -m "feat: support dynamic Contact FAQ categories"
```

---

### Task 2: Bilingual CMS Draft And Submission Core

**Files:**
- Create: `lib/cms/contact-faq-editor-core.mjs`
- Create: `lib/cms/contact-faq-editor-core.d.mts`
- Create: `lib/cms/contact-faq-editor-core.test.mjs`

**Interfaces:**
- Consumes: Korean and English Contact main-group content plus a JSON editor payload.
- Produces: `pairContactFaqEditorDrafts(koMain, enMain)`, `parseContactFaqEditorSubmission(value)`, `contactFaqCategoryUsage(draft, categoryId)`, and `moveContactFaqEditorItem(items, index, direction)`.

- [ ] **Step 1: Write failing pairing tests**

Cover fixed legacy labels, dynamic categories, aligned FAQ copy, and an English category/order mismatch repaired from Korean shared structure:

```js
const draft = pairContactFaqEditorDrafts(koMain, enMain);
assert.deepEqual(draft.categories[0], {
  id: 'consultation',
  koLabel: '상담 · 견적',
  enLabel: 'Consultation · Quote'
});
assert.equal(draft.faqs[0].ko.question, koMain.faqs[0].question);
assert.equal(draft.faqs[0].en.question, enMain.faqs[0].question);
```

- [ ] **Step 2: Write failing validation tests**

Assert stable error codes for empty categories, duplicate/unsafe IDs, missing labels, invalid category references, blank bilingual copy, and duplicate questions. Assert successful output contains aligned locale arrays and derived compatibility label records.

- [ ] **Step 3: Run the new core test and confirm the module is missing**

Run: `node --test lib/cms/contact-faq-editor-core.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 4: Implement pure pairing, validation, and normalization**

Use one payload shape:

```ts
type ContactFaqEditorPayload = {
  categories: Array<{id: string; koLabel: string; enLabel: string}>;
  faqs: Array<{
    category: string;
    ko: {question: string; answer: string};
    en: {question: string; answer: string};
  }>;
};
```

Validate category IDs with `/^[a-z0-9][a-z0-9-]{0,63}$/`, trim all copy, and return:

```js
{
  ko: {faqCategories, faqCategoryLabels, faqs},
  en: {faqCategories, faqCategoryLabels, faqs}
}
```

`contactFaqCategoryUsage` returns the number of referencing FAQ drafts. `moveContactFaqEditorItem` returns a reordered copy and leaves out-of-range moves unchanged.

- [ ] **Step 5: Run the core test**

Run: `node --test lib/cms/contact-faq-editor-core.test.mjs`

Expected: all pairing, validation, usage, and reorder cases PASS.

- [ ] **Step 6: Commit the CMS domain**

```bash
git add lib/cms/contact-faq-editor-core.mjs lib/cms/contact-faq-editor-core.d.mts lib/cms/contact-faq-editor-core.test.mjs
git commit -m "feat: model bilingual Contact FAQ editing"
```

---

### Task 3: Dedicated Contact FAQ CMS Editor

**Files:**
- Create: `app/admin/_components/contact-faq-editor.tsx`
- Create: `app/admin/_components/contact-faq-editor.test.mjs`
- Modify: `app/admin/(dashboard)/pages/[pageKey]/page.tsx`
- Modify: `app/admin/actions.ts`
- Modify: `lib/admin-i18n.ts`
- Modify: `lib/cms/page-catalog.json`
- Modify: `contact-faq-content.test.mjs`

**Interfaces:**
- Consumes: `ContactFaqEditorDraft`, translated labels, and the existing Contact locale content groups.
- Produces: a hidden `contactFaq.payload` JSON field and normalized Contact content in `savePageAction`.

- [ ] **Step 1: Write failing editor integration tests**

Assert the Contact admin page imports and renders `ContactFaqEditor`, passes paired Korean/English data, excludes generic FAQ paths, and the save action calls `parseContactFaqEditorSubmission` only for `pageKey === 'contact'`.

Assert the client source exposes add/move/delete category actions, add/move/delete FAQ actions, a dynamic category selector, bilingual fields, minimum-one protection, and category-usage blocking.

- [ ] **Step 2: Run the editor tests and confirm they fail**

Run:

```bash
node --test app/admin/_components/contact-faq-editor.test.mjs contact-faq-content.test.mjs
```

Expected: FAIL because the dedicated component and action wiring do not exist.

- [ ] **Step 3: Implement the client editor**

Initialize React state from paired drafts. Generate new IDs with `faq-${crypto.randomUUID()}`. Keep one hidden input synchronized:

```tsx
<input
  type="hidden"
  name="contactFaq.payload"
  value={JSON.stringify({categories, faqs: serializedFaqs})}
  readOnly
/>
```

Render category rows with controlled Korean and English `TextField` values and move/delete controls. Before category deletion:

```ts
const usage = contactFaqCategoryUsage({categories, faqs}, category.id);
if (usage > 0) {
  window.alert(labels.categoryInUse.replace('{count}', String(usage)));
  return;
}
```

Render FAQ cards with a controlled category `<select>`, Korean and English question/answer fields, and reorder/delete controls. Use functional state updates and stable client-only row keys.

- [ ] **Step 4: Integrate the editor into the Contact admin page**

Pair drafts from the Contact `main` groups before render. Render the dedicated editor once above locale panels. Remove `faqs` and fixed category-label fields from `page-catalog.json`; the hidden original content JSON remains the preservation base.

- [ ] **Step 5: Normalize the submission in the server action**

After `readPageLocaleContent` and before `pagePayloadSchema.parse`, add:

```ts
if (pageKey === 'contact' && formData.has('contactFaq.payload')) {
  const faq = parseContactFaqEditorSubmission(stringFromForm(formData, 'contactFaq.payload'));
  setContactFaqContent(contentKo, faq.ko);
  setContactFaqContent(contentEn, faq.en);
}
```

`setContactFaqContent` targets `__groups.main` when grouped content is present and the root otherwise. It sets only `faqCategories`, `faqCategoryLabels`, and `faqs`.

- [ ] **Step 6: Add all editor translations**

Add matching `contactFaqEditor.*` keys in Chinese, English, and Korean for the title, hint, category and FAQ actions, language labels, fields, minimum-one warning, referenced-category warning, and delete confirmations.

- [ ] **Step 7: Run editor and action tests**

Run:

```bash
node --test app/admin/_components/contact-faq-editor.test.mjs contact-faq-content.test.mjs app/admin/actions-password.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit the CMS editor**

```bash
git add app/admin/_components/contact-faq-editor.tsx app/admin/_components/contact-faq-editor.test.mjs 'app/admin/(dashboard)/pages/[pageKey]/page.tsx' app/admin/actions.ts lib/admin-i18n.ts lib/cms/page-catalog.json contact-faq-content.test.mjs
git commit -m "feat: add bilingual Contact FAQ CMS editor"
```

---

### Task 4: Canonical Content, Public UI, And Migration

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `app/[locale]/(site)/contact/page.tsx`
- Modify: `components/contact/contact-faq-section.tsx`
- Modify: `contact-faq-page.e2e.test.mjs`
- Modify: `lib/cms/contact-faq-migration-core.mjs`
- Modify: `lib/cms/contact-faq-migration-core.test.mjs`
- Modify: `contact-faq-migration-script.test.mjs`
- Modify: `scripts/migrate-contact-faqs.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical locale `faqCategories`, dynamic public groups, and validated migration input.
- Produces: SSR public FAQ markup and production-safe dynamic CMS data.

- [ ] **Step 1: Extend content and SSR tests to require dynamic categories**

Assert both locale files contain identical category IDs/order with localized labels, category count `4`, FAQ count `20`, and category distribution `5 / 6 / 6 / 3`. Assert SSR still emits four category controls, twenty question controls, and all answers.

- [ ] **Step 2: Run content and page tests and confirm they fail**

Run:

```bash
node --test contact-faq-content.test.mjs contact-faq-page.e2e.test.mjs
```

Expected: FAIL because canonical `faqCategories` and the new component prop do not exist.

- [ ] **Step 3: Add canonical category arrays and update public props**

Add to Korean and English Contact messages:

```json
"faqCategories": [
  {"id": "consultation", "label": "..."},
  {"id": "design", "label": "..."},
  {"id": "business", "label": "..."},
  {"id": "sports", "label": "..."}
]
```

Pass `text.faqCategories`, compatibility labels, and `other` label to `ContactFaqSection`. Keep the approved desktop and mobile markup, transitions, ARIA IDs, and one-answer reducer unchanged.

- [ ] **Step 4: Extend migration tests first**

Require migration output to write matching category IDs/order in both locales, localized labels, synchronized compatibility records, and `changed: false` on a repeated run. Keep unknown/duplicate abort and unrelated-content preservation cases.

- [ ] **Step 5: Implement dynamic migration output**

Set `main.faqCategories` from the canonical locale category arrays, derive `faqCategoryLabels` from them, preserve Korean FAQ answers, translate English FAQ copy, and retain the guarded SQL and backup flow.

- [ ] **Step 6: Run all focused Contact tests**

Run:

```bash
node --test lib/contact-faq-core.test.mjs lib/contact-faq-interaction-core.test.mjs lib/cms/contact-faq-editor-core.test.mjs lib/cms/contact-faq-migration-core.test.mjs app/admin/_components/contact-faq-editor.test.mjs contact-faq-content.test.mjs contact-faq-migration-script.test.mjs contact-faq-page.e2e.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 7: Commit public content and migration**

```bash
git add messages/ko.json messages/en.json 'app/[locale]/(site)/contact/page.tsx' components/contact/contact-faq-section.tsx contact-faq-page.e2e.test.mjs lib/cms/contact-faq-migration-core.mjs lib/cms/contact-faq-migration-core.test.mjs contact-faq-migration-script.test.mjs scripts/migrate-contact-faqs.mjs package.json
git commit -m "feat: publish dynamic Contact FAQ content"
```

---

### Task 5: Verification, Main Integration, AWS Deployment, And CMS Migration

**Files:**
- Verify: all changed files
- Merge target: `main`
- Production checkout: `/home/ubuntu/daeho-site`

**Interfaces:**
- Consumes: verified feature commits, clean local `main`, clean AWS checkout, and the existing Lightsail key.
- Produces: a pushed `main` commit, healthy production containers, migrated Contact FAQ CMS content, and verified public/CMS behavior.

- [ ] **Step 1: Run the complete source test suite**

Run:

```bash
rg --files -g '*.test.mjs' -g '!.next/**' | sort | xargs node --test --test-concurrency=1
```

Expected: all source tests PASS. Excluding `.next` prevents standalone build copies from being rediscovered as tests.

- [ ] **Step 2: Run ESLint and the production build**

Run:

```bash
npm run lint
CMS_BACKEND_URL=http://127.0.0.1:65534 npm run build
```

Expected: ESLint reports zero errors; Next.js compilation, TypeScript, and route generation complete successfully.

- [ ] **Step 3: Verify local public and CMS behavior in a real browser**

At `1440×1000` and `375×812`, verify `/ko/contact` category order, double-column desktop layout, mobile category collapse, one open answer, all answer DOM nodes, no horizontal overflow, and no console errors.

Open `/admin/pages/contact` in an authenticated local CMS session and verify category add/rename/reorder, referenced-category deletion protection, FAQ add/reorder/category change, bilingual editing, save, and reload. Use temporary local CMS data only; do not modify production during this step.

- [ ] **Step 4: Commit any final verification-only corrections**

```bash
git diff --check
git status --short
git add -u
git commit -m "test: verify dynamic Contact FAQ CMS"
```

Skip the commit when the worktree is already clean.

- [ ] **Step 5: Fetch and merge into local `main`**

From the clean `main` worktree:

```bash
git fetch origin main
git merge --no-ff codex/contact-faq-redesign -m "Merge dynamic Contact FAQ CMS"
```

Resolve overlapping Contact phone-notice changes by preserving both the current `main` phone notice and the FAQ implementation. Never discard unrelated `main` content.

- [ ] **Step 6: Re-run source tests, ESLint, and build on merged `main`**

Run the commands from Steps 1 and 2 in the `main` worktree.

Expected: all checks PASS on the exact merge commit.

- [ ] **Step 7: Push `main`**

```bash
git push origin main
```

Expected: the remote main hash equals the verified local merge hash.

- [ ] **Step 8: Confirm AWS can fast-forward safely**

Run:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && git fetch origin main && test "$(git branch --show-current)" = main && test -z "$(git status --porcelain)" && git merge-base --is-ancestor HEAD origin/main && git rev-parse --short HEAD && git rev-parse --short origin/main'
```

Expected: production is on clean `main` and only behind `origin/main`. Stop before rebuilding otherwise.

- [ ] **Step 9: Fast-forward and rebuild production web services**

Run:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && git merge --ff-only origin/main && sudo docker compose -p daeho-prod up -d --build next nginx && sudo docker compose -p daeho-prod ps && git rev-parse --short HEAD'
```

Expected: `next` and `nginx` rebuild, all production services remain running/healthy, and the deployed hash equals local `main`.

- [ ] **Step 10: Dry-run and apply the production CMS migration**

Run dry-run first:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && sudo env COMPOSE_PROJECT_NAME=daeho-prod npm run cms:contact-faqs:migrate'
```

Proceed only if output reports `matched.ko = 20`, `matched.en = 20`, and no validation error. Then run:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && sudo env COMPOSE_PROJECT_NAME=daeho-prod npm run cms:contact-faqs:migrate -- --apply && sudo env COMPOSE_PROJECT_NAME=daeho-prod npm run cms:contact-faqs:migrate'
```

Expected: apply reports the backup path and a second dry-run reports `changed: false`.

- [ ] **Step 11: Verify production health and content**

Confirm the deployed hash, `docker compose -p daeho-prod ps`, and HTTP success for:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://daeho.works/ko/contact
curl -fsS -o /dev/null -w '%{http_code}\n' https://daeho.works/admin/login
```

Use the browser to confirm the public FAQ chapter counts and interactions. In an authenticated CMS session, verify the Contact editor loads the migrated four categories and twenty aligned FAQs. Do not save new production content during verification.

- [ ] **Step 12: Record release evidence**

Report the local, remote, and deployed commit hashes; source-test, lint, and build results; backup path; migration idempotency result; container health; HTTP status; and public/CMS browser verification.
