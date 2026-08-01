# Mobile Creations CMS Images Design

**Date:** 2026-08-01

## Goal

Allow editors to upload a dedicated mobile entrance image for each of the three Creations acts—Champion, Appointment, and Bespoke—without changing the desktop artwork or the existing mobile opening section.

## Scope

- Keep the top mobile Creations opening unchanged: beige background, localized `CREATIONS` title, subtitle, and `03 Creative worlds` cue.
- Add one CMS-editable mobile entrance image to each item in `specialtyPages.collection.gallery.filters`.
- Render that image only in the three mobile Act entrances.
- Keep the current mobile gradients, halo treatment, copy, links, and interaction behavior.
- Keep the desktop background and product artwork fields unchanged.

## CMS Model

Add an optional `mobileImage` property to each Creations category filter.

Expose it as an image field labeled `移动端入口图片` in:

- `Mastery / Creations` → `分类筛选`
- `Creations / Champion`
- `Creations / Appointment`
- `Creations / Bespoke`

All four editing surfaces point to the same underlying category data. Editing the field from either the main Creations page or a category page updates the same `mobileImage` value.

The image guide recommends a 9:16 portrait asset at 1440 × 2560 pixels. Editors should keep the main subject near the horizontal center and slightly above the vertical center because the image uses `object-cover` across varying phone heights.

## Mobile Rendering

Each `MobileCollectionAct` keeps its existing gradient scene as the base layer. When `category.mobileImage` is present and valid, a full-bleed responsive image renders above the gradient and below the existing readability overlay, Act label, heading, description, and arrow.

The image uses:

- full-section `fill` positioning;
- `object-cover` cropping;
- `sizes="100vw"`;
- decorative semantics because the category link already has an accessible label and visible text.

The existing overlay remains above the image so white or dark text stays readable. The complete Act remains one large link.

## Fallback Behavior

- If `mobileImage` is empty, the current gradient and halo composition remains visible.
- If the configured image cannot be resolved during server rendering, the gradient and halo remain visible.
- If an image fails after rendering, the base gradient is still present beneath it rather than leaving an empty section.
- Existing `image`, `background`, and `product` fields are not used as automatic mobile fallbacks, so mobile and desktop artwork remain independent.

## Data Flow

1. An editor uploads or selects a mobile image in the CMS.
2. The value is stored as `gallery.filters[n].mobileImage` for the relevant category.
3. Locale-message loading preserves the fixed three category records and carries the optional field into the Creations page.
4. The page resolves whether the image is usable and passes the category data to `SpecialtyCollectionGallery`.
5. `MobileCollectionAct` renders the image only below the `lg` breakpoint.

## Testing

- CMS catalog tests verify `mobileImage` is available on the main Creations page and all three category pages.
- Image-guide tests verify the new field has a portrait mobile image guide.
- Mobile gallery tests verify the Act uses `mobileImage` as a full-bleed layer and preserves the gradient fallback.
- Regression tests verify desktop artwork still reads `background` and `product` and the mobile opening remains unchanged.
- Run focused tests, the complete source test suite, ESLint, TypeScript validation, and the production build.
- Browser-check the Creations page at 375 × 812, 430 × 932, and 1440 × 1000.

## Deployment

After verification, merge the implementation to `main`, push the verified commit, rebuild the production `next` and `nginx` services, and confirm the public mobile page still falls back safely before editors upload the new portrait assets. This change does not modify production CMS content automatically.
