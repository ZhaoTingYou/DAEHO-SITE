# CMS Sidebar Independent Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the desktop CMS navigation an independent vertical scrollbar while keeping the DAEHO brand and bottom language/sign-out controls fixed, then deploy the verified change to AWS Lightsail.

**Architecture:** Recompose the existing desktop `AdminShell` sidebar as a bounded flex column. The navigation is the only `flex-1` overflow container; the brand and controls are non-scrolling siblings. A narrowly scoped global CSS class supplies a native thin scrollbar without JavaScript.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Node.js built-in test runner, Docker Compose, AWS Lightsail.

## Global Constraints

- Desktop behavior applies at the existing `lg` breakpoint only; the mobile CMS header and horizontal navigation remain unchanged.
- The DAEHO brand stays visible at the top.
- The interface-language switcher and sign-out action stay visible at the bottom.
- Only the middle navigation scrolls vertically.
- Do not change CMS data, routes, authentication, navigation items, or translations.
- Use native CSS scrolling; do not add a JavaScript scrolling dependency.
- Deploy only after focused tests, the full source suite, ESLint, TypeScript, and the production build pass.
- Rebuild only the production `next` and `nginx` services; do not modify production CMS content.

---

## File Structure

- Create `app/admin/admin-shell-scroll.test.mjs`: source-level regression coverage for the sidebar scroll contract and scoped scrollbar styling.
- Modify `app/admin/_components/admin-shell.tsx`: desktop sidebar flex structure and fixed footer controls.
- Modify `app/globals.css`: cross-browser native scrollbar appearance scoped to `.admin-sidebar-scroll`.

### Task 1: Add the desktop sidebar scroll contract

**Files:**
- Create: `app/admin/admin-shell-scroll.test.mjs`
- Modify: `app/admin/_components/admin-shell.tsx:34-58`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `AdminShell`, `navItems`, `AdminLanguageSwitcher`, and `logoutAction`.
- Produces: `.admin-sidebar-scroll`, the only vertically scrollable desktop sidebar region.

- [ ] **Step 1: Write the failing regression test**

