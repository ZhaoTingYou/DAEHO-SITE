# CMS Sidebar Independent Scroll Design

## Goal

Make the desktop CMS sidebar usable at short viewport heights by giving its navigation menu an independent vertical scroll area. The DAEHO brand remains fixed at the top, and the language switcher plus sign-out action remain fixed and visible at the bottom. The mobile CMS header and horizontal navigation remain unchanged.

## Chosen Layout

The desktop `aside` becomes a full-height flex column with clipped overflow:

1. The brand link is a non-scrolling, `shrink-0` header.
2. The navigation is the only flexible section. It uses `min-h-0`, `flex-1`, `overflow-y-auto`, and `overscroll-contain` so wheel input over the menu moves the menu without moving the page when the menu can consume the scroll.
3. A non-scrolling, `shrink-0` footer contains the interface-language switcher and sign-out form in normal document flow.

The navigation receives a stable scrollbar gutter and a narrow, high-contrast scrollbar that matches the dark CMS sidebar. The scrollbar is visible when the navigation content exceeds its available height. Existing link sizing and spacing are retained.

## Alternatives Considered

- Scroll the entire sidebar: simpler, but the brand and sign-out controls can leave the viewport. This conflicts with the approved behavior.
- Add JavaScript-driven custom scrolling: offers more visual control but adds event handling and accessibility risk for behavior that native CSS already provides.

## Components and Scope

- `app/admin/_components/admin-shell.tsx`
  - Recompose only the desktop sidebar classes and wrappers.
  - Remove absolute positioning from the bottom controls.
  - Leave the mobile header markup unchanged.
- `app/globals.css`
  - Add a narrowly scoped scrollbar style for the desktop CMS navigation if utility classes cannot express the required cross-browser styling cleanly.
- A focused admin shell regression test
  - Assert that the desktop sidebar is a bounded flex column.
  - Assert that the navigation owns vertical overflow and overscroll containment.
  - Assert that the footer controls are outside the scroll region and no longer absolutely positioned.

No CMS data, routes, authentication behavior, navigation items, or translations change.

## Accessibility and Failure Behavior

- Native scrolling preserves keyboard, wheel, trackpad, and assistive-technology behavior.
- Navigation links remain reachable by keyboard even when initially outside the visible scroll area; focusing a link lets the browser scroll it into view.
- The scrollbar has sufficient contrast against the dark sidebar without becoming visually dominant.
- If custom scrollbar rules are unsupported, the browser's native scrollbar remains functional.

## Verification

1. Run the focused regression test and confirm it fails before implementation and passes afterward.
2. Run the complete Node test suite, ESLint, TypeScript validation, and the production Next.js build.
3. At a desktop viewport with limited height, confirm:
   - the brand remains visible;
   - the middle navigation has `scrollHeight > clientHeight` and its `scrollTop` changes independently;
   - the language switcher and sign-out button remain visible;
   - the main content retains its own page scroll;
   - the mobile CMS header remains unchanged below the `lg` breakpoint.

## AWS Deployment

After all verification passes:

1. Commit the implementation on `main` and push the verified commit to `origin/main`.
2. Connect to the existing AWS Lightsail production host.
3. Fetch and fast-forward the production checkout to `origin/main`.
4. Rebuild only the affected `next` and `nginx` Docker Compose services.
5. Confirm the deployed commit, container health, and HTTP success for the public site and `/admin` login route.
6. Authenticate to the CMS using the existing browser session and repeat the short-height desktop sidebar check without modifying production CMS content.

The deployment must stop before rebuilding if the production checkout cannot fast-forward cleanly or if local verification fails.
