# Mobile Creations “Three Acts” Redesign

**Date:** 2026-08-01  
**Status:** Approved visual, layout, interaction, and technical design  
**Scope:** Mobile Creations entry page only

## Objective

Replace the current mobile `/[locale]/mastery/creations` catalogue-style card list with a cinematic brand entrance called **Three Acts**. The page should introduce Champion, Appointment, and Bespoke as three distinct creative worlds rather than three repeated cards.

This redesign must not depend on the current Creations imagery. It should look intentional with atmospheric CSS fallbacks first, then accept three newly generated portrait artworks later without changing the layout or embedding text inside the images.

Desktop Creations, category pages, detail pages, CMS schemas, routes, SEO behavior, and public APIs remain outside this redesign.

## Why The Previous Direction Is Being Replaced

The previous mobile implementation removed duplicated content but still read as a vertical stack of image cards. Its repeated chapter anatomy, visible card boundaries, and catalogue-like captions made the page feel templated. The opening also lacked one decisive visual idea, so the page did not create a strong brand impression before asking the visitor to browse.

Three Acts removes the card metaphor. It uses one typographic opening followed by three near-full-screen visual chapters. The shared rhythm makes the page coherent, while each act has its own light, color, scale, and emotional tone.

## Approved Page Structure

The mobile page contains six sequential regions:

1. Existing mobile site header.
2. A text-only opening scene.
3. Act 01: Champion.
4. Act 02: Appointment.
5. Act 03: Bespoke.
6. The existing global footer after a compact closing signature.

The opening scene occupies approximately `68dvh`, while each collection act occupies approximately `84–88dvh`. The first act should begin or visibly peek into the initial browsing flow on common 375 × 812 and 430 × 932 viewports.

The page uses normal document scrolling. It must not use scroll snapping, a nested scroll container, horizontal swiping, gesture-only navigation, or parallax.

## Opening Scene

The opening scene is intentionally image-free. Its purpose is to establish DAEHO's voice before introducing products.

It contains:

- A small decorative English eyebrow such as `OBJECTS OF DISTINCTION`.
- One semantic page `h1`, sourced from the current localized Creations hero title.
- The approved display statement `THREE STORIES. ONE SIGNATURE.` as brand copy. It may be visually split across two lines, with the second line offset and colored burgundy.
- The existing localized Creations introduction as the readable body copy.
- A compact `03 CREATIVE WORLDS` cue.
- A restrained vertical rule or equivalent visual cue leading into Act 01.

The surface uses warm paper tones with deep navy copy and burgundy emphasis. It must not contain a hero image, category thumbnails, a carousel, or a prominent CTA button.

## The Three Acts

Each act is a single, near-full-screen linked section. It contains:

- Decorative act number: `ACT 01`, `ACT 02`, or `ACT 03`.
- Existing localized category label as a semantic `h2`.
- Existing localized category description.
- A short decorative English theme pair.
- One circular northeast arrow affordance.
- One portrait artwork layer when available.
- A CSS atmospheric fallback when artwork is absent.

The entire act is the link target, not only the arrow. The DOM and accessibility reading order remain act number, heading, description, then link purpose regardless of visual positioning.

### Act 01 — Champion

- Theme: ceremony, victory, permanence.
- Decorative pair: `VICTORY · LEGACY`.
- Palette: deep navy and cold blue-black with restrained gold highlights.
- Art direction: monumental scale, harder light, stronger metal presence.
- Composition: the subject occupies the upper-middle region; the lower area remains quiet for code-rendered text.

### Act 02 — Appointment

- Theme: memory, honor, continuity.
- Decorative pair: `MEMORY · HONOR`.
- Palette: mineral warm white, stone, soft champagne gold.
- Art direction: smaller subject, more negative space, soft natural light.
- Composition: lighter than the other acts without reducing text contrast or losing section boundaries.

### Act 03 — Bespoke

- Theme: individuality, intimacy, craft.
- Decorative pair: `STORY · CRAFT`.
- Palette: burgundy, oxblood, near-black, and warm metallic highlights.
- Art direction: closer, warmer, and more tactile while avoiding bridal or mass-market advertising cues.
- Composition: the subject feels personal and near the viewer; the lower text-safe region remains uncluttered.

## Visual System

The redesign uses the existing site fonts instead of adding a new font dependency:

- Display: the existing Cormorant Garamond treatment.
- Korean and body copy: the existing heading/body font tokens and Pretendard treatment.
- Numbers and act labels: the existing numeric/body tokens with controlled tracking.

Core visual colors:

- Deep navy: approximately `#07182D`.
- Warm paper: approximately `#EFE8DC`.
- Burgundy: approximately `#812034`.
- Muted gold: approximately `#C4A474`.

Implementation should prefer existing semantic tokens when they match. Mobile-only custom colors may be expressed as named art-direction values in one localized mapping rather than scattered one-off values throughout the JSX.

There are no rounded content cards, floating glass panels, large drop shadows, pills, or generic “View” buttons. Thin rules, typography, color fields, and artwork establish the hierarchy.

## Artwork Strategy And Generation Contract

The first implementation must not require new images to render correctly. Each act receives a deliberate CSS background made from stable color and radial-gradient layers. A restrained abstract highlight or halo may occupy the future artwork zone, but it must not imitate a broken or loading image.

Later, the user will provide three generated artworks. Each artwork must follow this contract:

