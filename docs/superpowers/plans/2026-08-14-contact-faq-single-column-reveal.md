# Contact FAQ Single-Column Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present each Contact FAQ category as a one-column list that initially shows three questions and independently reveals the remaining questions on request.

**Architecture:** Extend the existing pure FAQ interaction reducer with per-category list expansion so answer cleanup remains deterministic and testable. Keep all FAQ rows server-rendered in `ContactFaqSection`, hide only rows after the first three until their category is expanded, and pass localized reveal/collapse templates from the Contact messages through the page boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Node.js test runner, next-intl message JSON, Docker Compose on AWS.

## Global Constraints

- Each category uses one question column with one question per row.
- Exactly the first three questions are initially visible.
- Categories with three or fewer questions have no reveal control.
- Category list expansion is independent; multiple categories may remain fully expanded.
- At most one FAQ answer is open globally.
- Collapsing a list closes its open answer only when that answer belongs to item four or later.
- All 20 questions and answers remain in server-rendered HTML.
- Korean reveal copy is `더 보기 {count}` and collapse copy is `접기`.
- English reveal copy is `View {count} more` and collapse copy is `Show less`.
- Hidden counts use two digits.
- Preserve category accordion behavior, ARIA, native keyboard controls, reduced-motion, and 375px no-overflow behavior.
- Do not change CMS data structures, FAQ content, Contact form, Hero, submission behavior, dependencies, or structured data.

---

### Task 1: Add independent category-list expansion to the interaction core

**Files:**
- Modify: `lib/contact-faq-interaction-core.mjs`
- Modify: `lib/contact-faq-interaction-core.d.mts`
- Modify: `lib/contact-faq-interaction-core.test.mjs`

**Interfaces:**
- Consumes: existing `ContactFaqGroupId`, `openCategory`, and `openQuestion` state.
- Produces: `expandedCategories: ContactFaqGroupId[]` and action `{type: 'toggleCategoryQuestions'; category: ContactFaqGroupId; hiddenQuestions: string[]}`.

- [ ] **Step 1: Write failing reducer tests for initial state and independent expansion**

Add expectations to `lib/contact-faq-interaction-core.test.mjs`:

```js
test('starts with every category question list limited to three items', () => {
  assert.deepEqual(createInitialContactFaqState('consultation'), {
    openCategory: 'consultation',
    openQuestion: null,
    expandedCategories: []
  });
});

test('expands category question lists independently', () => {
  const initial = createInitialContactFaqState('consultation');
  const consultationOpen = reduceContactFaqInteraction(initial, {
    type: 'toggleCategoryQuestions',
    category: 'consultation',
    hiddenQuestions: ['consultation-3', 'consultation-4']
  });
  const businessOpen = reduceContactFaqInteraction(consultationOpen, {
    type: 'toggleCategoryQuestions',
    category: 'business',
    hiddenQuestions: ['business-3', 'business-4', 'business-5']
  });

  assert.deepEqual(businessOpen.expandedCategories, ['consultation', 'business']);
});
```

- [ ] **Step 2: Run the reducer tests and verify RED**

Run:

```bash
node --test lib/contact-faq-interaction-core.test.mjs
```

Expected: FAIL because `expandedCategories` and `toggleCategoryQuestions` do not exist.

- [ ] **Step 3: Implement the minimal independent expansion state**

Update `createInitialContactFaqState`:

```js
return {
  openCategory: firstCategory ?? null,
  openQuestion: null,
  expandedCategories: []
};
```

Add the reducer branch:

```js
if (action.type === 'toggleCategoryQuestions') {
  const expanded = state.expandedCategories.includes(action.category);

  return {
    ...state,
    expandedCategories: expanded
      ? state.expandedCategories.filter((category) => category !== action.category)
      : [...state.expandedCategories, action.category],
    openQuestion: expanded && action.hiddenQuestions.includes(state.openQuestion)
      ? null
      : state.openQuestion
  };
}
```

Keep `expandedCategories` unchanged in the category and question branches.

