# Mobile LCP And Font Rendering Design

Date: 2026-08-14

## Goal

Reduce mobile Largest Contentful Paint without merging the CMS-managed mobile and desktop Hero images, while removing the slow-network layout shift seen during streamed route loading and font replacement.

The work must preserve:

- separate mobile and desktop image composition;
- the current Korean and English typography;
- the CMS image fallback behavior;
- desktop video and mobile poster behavior;
- existing CMS content and database structure.

## Confirmed Root Causes

### Hero image priority metadata is lost

The current Hero image is already present in server-rendered HTML as a responsive `<picture>`. The problem is not the absence of server rendering.

`ResponsiveCmsImage` calls `getImageProps({priority: true})` and spreads only the returned image props onto a native `<img>`. In Next.js 16, `priority` is recorded in `getImageProps` metadata so that the `<Image>` component can create a preload. That metadata is discarded by the custom component. Production HTML therefore contains:

- no responsive Hero image preload;
- no `fetchpriority="high"`;
- no explicit eager loading for the Hero image.

The browser discovers the `<picture>` only while parsing the page body and does not prioritize it as the LCP resource.

### External font stylesheets block first paint

The locale and admin layouts render external stylesheets for Google Fonts and Pretendard. Even with preconnect, the browser must wait for an additional stylesheet request before it can finish the render-blocking CSS path. The production slow-network measurement attributes about 2.6 seconds to this path.

### Pretendard uses too many independent faces

The current Pretendard dynamic subset declares 828 faces: 92 Unicode subsets for each of nine fixed weights. A representative page requested 27 font chunks. Under slow-network conditions, those chunks become available at different times and cause repeated font swaps.

### The route loading fallback exposes the footer before streamed content arrives

Post-build Lighthouse and a browser `LayoutShift` trace showed that font replacement contributes about 0.005 CLS, not the reported 0.195. The dominant 0.200 shift happens when the mobile loading fallback is replaced by the streamed page:

- `loading.tsx` reserves only `80svh`;
- the footer is therefore visible in the bottom 20% of the viewport;
- when the full route arrives, the footer is pushed below several page sections in one step.

The original font-only explanation was incomplete. The loading fallback must reserve the full mobile viewport so the footer never enters the initial viewport.

## Approved Approach

### 1. Preserve art direction and preload only the matching Hero image

Keep the existing mobile and desktop CMS fields. Extend `ResponsiveCmsImage` so that a priority image:

- calculates the existing optimized `srcSet` for both sources;
- calls React DOM `preload()` for the mobile source with `media: (max-width: 767px)`;
- calls React DOM `preload()` for the desktop source with `media: (min-width: 768px)` when a mobile source exists;
- preloads only the desktop source when there is no mobile source;
- uses the same `imageSrcSet`, `imageSizes`, and URL as the rendered `<picture>`;
- sets the rendered image to `loading="eager"` and `fetchpriority="high"`.

The media conditions prevent browsers from downloading both art-directed images. The existing mobile-image error fallback remains client-side and unchanged.

This behavior is shared by other above-the-fold CMS images only when their existing `priority` prop is enabled. Lazy images are unaffected.

### 2. Bundle font-face CSS with the application

Move the current font-face declarations into a repository-owned stylesheet imported by `globals.css`. It will include:

- pinned Cormorant Garamond and Inter declarations using their current family names and weights;
- Pretendard v1.3.9 variable dynamic-subset declarations;
- license and upstream attribution comments;
- absolute, version-pinned font-file URLs.

The font files can continue to use the existing long-lived font CDNs. Only the CSS discovery layer moves to the application bundle. This removes the external render-blocking stylesheet requests without adding 92 binary files to the repository.

`FontLinks` will keep only the font-file preconnect hints that remain useful. It will no longer emit stylesheet links to `fonts.googleapis.com` or the Pretendard CSS file.

### 3. Reduce Pretendard swaps with one variable face per Unicode subset

Use the official Pretendard v1.3.9 variable dynamic subset:

- 92 `@font-face` declarations instead of 828;
- one variable font face covering weights 45–920 per Unicode subset;
- the existing CSS family alias `Pretendard`, so component and token usage does not change;
- `font-display: swap`, preserving the current first-visit typography policy.

This reduces independent font downloads and swap events while preserving the same Pretendard outlines and weight range. `font-display: optional` is intentionally not used because it can leave first-time slow-network visitors on a fallback font for the entire page view.

### 4. Reserve a full viewport during streamed route loading

Change the shared site loading fallback from `80svh` to `100svh` on mobile. Desktop already reserves a full dynamic viewport. This does not delay route content or alter the finished page; it only keeps the footer outside the viewport until the streamed route is ready.

## Error And Fallback Behavior

- If the mobile image fails, the component continues to remove the mobile source and retry the desktop image.
- If a font CDN is unavailable, the existing system and serif fallbacks remain available.
- No CMS save path, cache invalidation path, or database schema changes.
- No mobile or desktop image value is rewritten.

## Testing

### Automated regression tests

- A priority responsive image emits distinct mobile and desktop preload calls with matching media conditions.
- A priority image uses eager loading and high fetch priority.
- A lazy image creates no preload and retains lazy loading.
- A missing mobile source preloads only the desktop source.
- Font CSS is imported locally and no external font stylesheet remains in `FontLinks`.
- Pretendard remains pinned to v1.3.9, uses one variable face per Unicode range, covers weights 45–920, and preserves `font-display: swap`.
- The site route loading fallback reserves `100svh` on mobile so streamed content cannot shift a visible footer.
- Existing mobile image fallback tests remain green.

### Build and browser verification

- Run the complete Node test suite, TypeScript, ESLint, and the production Next.js build.
- Inspect production HTML to confirm responsive image preloads appear in the document head before the Hero `<picture>`.
- At 390px, confirm only the mobile image request is issued; at 1280px, confirm only the desktop image request is issued.
- Confirm no external font CSS request is made.
- Compare representative Korean, English, and CMS pages for missing glyphs or changed font metrics.
- Measure mobile LCP and CLS on normal and throttled connections.

## Acceptance Criteria

- Mobile and desktop keep their current separate Hero images.
- The browser preloads exactly one matching Hero image and gives it high priority.
- External font CSS no longer appears in the request waterfall.
- Korean, English, and CMS text render without missing glyphs or visible metric changes.
- Desktop CLS remains 0 and normal mobile CLS remains below 0.1.
- Slow-network CLS improves from the reported 0.195 and should return below 0.1; if external timing prevents that result, the trace must identify the remaining layout-shift source before further changes.
- Mobile LCP improves from the reported 3.4 seconds. The target is 2.5 seconds or lower under the same measurement conditions; if it remains above target, the new trace must show a different bottleneck rather than the removed font CSS or missing Hero priority.

## Rollback

The change is isolated to responsive image resource hints and font loading. Rollback restores the previous `ResponsiveCmsImage`, external stylesheet links, and fixed-weight Pretendard subset URL. No content or database rollback is required.
