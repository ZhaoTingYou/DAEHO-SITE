# Contact FAQ Single-Column Reveal Design

## Goal

Refine the categorized Contact FAQ into a calmer editorial layout. Each category keeps its existing archive-style identity but presents questions in one vertical column, with progressive disclosure for categories longer than three items.

## Scope

- Change only the public Contact FAQ presentation and its localized reveal controls.
- Preserve the current category structure, FAQ content, CMS editor, Contact form, Hero, submission behavior, SEO structured data, and legacy CMS compatibility.
- Keep Korean and English behavior identical.

## Layout

### Desktop

- Keep the four continuous category chapters and their horizontal separators.
- Keep the left chapter rail with chapter number, category label, and FAQ count.
- Replace the right two-column question grid with one full-width vertical list.
- Render one question per row with the existing number, question copy, answer accordion, and plus/minus indicator.
- Show the first three questions initially.
- Categories with three or fewer questions do not show a reveal control.
- Categories with more than three questions show a restrained footer control beneath the third row. The control includes the remaining count, for example `더 보기 03` or `View 03 more`.
- Once expanded, all questions are visible and the footer control changes to `접기` or `Show less`.

### Mobile

- Keep the existing category accordion and default the first category to open.
- Inside an open category, use the same one-column list and three-item initial limit.
- Keep category collapse and list expansion as separate controls.
- Preserve the existing no-horizontal-overflow behavior at 375px.

## Interaction and State

- Each category owns an independent expanded-list state, so several categories may show all questions simultaneously.
- Question-answer state remains global: at most one answer may be open anywhere in the FAQ.
- Switching or closing a mobile category continues to close its open answer.
- Collapsing an expanded list back to three items closes the active answer when that answer belongs to item four or later.
- Expanding or collapsing one category does not change another category's list state.
- Reveal controls use stable IDs, `aria-expanded`, and `aria-controls`.
- Keyboard behavior relies on native buttons and supports Enter, Space, and normal focus order.
- Existing short transitions remain, and reduced-motion removes them.

## Rendering and SEO

- All FAQ questions and answers remain in the server-rendered DOM, including items four through six.
- Initially undisclosed rows are visually and interactively hidden but are not removed from the server output.
- Existing `FAQPage` structured data continues to include all FAQ content.

## Localized Copy

- Korean reveal: `더 보기 {count}`
- Korean collapse: `접기`
- English reveal: `View {count} more`
- English collapse: `Show less`
- The count is the number of currently hidden questions, padded to two digits to match the numeric visual system.

## Component Boundaries

- `ContactFaqSection` groups content and coordinates mobile category state, per-category list expansion, and the single open answer.
- The interaction core owns deterministic state transitions for list expansion and answer cleanup.
- `FaqQuestion` remains responsible only for one question-answer row.
- The localized Contact messages supply reveal and collapse labels to the component.
- No CMS schema or migration changes are required.

## Verification

- Source and state tests verify a single question column and removal of the desktop two-column split.
- Interaction tests verify the three-item default, per-category independent expansion, collapse to three items, and closing a now-hidden answer.
- SSR tests verify that all 20 questions and answers remain in HTML.
- Accessibility checks cover reveal button ARIA, native keyboard activation, focus order, and reduced-motion.
- Browser checks cover 1440px desktop and 375×812 mobile, including no horizontal overflow.
- Run the complete Node test suite serially, ESLint, and the production build.

## Non-Goals

- Do not change FAQ wording, categories, ordering, or business policy.
- Do not add pagination, URL state, dependencies, cards, shadows, or a CMS setting for the three-item limit.
- Do not change Contact page sections outside the FAQ.
