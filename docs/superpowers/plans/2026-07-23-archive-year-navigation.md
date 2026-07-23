# Archive Year Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Archive desktop year navigation compact and usable with an arbitrary number of CMS timeline years.

**Architecture:** Extract a pure year-window calculation, render a focused desktop navigation component inside `ChronicleHorizontal`, and style it as a fixed seven-row viewport with adjacent-year controls and overflow fades. The existing mobile component and CMS schema remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Node test runner

## Global Constraints

- Do not change the Archive CMS timeline data shape.
- Show at most seven year buttons in the desktop navigation.
- Keep the active year visible and as close to the middle as possible.
- Keep the current mobile Archive experience unchanged.
- Keep mobile anchors unique when multiple entries share the same year label.
- Preserve keyboard focus, `aria-current`, and direct navigation to each visible year.

---

### Task 1: Year Window Logic

**Files:**
- Create: `components/chronicle/chronicle-year-window.ts`
- Test: `components/chronicle/chronicle-year-window.test.mjs`

**Interfaces:**
- Consumes: `totalItems: number`, `activeIndex: number`, `windowSize?: number`
- Produces: `getChronicleYearWindow(totalItems, activeIndex, windowSize)` returning `{start, end}` with an end-exclusive index

- [x] **Step 1: Write the failing test**

Cover a short list, start, middle, end, invalid active indexes, and even window sizes normalized to an odd count.

```js
assert.deepEqual(getChronicleYearWindow(4, 2), {start: 0, end: 4});
assert.deepEqual(getChronicleYearWindow(14, 0), {start: 0, end: 7});
assert.deepEqual(getChronicleYearWindow(14, 7), {start: 4, end: 11});
assert.deepEqual(getChronicleYearWindow(14, 13), {start: 7, end: 14});
assert.deepEqual(getChronicleYearWindow(14, -8), {start: 0, end: 7});
assert.deepEqual(getChronicleYearWindow(14, 7, 6), {start: 5, end: 10});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test components/chronicle/chronicle-year-window.test.mjs`

Expected: FAIL because the helper does not exist.

- [x] **Step 3: Write minimal implementation**

Clamp the active index, normalize the requested window to a positive odd number, center the active item when possible, and shift the window inward at the first and last entries.

```ts
export function getChronicleYearWindow(totalItems: number, activeIndex: number, windowSize = 7) {
  const total = Math.max(0, Math.trunc(totalItems));

  if (total === 0) {
    return {start: 0, end: 0};
  }

  const requestedSize = Math.max(1, Math.trunc(windowSize));
  const oddWindowSize = requestedSize % 2 === 0 ? requestedSize - 1 : requestedSize;
  const size = Math.min(total, oddWindowSize);
  const active = Math.min(total - 1, Math.max(0, Math.trunc(activeIndex)));
  const start = Math.min(Math.max(0, active - Math.floor(size / 2)), total - size);

  return {start, end: start + size};
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test components/chronicle/chronicle-year-window.test.mjs`

Expected: all tests pass.

### Task 2: Desktop Year Navigator

**Files:**
- Modify: `components/chronicle/chronicle-horizontal.tsx`
- Modify: `components/chronicle/chronicle-mobile.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `yearStops`, `activeIndex`, `scrollToChronicleYear(index)`
- Produces: a maximum of seven visible year buttons, previous and next controls, active-year state, overflow-fade state

- [x] **Step 1: Add the windowed navigation component**

Calculate the visible slice with `getChronicleYearWindow`, render only that slice, set `aria-current="step"` on the active year, and wire previous/next buttons to adjacent indices.

```tsx
const {start, end} = getChronicleYearWindow(yearStops.length, activeIndex);
const visibleYearStops = yearStops.slice(start, end);

<button onClick={() => scrollToChronicleYear(activeIndex - 1)} disabled={activeIndex === 0}>
  <span aria-hidden="true">↑</span>
</button>
{visibleYearStops.map((stop) => (
  <button aria-current={activeIndex === stop.index ? 'step' : undefined}>
    {stop.year}
  </button>
))}
<button
  onClick={() => scrollToChronicleYear(activeIndex + 1)}
  disabled={activeIndex === yearStops.length - 1}
>
  <span aria-hidden="true">↓</span>
</button>
```

- [x] **Step 2: Add fixed-height rail styles**

Use stable row dimensions, subtle overflow fades, icon-only arrow controls with labels, disabled states, and no page overflow.

```css
.chronicle-year-nav__list {
  display: grid;
  grid-auto-rows: 44px;
  align-content: center;
  min-height: 308px;
}

.chronicle-year-nav__step:disabled {
  opacity: .22;
  cursor: default;
}
```

- [x] **Step 3: Verify focused behavior**

Run: `node --test components/chronicle/chronicle-year-window.test.mjs`

Expected: all tests pass.

### Task 3: Project And Visual Verification

**Files:**
- Verify: `components/chronicle/chronicle-horizontal.tsx`
- Verify: `app/globals.css`

**Interfaces:**
- Consumes: completed Archive navigation implementation
- Produces: evidence that desktop and mobile layouts remain usable

- [x] **Step 1: Run static checks**

Run: `npm run lint`

Expected: zero errors.

- [x] **Step 2: Run production build**

Run: `npm run build`

Expected: successful Next.js build.

- [x] **Step 3: Run visual checks**

Use desktop and mobile browser viewports. Confirm the desktop rail stays within the viewport, the active year remains visible while navigating, mobile keeps its horizontal year list, there is no horizontal overflow, and the console has no errors.
