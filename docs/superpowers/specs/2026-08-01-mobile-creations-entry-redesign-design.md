# Mobile Creations Entry Redesign

**Date:** 2026-08-01  
**Status:** Approved design, pending written-spec review  
**Scope:** Mobile Creations entry page only

## Objective

Redesign the mobile `/[locale]/mastery/creations` entry page as a restrained luxury-jewelry catalogue. The page should foreground the three Creations categories, remove repeated information, and feel lighter and more deliberate without changing desktop presentation, category pages, product details, CMS structures, routes, or SEO behavior.

## Current Problems

The current mobile page presents the same category structure several times: the introductory hero image includes a three-column category caption, and the same categories then appear again as large, visually uniform cards. This makes the opening long and repetitive. The repeated dark 4:5 stages also make the three categories feel templated and reduce the prominence of the jewelry.

## Chosen Direction

Use a vertical editorial catalogue rather than a stack of generic cards. The visual language remains consistent with DAEHO's existing system: warm white surfaces, deep navy product stages, burgundy accents, serif display typography, restrained rules, and existing jewelry artwork.

Alternatives considered and rejected:

- Full-height dark stages: strong impact, but too heavy and slow to browse on a phone.
- Horizontal gallery: compact, but hides categories and risks conflicting with mobile navigation gestures.

## Information Architecture

The mobile page has two primary regions:

1. A compact editorial masthead.
2. Three linked collection chapters: Champion, Appointment, and Bespoke.

The masthead contains the eyebrow, `CREATIONS` display title, localized introduction, and a compact `03 COLLECTIONS` cue. It does not contain the current aggregate hero image or its three-column category caption. The top of the first collection chapter should be visible near the bottom of the initial viewport so the next action is apparent without an additional prompt.

Each collection chapter contains:

- Category number.
- Existing localized category name.
- Existing or current mobile category description.
- A large image stage using the category's current CMS artwork with the existing fallback mapping.
- A single visible arrow affordance while the complete chapter remains the link target.

## Visual Composition

The three chapters share typography, spacing, rules, and interaction behavior but should not look like copies of one card template.

- **Champion:** deep navy stage, large product scale, and compact captioning to convey weight and ceremony.
- **Appointment:** brighter composition with more negative space to suggest remembrance and continuity.
- **Bespoke:** warm neutral or burgundy-inflected composition with a more intimate product scale.

Variation comes from image treatment, crop, whitespace, and caption placement. It must not change content order, accessibility reading order, or the underlying data model. All spacing follows the existing mobile 4/8-point rhythm and `--mobile-page-gutter` token. Text remains left-aligned and readable at 375px and 430px.

## Components And Boundaries

Implementation stays within the current responsive component structure:

- Update the mobile-only masthead in `app/[locale]/(site)/mastery/creations/page.tsx`.
- Update `MobileCollectionIndex` and `MobileCollectionCard` in `components/specialty/specialty-collection-gallery.tsx`.
- Keep `CollectionStagePanel` and the `lg:` desktop path unchanged.
- Keep category pages, item detail pages, CMS fields, public APIs, localized route resolution, metadata, and collection IDs unchanged.

Small mobile-only helpers may be extracted inside the collection gallery module when they make the three art directions explicit. No general-purpose refactor is part of this work.

## Data Flow And Fallbacks

The server page continues to load localized CMS content and resolve category links exactly as it does now. The gallery continues to receive the resolved filters and builds category cards from them.

For artwork, each chapter uses `filter.background` and `filter.product` when present. The existing `collectionStageArtwork` mapping remains the fallback. Existing `imageExists` and image-source handling remain responsible for unavailable CMS media. The redesign must not introduce new asset requirements or render a blank structural region when optional CMS imagery is missing.

The localized Korean and English category labels and descriptions remain the source of accessible names. Decorative stage backgrounds use empty alternative text; product artwork exposes a meaningful category-based alternative.

## Interaction And Motion

The whole chapter is a link; the arrow is a visual affordance rather than the only tap target. Keyboard focus remains visible, and the link has a minimum 44px actionable dimension with adequate separation from adjacent targets.

On entry, chapters may fade in and translate upward slightly. Press, hover, and focus feedback may adjust border/accent color and apply a subtle product-image scale. Motion must use transform and opacity only, stay within 200–300ms for feedback, and be disabled or reduced through the existing reduced-motion preference.

The page does not add horizontal swiping, scroll snapping, parallax, nested scrolling, or gesture-only actions.

## Responsive And Performance Requirements

- The redesign applies below the existing `lg` breakpoint only.
- No horizontal overflow at 375px or 430px in Korean or English.
- Titles and descriptions wrap naturally without truncating essential content.
- Media frames reserve their final aspect ratio to prevent layout shift.
- The first category artwork may load eagerly when it is the leading content image; later category media should retain normal Next.js lazy-loading behavior.
- Existing image sizing must describe the mobile rendered width instead of requesting desktop-sized media unnecessarily.
- Content must not be hidden beneath the mobile header, safe-area inset, or footer spacing.

## Accessibility

- Preserve a single semantic `h1` and sequential category `h2` headings.
- Maintain at least WCAG AA contrast for text and visible focus indicators.
- Do not communicate category identity or link state through color alone.
- Ensure the complete linked chapter has a clear accessible name.
- Respect `prefers-reduced-motion` through the existing motion provider.
- Keep touch targets at least 44 by 44 CSS pixels.

## Verification

Automated verification:

- Extend the existing collection gallery source tests to cover the new mobile masthead hook, removed aggregate hero treatment, full-card links, stable media aspect ratios, touch-target affordance, and preserved desktop path.
- Run `node --test components/specialty/specialty-collection-gallery.test.mjs` plus any directly affected mobile public-site tests.
- Run lint, TypeScript validation, and the production build.

Visual verification:

- Capture the Korean and English entry page at 375px and 430px.
- Check the initial viewport cue, chapter variation, media cropping, text wrapping, focus/press states, and footer clearance.
- Verify reduced-motion behavior and confirm that the 1440px desktop Creations composition is visually unchanged.

## Success Criteria

The mobile entry page presents each category exactly once, exposes the first category within the opening browsing flow, and reads as a cohesive jewelry catalogue rather than a repeated stack of generic cards. All three categories remain immediately understandable and fully tappable, existing content management continues to work, and desktop Creations is unaffected.