Create `app/admin/admin-shell-scroll.test.mjs`:

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const shell = readFileSync(new URL('./_components/admin-shell.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');

test('desktop CMS sidebar keeps only its navigation independently scrollable', () => {
  assert.match(shell, /<aside className="[^"]*h-dvh[^"]*flex-col[^"]*overflow-hidden[^"]*lg:flex/);
  assert.match(
    shell,
    /<nav className="admin-sidebar-scroll [^"]*min-h-0[^"]*flex-1[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*\[scrollbar-gutter:stable\]"/
  );
});

test('desktop CMS sidebar keeps language and sign-out controls outside the scroll region', () => {
  assert.match(shell, /<div className="shrink-0 [^"]*">\s*<AdminLanguageSwitcher[\s\S]*?<form action=\{logoutAction\}/);
  assert.doesNotMatch(shell, /absolute bottom-(?:20|5)/);
});

test('desktop CMS navigation uses a scoped native scrollbar', () => {
  assert.match(globals, /\.admin-sidebar-scroll\s*\{[\s\S]*scrollbar-width:\s*thin;/);
  assert.match(globals, /\.admin-sidebar-scroll::-webkit-scrollbar-thumb/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test app/admin/admin-shell-scroll.test.mjs
```

Expected: FAIL because the sidebar lacks `h-dvh flex-col overflow-hidden lg:flex`, the navigation lacks overflow ownership, the controls are absolutely positioned, and the scrollbar class is absent.

- [ ] **Step 3: Implement the minimal sidebar structure**

In `app/admin/_components/admin-shell.tsx`, replace the desktop sidebar block with this structure while preserving the existing link/button classes and labels:

```tsx
<aside className="admin-on-dark fixed inset-y-0 left-0 hidden h-dvh w-64 flex-col overflow-hidden border-r border-[#d9dee7] bg-[#101827] px-4 py-5 text-[#ffffff] lg:flex">
  <Link href="/admin" className="block shrink-0 border-b border-white/10 pb-5">
    {/* existing brand content */}
  </Link>
  <nav className="admin-sidebar-scroll mt-6 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
    {/* existing navItems mapping */}
  </nav>
  <div className="shrink-0 space-y-3 border-t border-white/10 pt-4">
    <AdminLanguageSwitcher activeLocale={adminLocale} label={t('shell.interfaceLanguage')} />
    <form action={logoutAction}>
      {/* existing sign-out button */}
    </form>
  </div>
</aside>
```

- [ ] **Step 4: Add the scoped native scrollbar style**

Append to `app/globals.css` outside existing media-query blocks:

```css
.admin-sidebar-scroll {
  scrollbar-color: rgba(255, 255, 255, 0.38) transparent;
  scrollbar-width: thin;
}

.admin-sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.admin-sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.admin-sidebar-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.38);
  background-clip: padding-box;
}

.admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.56);
  background-clip: padding-box;
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
node --test app/admin/admin-shell-scroll.test.mjs
```

Expected: 3 tests pass and 0 fail.

- [ ] **Step 6: Run focused lint and TypeScript validation**

Run:

```bash
npx eslint app/admin/_components/admin-shell.tsx app/admin/admin-shell-scroll.test.mjs
npx tsc --noEmit
```

Expected: both commands exit 0 without errors.

- [ ] **Step 7: Commit the implementation**

```bash
git add app/admin/admin-shell-scroll.test.mjs app/admin/_components/admin-shell.tsx app/globals.css
git commit -m "feat: add independent CMS sidebar scrolling"
```

Expected: one focused feature commit containing only the three listed files.

### Task 2: Verify the complete application

**Files:**
- Verify only; no production file changes expected.

**Interfaces:**
- Consumes: the Task 1 sidebar layout and existing application test/build commands.
- Produces: release evidence for the exact commit that will be pushed.

- [ ] **Step 1: Run the complete source test suite**

```bash
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
```

Expected: zero failures.

- [ ] **Step 2: Run full lint, TypeScript validation, and production build**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all three commands exit 0 and the Next.js production build completes.

- [ ] **Step 3: Review the release diff**

```bash
git diff --check origin/main...HEAD
git status --short
git log --oneline origin/main..HEAD
```

Expected: no whitespace errors, a clean worktree, and only the design, plan, and sidebar feature commits ahead of `origin/main`.

### Task 3: Push, deploy to AWS Lightsail, and verify production

**Files:**
- No repository files modified.

**Interfaces:**
- Consumes: verified `main` commit, production SSH key, existing `/home/ubuntu/daeho-site` checkout, and Docker Compose project `daeho-prod`.
- Produces: deployed CMS sidebar behavior on `https://daeho.works/admin`.

- [ ] **Step 1: Push verified `main`**

```bash
git push origin main
```

Expected: `origin/main` advances to the verified local commit.

- [ ] **Step 2: Confirm the production checkout can update cleanly**

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && git status --short && git branch --show-current && git fetch origin main && git rev-list --left-right --count HEAD...origin/main'
```

Expected: production is on `main`, the checkout is clean, and it is only behind `origin/main`. Stop before rebuilding if these conditions are false.

- [ ] **Step 3: Fast-forward and rebuild affected services**

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 \
  'cd /home/ubuntu/daeho-site && git merge --ff-only origin/main && sudo docker compose -p daeho-prod up -d --build next nginx && sudo docker compose -p daeho-prod ps && git rev-parse --short HEAD'
```

Expected: `next` and `nginx` rebuild successfully, all production services remain healthy/running, and the reported commit matches local `HEAD`.

- [ ] **Step 4: Verify public production health**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://daeho.works/ko
curl -sS -o /dev/null -w '%{http_code}\n' https://daeho.works/admin
```

Expected: both routes return HTTP 200.

- [ ] **Step 5: Verify the authenticated CMS sidebar in a browser**

At `https://daeho.works/admin`, use a desktop viewport shorter than the full menu, such as 1280 × 600, and confirm:

- the desktop sidebar uses `display: flex` and remains exactly one viewport high;
- `.admin-sidebar-scroll` has `scrollHeight > clientHeight`;
- wheel/trackpad input over the navigation changes its `scrollTop` without moving the page while the navigation can consume the scroll;
- the DAEHO brand, language switcher, and sign-out button remain visible before and after menu scrolling;
- the mobile header remains unchanged at a viewport below 1024px;
- the browser console contains no new errors.

- [ ] **Step 6: Record final release evidence**

```bash
git rev-parse --short HEAD
git status --short --branch
```

Expected: local `main` is clean and synchronized with `origin/main`; report this commit together with test, build, container, HTTP, and browser verification results.
