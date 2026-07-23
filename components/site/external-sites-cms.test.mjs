import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const header = stripComments(
  readFileSync(path.join(repoRoot, 'components/site/site-header.tsx'), 'utf8')
);
const footer = stripComments(
  readFileSync(path.join(repoRoot, 'components/site/site-footer.tsx'), 'utf8')
);
const layout = stripComments(
  readFileSync(path.join(repoRoot, 'app/[locale]/(site)/layout.tsx'), 'utf8')
);
const externalSiteMapPattern = /\{visibleExternalSites\.map\(\(item\) => \(\s*<ExternalSiteLink\s+key=\{item\.id\}\s+label=\{item\.label\}\s+href=\{item\.href\}\s+className="([^"]+)"\s*\/>\s*\)\)\}/g;
const visibleBlockPattern = /\{visibleExternalSites\.length > 0 \? \([\s\S]{0,900}?\{visibleExternalSites\.map\(\(item\) => \([\s\S]{0,500}?\)\)\}[\s\S]{0,500}?\) : null\}/g;
const desktopHeader = header.match(
  /<div className="hidden lg:block">([\s\S]*?)<div ref=\{mobileHeaderRef\}/
)?.[1] ?? '';
const mobileMenu = header.match(
  /<motion\.div\s+ref=\{mobileMenuPanelRef\}([\s\S]*?)<\/motion\.header>/
)?.[1] ?? '';
const footerMarkup = footer.match(/return \(\s*(<footer[\s\S]*?<\/footer>)/)?.[1] ?? '';

test('layout passes one CMS external-site snapshot to the header and footer', () => {
  assert.match(
    layout,
    /const externalSites = messages\.common\.footer\.externalSites\.items;/
  );
  assert.match(layout, /<SiteHeader[^>]*externalSites=\{externalSites\}[^>]*\/>/);
  assert.match(layout, /<SiteFooter[^>]*externalSites=\{externalSites\}[^>]*\/>/);
  assert.equal((layout.match(/externalSites=\{externalSites\}/g) ?? []).length, 2);

  assert.match(header, /SiteHeader\(\{locale, golfEnabled, externalSites\}/);
  assert.match(footer, /SiteFooter\(\{locale, golfEnabled, externalSites\}/);
  assert.match(header, /getVisibleExternalSites\(externalSites\)/);
  assert.match(footer, /getVisibleExternalSites\(externalSites\)/);
  assert.doesNotMatch(header, /footerText\.raw\('externalSites\.items'\)/);
  assert.doesNotMatch(footer, /text\.footer\.externalSites\.items/);
  assert.doesNotMatch(header, /showExternalHeaderLinks/);
  assert.doesNotMatch(footer, /showFooterExternalLinks/);
  assert.doesNotMatch(header, /externalLinks\./);
  assert.doesNotMatch(footer, /externalLinks\./);
});

test('all three public positions conditionally render keyed ExternalSiteLink items', () => {
  const renderedPositions = [desktopHeader, mobileMenu, footerMarkup];
  const maps = renderedPositions.map((position) => [
    ...position.matchAll(externalSiteMapPattern)
  ]);
  const blocks = renderedPositions.map((position) => [
    ...position.matchAll(visibleBlockPattern)
  ]);

  assert.deepEqual(maps.map((matches) => matches.length), [1, 1, 1]);
  assert.deepEqual(blocks.map((matches) => matches.length), [1, 1, 1]);
  assert.deepEqual(
    maps.map(([match]) => match[1]),
    [
      'site-nav-link shrink-0 no-underline',
      'site-nav-link no-underline',
      'footer-link'
    ]
  );
});

test('desktop external sites scroll without shrinking the permanent contact action', () => {
  assert.ok(desktopHeader, 'desktop header markup must be present');
  assert.match(
    desktopHeader,
    /<div className="flex min-w-0 items-center justify-end gap-2[^\"]*">/
  );
  assert.match(
    desktopHeader,
    /<div className="min-w-0 max-w-\[[^\"]+\] overflow-x-auto overscroll-x-contain">\s*<div className="flex w-max items-center gap-4">/
  );
  assert.match(
    desktopHeader,
    /className=\{`consult-cta shrink-0 \$\{isHeroTransparent/
  );
});
