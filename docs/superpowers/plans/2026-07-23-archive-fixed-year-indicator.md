# Archive Fixed Year Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jumping per-year red dot with a stationary center indicator while the desktop Archive years move smoothly behind it.

**Architecture:** The desktop rail renders the complete year list inside a seven-row clipped viewport. A pure layout helper clamps the active index and supplies the centered reel offset; CSS moves the reel by one fixed 44px row per active-year change while one pseudo-element remains fixed at the viewport center.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Node test runner

## Global Constraints

- Keep one short burgundy indicator fixed at the vertical center of the year rail.
- Keep the active year in the center slot, including the first and final years.
- Show at most seven visible rows and use blank edge space where neighboring years do not exist.
- Do not change compact/mobile Archive navigation.
- Respect `prefers-reduced-motion: reduce`.
- Add no dependencies.

---

### Task 1: Define the centered reel layout

**Files:**
- Modify: `components/chronicle/chronicle-year-window.ts`
- Modify: `components/chronicle/chronicle-year-window.test.mjs`

**Interfaces:**
- Produces: `getChronicleYearReelLayout(totalItems: number, activeIndex: number, visibleRows?: number): ChronicleYearReelLayout`
- Produces: `{activeIndex: number; centerRow: number; visibleRows: number}`

- [ ] **Step 1: Write failing helper tests**

Assert that 14 years with active indices `0`, `7`, and `13` return a fixed `centerRow: 3`, `visibleRows: 7`, and clamped active indices. Assert an empty list returns active index `0`, and an even requested row count is normalized to the next smaller odd count.

- [ ] **Step 2: Run the helper test and verify failure**

Run:

```bash
node --test components/chronicle/chronicle-year-window.test.mjs
```

Expected: FAIL because `getChronicleYearReelLayout` is not exported.

- [ ] **Step 3: Implement the pure layout helper**

Use this return shape:

```ts
export type ChronicleYearReelLayout = {
  activeIndex: number;
  centerRow: number;
  visibleRows: number;
};
```

Clamp `activeIndex` to the available items, normalize `visibleRows` to an odd positive number, and derive `centerRow` with `Math.floor(visibleRows / 2)`.

- [ ] **Step 4: Run the helper test and verify it passes**

Run the same Node test command. Expected: all helper cases pass.

---

### Task 2: Render a stable desktop year reel

**Files:**
- Modify: `components/chronicle/chronicle-horizontal.tsx`
- Modify: `components/chronicle/chronicle-year-window.test.mjs`

**Interfaces:**
- Consumes: `getChronicleYearReelLayout`
- Exposes CSS properties: `--chronicle-active-index` and `--chronicle-center-row`

- [ ] **Step 1: Write failing integration assertions**

Require the desktop component to render every `yearStops` entry, set the two CSS variables on `.chronicle-year-nav__list`, and retain `aria-current="step"`, previous/next controls, and boundary disabled states. Reject `yearStops.slice(start, end)`.

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
node --test components/chronicle/chronicle-year-window.test.mjs
```

Expected: FAIL because the component still renders a changing slice.

- [ ] **Step 3: Replace the sliced window with the full reel**

Call the helper with `yearStops.length` and `activeIndex`, render `yearStops.map`, and pass the clamped active index plus center row through `CSSProperties`. Keep click and accessibility behavior unchanged.

- [ ] **Step 4: Run the test and verify it passes**

Expected: all helper and component source assertions pass.

---

### Task 3: Style the stationary indicator and moving reel

**Files:**
- Modify: `app/globals.css`
- Modify: `components/chronicle/chronicle-year-window.test.mjs`

**Interfaces:**
- Consumes: `--chronicle-active-index`, `--chronicle-center-row`
- Keeps: `44px` year row and `308px` seven-row viewport

- [ ] **Step 1: Write failing CSS assertions**

Require `.chronicle-year-nav__window` to own one centered indicator pseudo-element, require `.chronicle-year-nav__list` to translate by the active index, reject per-year red-dot pseudo-elements, and require a reduced-motion override that removes the reel transition.

- [ ] **Step 2: Run the test and verify failure**

Run the focused Node test. Expected: FAIL on the new fixed-indicator and transform assertions.

- [ ] **Step 3: Implement the CSS motion**

Use top and bottom padding equal to three rows, translate the reel with:

```css
transform: translate3d(
  0,
  calc((var(--chronicle-center-row) - var(--chronicle-active-index)) * 44px),
  0
);
```

Place one short burgundy line at `top: 50%` in the window, remove horizontal movement from active year text, and transition transform with the existing Archive easing token.

- [ ] **Step 4: Add reduced-motion handling**

Inside `@media (prefers-reduced-motion: reduce)`, set `.chronicle-year-nav__list { transition: none; }`.

- [ ] **Step 5: Run focused tests**

Expected: all Archive year navigation tests pass.

---

### Task 4: Regression and visual verification

**Files:**
- Verify: `mobile-public-site.test.mjs`
- Verify: `components/chronicle/chronicle-year-window.test.mjs`

**Interfaces:**
- Produces no new runtime interface.

- [ ] **Step 1: Run Archive and mobile regression tests**

```bash
node --test components/chronicle/chronicle-year-window.test.mjs mobile-public-site.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run static checks**

```bash
npm run lint
npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 3: Rebuild the local Docker frontend**

```bash
HTTP_PORT=18180 docker compose -p daeho-local up -d --build next nginx
```

Expected: local `next` and `nginx` containers are running.

- [ ] **Step 4: Visually inspect desktop and mobile**

On desktop, verify the center indicator position does not move while adjacent year controls change the active year, the year reel animates vertically, and horizontal overflow is `0`. On a `390x844` mobile viewport, verify the existing sticky horizontal year navigation remains unchanged and horizontal overflow is `0`.

- [ ] **Step 5: Commit and deploy**

Stage only the plan, helper, component, CSS, and focused test. Commit with `Refine Archive year transitions`, push `codex/spring-boot-cms-migration`, rebuild production `next` and `nginx`, and verify `https://daeho.works/ko/archive` returns HTTP `200`.