Change the category branch to spread the existing state so list expansion survives mobile chapter changes:

```js
if (action.type === 'toggleCategory') {
  return {
    ...state,
    openCategory: state.openCategory === action.category ? null : action.category,
    openQuestion: null
  };
}
```

- [ ] **Step 4: Add the collapse cleanup test**

```js
test('collapsing a category list closes an answer that becomes hidden', () => {
  const expanded = {
    openCategory: 'consultation',
    openQuestion: 'consultation-4',
    expandedCategories: ['consultation', 'business']
  };
  const collapsed = reduceContactFaqInteraction(expanded, {
    type: 'toggleCategoryQuestions',
    category: 'consultation',
    hiddenQuestions: ['consultation-3', 'consultation-4']
  });

  assert.deepEqual(collapsed, {
    openCategory: 'consultation',
    openQuestion: null,
    expandedCategories: ['business']
  });
});
```

- [ ] **Step 5: Update the declaration file**

Define the expanded state and action exactly:

```ts
export type ContactFaqInteractionState = {
  openCategory: ContactFaqGroupId | null;
  openQuestion: string | null;
  expandedCategories: ContactFaqGroupId[];
};

export type ContactFaqInteractionAction =
  | {type: 'toggleCategory'; category: ContactFaqGroupId}
  | {type: 'toggleQuestion'; question: string}
  | {
      type: 'toggleCategoryQuestions';
      category: ContactFaqGroupId;
      hiddenQuestions: string[];
    };
```

- [ ] **Step 6: Run the reducer tests and verify GREEN**

Run:

```bash
node --test lib/contact-faq-interaction-core.test.mjs
```

Expected: all interaction-core tests PASS.

- [ ] **Step 7: Commit the interaction state change**

```bash
git add lib/contact-faq-interaction-core.mjs lib/contact-faq-interaction-core.d.mts lib/contact-faq-interaction-core.test.mjs
git commit -m "feat: add FAQ list reveal state"
```

---

### Task 2: Render localized single-column FAQ lists with reveal controls

**Files:**
- Modify: `components/contact/contact-faq-section.tsx`
- Modify: `app/[locale]/(site)/contact/page.tsx`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `contact-faq-content.test.mjs`
- Modify: `contact-faq-page.e2e.test.mjs`

**Interfaces:**
- Consumes: `expandedCategories` and `toggleCategoryQuestions` from Task 1.
- Produces: `ContactFaqSection` props `showMoreLabel: string` and `showLessLabel: string`; DOM markers `data-contact-faq-extra-panel` and `data-contact-faq-reveal`.

- [ ] **Step 1: Add failing localization assertions**

Extend `contact-faq-content.test.mjs`:

```js
test('Contact FAQ reveal controls have Korean and English copy', () => {
  assert.equal(koMessages.contact.faqShowMore, '더 보기 {count}');
  assert.equal(koMessages.contact.faqShowLess, '접기');
  assert.equal(enMessages.contact.faqShowMore, 'View {count} more');
  assert.equal(enMessages.contact.faqShowLess, 'Show less');
});
```

- [ ] **Step 2: Add failing SSR expectations for progressive disclosure**

Update `contact-faq-page.e2e.test.mjs` to expect:

```js
assert.equal((html.match(/data-contact-faq-reveal=/g) ?? []).length, 3);
assert.equal((html.match(/data-contact-faq-extra-panel=/g) ?? []).length, 3);
assert.equal((html.match(/data-contact-faq-extra-question=/g) ?? []).length, 8);
assert.equal((html.match(/aria-controls="contact-faq-/g) ?? []).length, 27);
assert.match(html, /data-contact-faq-reveal="consultation"[^>]*aria-expanded="false"/);
assert.match(html, /더 보기 02/);
assert.match(html, /더 보기 03/);
```

Retain the existing assertions that all four categories, all 20 question buttons, and the first and final answer copy are present in HTML.

- [ ] **Step 3: Run content and SSR tests and verify RED**

