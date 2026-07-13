# Task 4 Report: Heritage Mobile Page Family

## Delivered

- Applied shared mobile shell, section, display, copy, media, and tap-target hooks to Loyalty, Credibility, and Achievement public pages.
- Updated the Heritage hero to use a 78svh mobile height with unframed mobile copy, 44px display type, and 16px body copy.
- Reordered mobile credibility and achievement content into title, image, and body flows while preserving desktop layouts with `md:` overrides.
- Simplified achievement mobile statistics into a border-separated accessible list and converted achievement records to a vertical 4:3 mobile sequence.
- Kept carousel controls visible and at least 44px on touch devices; added wrapping safeguards for CMS-supplied public copy.

## Verification

- `node --test components/legacy/*.test.mjs mobile-public-site.test.mjs` (19 passing)
- `npx eslint components/legacy/heritage-hero.tsx components/legacy/loyalty-commitment-page.tsx components/legacy/loyalty-feature-carousel.tsx components/legacy/credibility-compliance-page.tsx components/legacy/achievement-records-page.tsx components/legacy/achievement-pentagon-stats.tsx mobile-public-site.test.mjs`
- `npx tsc --noEmit`
- `git diff --check`

## Review Follow-up

- Fixed Achievement market feature mobile order to render one title/accent heading, its image, and one body; desktop alternating content remains unchanged.
- Reworked the Loyalty mobile carousel into content-driven document flow with a 4:3 image, non-clipping copy, and reachable 44px controls. Desktop framing remains at `md` and above.
- Reserved the Heritage mobile hero header and safe area before its 78svh content, then added source-level regression assertions for all three fixes.

### Verification

- `node --test components/legacy/*.test.mjs mobile-public-site.test.mjs` (21 passing)
- `npx eslint components/legacy/heritage-hero.tsx components/legacy/loyalty-commitment-page.tsx components/legacy/loyalty-feature-carousel.tsx components/legacy/credibility-compliance-page.tsx components/legacy/achievement-records-page.tsx components/legacy/achievement-pentagon-stats.tsx mobile-public-site.test.mjs`
- `npx tsc --noEmit`
- `git diff --check`
