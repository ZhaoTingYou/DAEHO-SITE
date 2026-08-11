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
