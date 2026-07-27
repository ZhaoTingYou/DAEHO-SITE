# Creations Mobile Desktop-Parity Redesign

## Goal

Make only the public Creations landing page on mobile feel consistent with its existing desktop presentation. Replace the current white editorial image and conventional stacked cards with a compact title introduction followed by three immersive, near-full-screen category panels.

The three category pages, collection detail pages, CMS data structures, routes, and desktop Creations layout are outside this change.

## Design Direction

The mobile landing page should translate the desktop experience rather than shrink it. It will preserve the existing white introduction, dark full-bleed category stages, alternating DAEHO product artwork, burgundy accent, and editorial type system.

The experience remains a normal vertical document. It will not introduce a horizontal carousel, scroll hijacking, nested scrolling, or gesture-only navigation.

## Page Structure

### Introduction

- Keep the semantic page-level heading and the existing CMS-managed title and subtitle.
- Remove the mobile-only `Curated Works` eyebrow, large jewelry montage, and three-column figure caption.
- Use a centered white introduction that visually matches the desktop title block.
- Clear the mobile safe-area header and use compact spacing so the first category stage is visible without excessive scrolling.
- Keep desktop introduction markup and appearance unchanged.

### Category Stages

- Render the three existing categories in their CMS order.
- Each category becomes a full-width link with `min-height: max(640px, 92svh)`.
- Reuse the same background, optional mobile background, product artwork, label, description, and destination already used by the desktop stages.
- Place the background image full-bleed and the product artwork prominently near the visual center.
- Position copy in the lower safe reading area using the established desktop hierarchy: category label, description, and visible discovery action.
- Use a dark gradient scrim behind the lower copy region so CMS-managed images cannot make the text unreadable.
- Keep all content inside the viewport with no horizontal overflow at widths of 320px and above.

## Interaction And Motion

- The entire category stage is a semantic link to its existing route.
- Keep a visible directional action and a minimum 44px touch target.
- Provide clear pressed, focus-visible, and keyboard states without shifting layout.
- Limit decorative motion to opacity and transform. Motion must remain interruptible and must not delay navigation.
- Respect `prefers-reduced-motion` by presenting the final composition without parallax or long transitions.
- Do not require swiping, hovering, or precision tapping.

## Data And Component Boundaries

- `app/[locale]/(site)/mastery/creations/page.tsx` continues to load CMS content, collection items, routes, and image availability.
- `SpecialtyCollectionGallery` continues to derive the category cards and desktop artwork.
- Replace only the mobile presentation inside `MobileCollectionIndex` and `MobileCollectionCard`, reusing `getCollectionStageArtwork`.
- Do not add CMS fields, duplicate category copy, change the public data contract, or change category/detail components.
- Keep desktop `CollectionStagePanel` rendering unchanged.
- Preserve the localized empty state when Collections CMS data is empty.

## Accessibility And Performance

- Maintain one semantic `h1` for the page and sequential `h2` category headings.
- Keep text contrast at WCAG AA levels through white text and a dark scrim.
- Preserve meaningful product image alt text; decorative background images remain empty-alt.
- Use responsive CMS images and declared image dimensions to prevent layout shift.
- Load the first stage artwork eagerly; keep the two below-fold stages non-priority.
- Avoid blur-heavy or glass effects that would reduce contrast or increase mobile rendering cost.

## Verification

- Add regression coverage for the mobile immersive stages, desktop/mobile visibility boundaries, safe viewport sizing, semantic links, touch targets, gradients, and reduced-motion behavior.
- Run the focused Creations tests, full Node test suite, ESLint, TypeScript, and the production build.
- Inspect the landing page at 375×812, 390×844, and 768×1024.
- Verify no horizontal overflow, clipped copy, unsafe header overlap, hidden controls, or unreadable image/text combinations.
- Compare at 1440×900 to confirm the desktop introduction and three desktop stage panels are unchanged.
- Smoke-test all three stage links without changing their destination pages.

## Deployment Boundary

Implementation may be committed and verified locally after this design is approved. Production deployment requires a separate explicit deployment instruction from the user.
