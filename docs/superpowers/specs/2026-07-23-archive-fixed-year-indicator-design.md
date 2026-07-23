# Archive Fixed Year Indicator Design

## Goal

Make desktop Archive year changes feel calm and continuous when the active item changes frequently during horizontal scrolling.

## Interaction

- Keep one short burgundy indicator fixed at the vertical center of the year rail.
- Render up to seven year slots around the active year, with empty slots near the first and last entries so the active year always remains in the center slot.
- Move the year reel vertically with a smooth transform when the active index changes.
- Change only the centered year's color and opacity; do not move its text horizontally.
- Keep the existing previous and next controls and direct year selection.
- Preserve the compact/mobile Archive navigation unchanged.
- Disable reel animation for users who prefer reduced motion.

## Implementation Boundary

- Add a pure helper that returns the centered year slots, including edge padding.
- Update `ChronicleHorizontal` to render a stable reel and expose the active index as a CSS custom property.
- Replace per-row red dots and active horizontal translation with one fixed center indicator and vertical reel transitions.
- Add focused helper and integration tests for centering, boundaries, accessibility, and reduced-motion behavior.

## Acceptance Criteria

- The burgundy indicator never changes vertical position.
- The active year remains in the center slot for every slide, including the first and last slide.
- Switching adjacent years animates the reel rather than making the accent jump between rows.
- The desktop rail does not overflow the viewport.
- Mobile behavior and year anchors continue to work.
- Existing Archive tests, lint, and production build pass.