- One image per act.
- Portrait orientation, preferably 4:5 master artwork with enough resolution for a full mobile viewport.
- No words, logos, captions, badges, borders, or interface elements inside the image.
- Primary subject placed in the upper or middle visual field.
- Bottom 28–35% kept visually quiet as a text-safe region.
- Edge-to-edge composition that tolerates `object-cover` cropping at 375px, 430px, and mobile landscape.
- Lighting and palette aligned with the approved act-specific directions above.

The existing category image field remains the artwork input; no CMS schema change is required. When a valid category image exists, it is rendered as the act artwork above the CSS fallback and beneath the text contrast overlays. The current mobile-specific use of `background` and `product` composition is retired from this entry page, but the desktop artwork path remains unchanged.

## Content And Data Flow

The server page continues to:

1. Load localized CMS messages.
2. Resolve the three fixed Creations category links.
3. Pass category IDs, labels, descriptions, image values, and availability to the collection gallery.

The mobile Three Acts view consumes the same category array and keeps its source order. Category identity is mapped by stable ID only for art direction and decorative theme copy. Core category names and descriptions always come from localized content.

If a category image is missing, invalid, or unavailable, the act still renders its complete gradient atmosphere, text, and navigation affordance. No empty frame, broken image icon, layout collapse, or skeleton remains after load.

## Interaction And Motion

Each act is a full-section link with a minimum 44 × 44 CSS pixel actionable area throughout. The circular arrow is decorative confirmation of navigation, while the link receives a clear accessible name such as `<category label> · <localized view label>`.

Interaction feedback:

- Touch/press: a subtle opacity or artwork-scale response without shifting layout bounds.
- Keyboard focus: a high-contrast visible outline within the act boundary.
- Hover-capable devices below `lg`: a restrained arrow or text accent change.
- Route navigation: existing localized category URLs remain unchanged.

Motion is limited to opacity and small vertical transforms. The opening copy may reveal once, and each act may reveal its text as it enters the viewport. Feedback should stay within 150–300ms. There is no parallax, pinned content, animated height, or scroll-linked product movement.

The existing reduced-motion provider remains authoritative. With reduced motion enabled, entry transforms are removed and content is immediately readable.

## Responsive Behavior

The redesign applies below the existing `lg` breakpoint. The current desktop Creations masthead and `CollectionStagePanel` composition remain unchanged.

Mobile requirements:

- No horizontal overflow at 375px or 430px.
- Safe-area-aware clearance beneath the fixed mobile header.
- Readable Korean and English wrapping without line clamps.
- Body copy at a readable mobile size with at least 1.5 line height.
- Act artwork reserves its complete section space before loading.
- The first act image may be prioritized; later act images remain lazy-loaded.
- Images use responsive `sizes` appropriate to full-width mobile rendering.
- Landscape remains usable without relying on a viewport height that hides copy or navigation.

For short landscape viewports, act height may expand beyond the target `dvh` value so all text and the arrow remain in normal document flow.

## Accessibility And Semantics

- Preserve exactly one semantic page `h1`.
- Use one sequential `h2` for each category act.
- Keep decorative English labels and act numbers out of redundant screen-reader announcements when appropriate.
- Treat full-scene artwork as decorative when the category heading and description already communicate its purpose; use empty alternative text in that case.
- Maintain WCAG AA contrast over both CSS fallbacks and future artwork with stable overlay gradients.
- Preserve visible focus states and logical DOM order.
- Do not communicate the current act or link affordance through color alone.
- Respect browser zoom, text resizing, safe areas, and `prefers-reduced-motion`.

## Implementation Boundaries

Expected implementation files:

- `app/[locale]/(site)/mastery/creations/page.tsx`
- `components/specialty/specialty-collection-gallery.tsx`
- `components/specialty/specialty-collection-gallery.test.mjs`
- `mobile-public-site.test.mjs`

Small mobile-only helpers or data mappings may be extracted inside the collection gallery module to keep act-specific styling readable. The desktop collection stage component, category pages, detail pages, CMS editor, storage model, and public APIs must not be refactored as part of this work.

## Verification

Automated verification must cover:

- The mobile opening no longer renders the previous catalogue masthead or mobile card list.
- The opening contains the approved Three Acts structure and exactly one page `h1`.
- All three acts render in stable category order as full-section links.
- Each category receives the correct act-specific art direction.
- Missing category artwork retains a complete CSS visual fallback.
- Only the first mobile act artwork is prioritized.
- The desktop `lg` branch and `CollectionStagePanel` path remain present and unchanged in behavior.
- Reduced-motion behavior, focus styling, responsive image sizing, and full descriptions remain protected.

Run the focused mobile and collection tests, the complete source test suite, ESLint, TypeScript validation, and a production build.

Browser verification must cover:

- Korean at 375 × 812 and 430 × 932.
- Mobile landscape with a short viewport.
- Initial viewport pacing and the Act 01 cue.
- Complete scrolling through all acts and the closing signature.
- No horizontal overflow or content hidden under the header/footer.
- Full-act tap targets and correct destination routes.
- Missing-image fallback presentation.
- Reduced-motion mode.
- Desktop at 1440px to confirm the existing desktop composition is unchanged.

## Success Criteria

The mobile Creations entry page feels like one cinematic brand experience rather than a list of cards. The opening establishes DAEHO's voice without relying on an image, the three categories feel emotionally distinct while sharing one system, and every act remains an obvious and accessible route into its category.

The page must remain visually complete before new artwork is generated, accept the future portrait artworks without structural changes, and preserve all existing desktop and content-management behavior outside the mobile entry page.
