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
