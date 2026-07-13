# Task 3 Report: Home And Archive Mobile Narratives

## Completed

- Reworked the Home hero for an 80svh mobile viewport, fixed mobile display sizes, and natural title wrapping.
- Reflowed the two Home feature bands into image-first 4:3 mobile sections with the shared 80px spacing rhythm.
- Added compact mobile news rows while retaining the desktop grid and existing popup interaction.
- Added `ChronicleMobile`, a semantic linear Archive timeline with sticky year navigation, and selected it for compact viewports while preserving the desktop scroll stage.
- Added source assertions for the Home and Archive mobile paths.

## Verification

- `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs archive-image-fallback.test.mjs`
- `npm run lint`
- `npx tsc --noEmit`

All commands passed. The existing `output/`, `outputs/`, and `tmp/` directories remain untracked.

## Review Follow-up

- Aligned the mobile Chronicle main and sticky year navigation with the fixed header's safe-area-adjusted height.
- Replaced the viewport initializer with an SSR-safe `useSyncExternalStore` subscription that server-renders the non-destructive compact chronology.
- Stopped and cleaned up the desktop scroll animation when the viewport becomes compact.
- Preserved Chronicle's broken-image fallback path on mobile, including the final failed-image state.
- Raised Task 3 Home body and action copy to a 16px mobile floor while retaining desktop sizing.
- Added focused source assertions for each review fix.

## Review Verification

- `node --test mobile-public-site.test.mjs archive-image-fallback.test.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

## Final Finding

- Changed the CMS-driven Home Signature title to wrap naturally on mobile while retaining `whitespace-nowrap` from the `md` breakpoint for desktop layouts.
- Added a focused source assertion covering mobile wrapping and desktop no-wrap behavior.

## Final Verification

- `node --test mobile-public-site.test.mjs` (8 passed)
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