Run:

```bash
node --test --test-concurrency=1 contact-faq-content.test.mjs contact-faq-page.e2e.test.mjs
```

Expected: FAIL because the message fields and reveal DOM do not exist.

- [ ] **Step 4: Add localized reveal copy and pass it through the page**

Add beside `faqTitle` in both Contact message objects:

```json
"faqShowMore": "더 보기 {count}",
"faqShowLess": "접기"
```

and:

```json
"faqShowMore": "View {count} more",
"faqShowLess": "Show less"
```

Pass the fields in `app/[locale]/(site)/contact/page.tsx`:

```tsx
<ContactFaqSection
  title={text.faqTitle}
  showMoreLabel={text.faqShowMore}
  showLessLabel={text.faqShowLess}
  categories={text.faqCategories}
  otherLabel={text.faqCategoryLabels.other}
  faqs={text.faqs}
/>
```

- [ ] **Step 5: Replace the two-column split with one list and a three-item boundary**

Add props and a constant in `contact-faq-section.tsx`:

```tsx
type ContactFaqSectionProps = {
  title: string;
  showMoreLabel: string;
  showLessLabel: string;
  categories: ContactFaqCategory[];
  otherLabel: string;
  faqs: ContactFaqSourceItem[];
};

const DEFAULT_VISIBLE_FAQ_COUNT = 3;
```

Inside each group render, replace `splitAt` and `columns` with:

```tsx
const indexedItems = group.items.map((item, index) => ({item, index}));
const firstItems = indexedItems.slice(0, DEFAULT_VISIBLE_FAQ_COUNT);
const extraItems = indexedItems.slice(DEFAULT_VISIBLE_FAQ_COUNT);
const listExpanded = state.expandedCategories.includes(group.id);
const extraPanelId = `contact-faq-${instanceId}-${group.id}-extra`;
const hiddenQuestions = extraItems.map(({index}) => `${group.id}-${index}`);
```

Render a single `min-w-0` list. Render `firstItems` directly. Keep `extraItems` server-rendered inside:

```tsx
<div
  id={extraPanelId}
  data-contact-faq-extra-panel={group.id}
  hidden={!listExpanded}
>
  {extraItems.map(({item, index}) => (
    <div key={`${group.id}-${item.question}`} data-contact-faq-extra-question={`${group.id}-${index}`}>
      <FaqQuestion
        instanceId={instanceId}
        groupId={group.id}
        item={item}
        index={index}
        open={state.openQuestion === `${group.id}-${index}`}
        onToggle={() => dispatch({type: 'toggleQuestion', question: `${group.id}-${index}`})}
      />
    </div>
  ))}
</div>
```

Do not use `md:grid-cols-2`, `splitAt`, or `columns.map` in the question list.

- [ ] **Step 6: Add the reveal footer control only when extra items exist**

```tsx
{extraItems.length > 0 ? (
  <button
    type="button"
    data-contact-faq-reveal={group.id}
    aria-expanded={listExpanded}
    aria-controls={extraPanelId}
    className="mobile-tap-target mt-3 flex min-h-12 w-full items-center justify-end gap-3 border-b border-hairline py-3 text-right font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-accent"
    onClick={() => dispatch({
      type: 'toggleCategoryQuestions',
      category: group.id,
      hiddenQuestions
    })}
  >
    <span>
      {listExpanded
        ? showLessLabel
        : showMoreLabel.replace('{count}', itemCount(extraItems.length))}
    </span>
    <AccordionMark open={listExpanded} />
  </button>
) : null}
```

Keep the left desktop category rail and mobile category accordion unchanged.

- [ ] **Step 7: Run the focused tests and verify GREEN**

Run:

```bash
node --test --test-concurrency=1 \
  lib/contact-faq-interaction-core.test.mjs \
  contact-faq-content.test.mjs \
  contact-faq-page.e2e.test.mjs
```

Expected: all focused tests PASS; SSR still contains 20 questions and all answer copy.

- [ ] **Step 8: Commit the one-column public UI**

