# Archive Year Navigation Design

## Goal

Keep the Archive year navigation usable when CMS editors add many timeline entries, without changing the horizontal desktop story or the linear mobile layout.

## Desktop Design

- Replace the full-height list with a fixed seven-item year window.
- Keep the active year near the center; shift the window automatically as the active slide changes.
- Add compact previous and next controls above and below the year window. Each control moves to the adjacent timeline entry.
- Show subtle top and bottom fades when more years exist outside the visible window.
- Preserve direct year-button navigation, keyboard focus, `aria-current`, and the existing scroll-to-slide behavior.
- Disable the previous or next control at the first or last year.

## Mobile Design

Keep the existing sticky horizontal year navigation and linear list. It already handles long timelines with horizontal overflow and does not create the desktop viewport overflow shown in the report. Generate anchors from the item index so repeated year labels never create duplicate React keys or duplicate element IDs.

## Data And Ownership

- CMS timeline data remains unchanged.
- `ChronicleHorizontal` owns the active index and passes it to a focused desktop navigation component.
- A pure helper calculates the visible seven-year slice so edge behavior can be tested independently.

## Verification

- Unit-test the visible-window calculation at the start, middle, end, and with fewer than seven entries.
- Run lint and production build.
- Check desktop and mobile screenshots, year navigation overflow, active-year visibility, and console errors.
