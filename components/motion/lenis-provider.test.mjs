import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./lenis-provider.tsx', import.meta.url), 'utf8');

test('public route changes force native and Lenis scrolling back to the top', () => {
  assert.ok(source.includes("import {usePathname} from 'next/navigation'"));
  assert.ok(source.includes('const pathname = usePathname()'));
  assert.ok(
    source.includes("window.scrollTo({top: 0, left: 0, behavior: 'auto'})"),
    'native scrolling should reset without a visible smooth-scroll delay'
  );
  assert.ok(
    source.includes("lenisRef.current?.scrollTo(0, {immediate: true, force: true})"),
    'the active Lenis instance should reset immediately too'
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{[\s\S]*?window\.scrollTo\(\{top: 0, left: 0, behavior: 'auto'\}\)[\s\S]*?\}, \[pathname\]\)/,
    'the reset should run after every pathname change'
  );
});

test('browser history cannot restore a previous page scroll position', () => {
  assert.ok(source.includes("window.history.scrollRestoration = 'manual'"));
});