```bash
git add components/contact/contact-faq-section.tsx \
  'app/[locale]/(site)/contact/page.tsx' \
  messages/ko.json messages/en.json \
  contact-faq-content.test.mjs contact-faq-page.e2e.test.mjs
git commit -m "feat: simplify Contact FAQ to one-column lists"
```

---

### Task 3: Verify layout, accessibility, and regression safety

**Files:**
- Modify only if verification exposes a defect in the files from Tasks 1–2.

**Interfaces:**
- Consumes: completed one-column FAQ component.
- Produces: evidence that desktop, mobile, accessibility, SEO output, and the full application remain healthy.

- [ ] **Step 1: Run the complete source test suite serially**

```bash
node --test --test-concurrency=1 --test-reporter=dot $(rg --files -g '*.test.mjs' -g '*.test.js')
```

Expected: exit code 0 with no failed tests.

- [ ] **Step 2: Run ESLint**

```bash
npm run lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

```bash
CMS_BACKEND_URL=https://daeho.works CMS_PREVIEW_STATIC=false npm run build
```

Expected: compilation and TypeScript pass; all 41 static pages generate.

- [ ] **Step 4: Start the production server locally and inspect 1440px desktop**

Run the built app on an available local port with the controlled CMS configuration. In the in-app browser verify:

- Four category chapters remain visible.
- Each category's question rows share one x-position and form one column.
- Consultation initially shows 3 visible question rows and `더 보기 02`.
- Design and Business initially show 3 visible rows and `더 보기 03`.
- Sports shows all 3 rows and has no reveal control.
- Expanding Consultation and Business keeps both lists open.
- At most one answer stays open globally.
- No horizontal overflow exists.

- [ ] **Step 5: Inspect 375×812 mobile behavior**

Verify:

- The first category is open by default and the others are closed.
- An open category initially exposes three question rows.
- Reveal and category buttons are separate native buttons with correct `aria-expanded` and `aria-controls`.
- A hidden fourth-or-later answer closes when its list is collapsed.
- Switching mobile categories closes the previous answer without resetting other categories' expanded-list state.
- The viewport remains 375px wide with no horizontal overflow.

- [ ] **Step 6: Check the final diff and commit any verification-only fix**

```bash
git diff --check
git status --short
```

If verification required a code correction, follow a fresh RED/GREEN cycle, rerun Steps 1–5, and commit only that correction. If no correction is needed, do not create an empty commit.

---

### Task 4: Merge, deploy, and verify production

**Files:**
- No new source files expected.

**Interfaces:**
- Consumes: verified feature commits from Tasks 1–3.
- Produces: remote `main` and AWS production running the same commit.

- [ ] **Step 1: Confirm the branch is clean and main has not diverged**

```bash
git status --short --branch
git fetch origin main
git rev-list --left-right --count HEAD...origin/main
```

Expected: clean worktree. If remote main advanced, merge it without force-pushing and rerun Task 3 verification.

- [ ] **Step 2: Push the verified commit to main without force**

```bash
git push origin HEAD:main
```

Expected: a fast-forward update.

- [ ] **Step 3: Fast-forward and rebuild production on AWS**

On `/home/ubuntu/daeho-site`:

```bash
git fetch origin main
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain)"
git merge --ff-only origin/main
sudo docker compose -p daeho-prod up -d --build next nginx
```

- [ ] **Step 4: Verify production health and live FAQ output**

```bash
sudo docker compose -p daeho-prod ps
curl -fsS https://daeho.works/ko/contact >/dev/null
git rev-parse --short HEAD
```

Then verify the live page at 1440px and 375×812 using the same checks from Task 3. Confirm the server HEAD equals remote main, all containers are running, the public page returns 200, and the live DOM contains four categories, 20 questions, and three reveal controls.

- [ ] **Step 5: Record the release result**

Report the commit hash, AWS status, focused/full test results, build result, desktop/mobile browser checks, and confirm that no CMS migration or content rewrite was performed.
