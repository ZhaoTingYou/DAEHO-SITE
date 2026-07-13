# Task 7 Report

## Delivered

- Redesigned public Korean and English News index mobile layouts with a fixed 44px masthead, compact 4:3 featured media, sticky horizontal filters, and 4:3 image-and-copy article rows.
- Reworked Home news popups into mobile bottom sheets with 16px padding, a `calc(100dvh - 16px)` height cap, image-first content, and a 44px close control.
- Tightened article mobile flow with a smaller hero gap, 34px wrapping titles, 16px/1.8 body copy, stacked image/text blocks, and document-order previous/next rows with 44px minimum targets.
- Preserved CMS block ordering, article IDs, filters, routes, SEO metadata, desktop layouts, and previous/next message labels.

## TDD Evidence

- Added the Task 7 News mobile source assertions to `mobile-public-site.test.mjs`.
- Confirmed the new assertions failed before implementation because the mobile display, 4:3 card, and adjacent navigation hooks were absent.
- Confirmed the new assertions pass after implementation.

## Verification

- `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs` (29 passing after the production changes).
- `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs lib/cms/public-newline-rendering.test.mjs` has one pre-existing failure: `components/specialty/specialty-process.tsx` no longer contains the legacy class string expected by `public-newline-rendering.test.mjs`; the same string is absent from `HEAD` and this task did not modify that file.
- `npm run lint -- --quiet`
- `npx tsc --noEmit --pretty false --incremental false --skipLibCheck`
- `git diff --check`

## Review Follow-up

- Added a keyboard focus trap to the Home news dialog, focused its close control on open, and restored focus to the exact launching card when dismissed by Escape, backdrop click, or the close control. Body scroll locking and the existing mobile/desktop modal layout remain unchanged.
- Replaced the obsolete Specialty process typography-string assertion with a source assertion that verifies `step.body` is rendered in a `whitespace-pre-line` element. Updated other stale mobile typography fixtures to retain the same whitespace behavior checks.
- Verified with `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs lib/cms/public-newline-rendering.test.mjs` (31 passing), `npm run lint -- --quiet`, and `npx tsc --noEmit --pretty false --incremental false --skipLibCheck`.

## Focus Restoration Follow-up

- Deferred Home news focus restoration until the closed state commits, then restored the connected opener or the first connected `.mobile-home-news-row` fallback and cleared the consumed opener ref. Escape, backdrop, close-button, focus-trap, and body-lock behavior remain intact.
- Added the focused source regression to `mobile-public-site.test.mjs` and verified the full Task 7 acceptance suite (31 passing), `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false --incremental false --skipLibCheck`, and `git diff --check`.
