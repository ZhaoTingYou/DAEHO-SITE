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
const externalSiteMapPattern = /\{visibleExternalSites\.map\(\(item\) => \(\s*<ExternalSiteLink[\s\S]{0,700}?(?:\/>|<\/ExternalSiteLink>)\s*\)\)\}/g;
const visibleBlockPattern = /\{visibleExternalSites\.length > 0 \? \([\s\S]{0,1500}?\{visibleExternalSites\.map\(\(item\) => \([\s\S]{0,900}?\)\)\}[\s\S]{0,500}?\) : null\}/g;
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

  assert.match(header, /SiteHeader\(\{locale, englishEnabled, golfEnabled, externalSites\}/);
  assert.match(footer, /SiteFooter\(\{locale, englishEnabled, golfEnabled, externalSites\}/);
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
  assert.match(
    desktopHeader,
    /className=\{`site-header-external-link site-header-external-link--/
  );
  assert.match(mobileMenu, /className="mobile-external-site-link"/);
  assert.match(footerMarkup, /className="footer-link"/);
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

test('header external sites use bordered destination buttons without arrows or footer changes', () => {
  const globalStyles = stripComments(
    readFileSync(path.join(repoRoot, 'app/globals.css'), 'utf8')
  );

  assert.match(
    desktopHeader,
    /site-header-external-link--\$\{isHeroTransparent \? 'light' : 'dark'\}/
  );
  assert.doesNotMatch(desktopHeader, /site-external-link-arrow|↗/);
  assert.match(
    mobileMenu,
    /className="mobile-external-site-link"/
  );
  assert.doesNotMatch(mobileMenu, /site-external-link-arrow|↗/);
  assert.doesNotMatch(globalStyles, /\.site-external-link-arrow/);
  assert.match(
    globalStyles,
    /\.site-header-external-link\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?isolation:\s*isolate;[\s\S]*?font-weight:\s*500;/
  );
  assert.match(
    globalStyles,
    /\.site-header-external-link::before\s*\{[\s\S]*?inset:\s*4px 0;[\s\S]*?border:\s*1px solid var\(--external-link-border\);[\s\S]*?border-radius:\s*4px;/
  );
  assert.match(
    globalStyles,
    /\.mobile-external-site-link\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*48px;[\s\S]*?justify-content:\s*space-between;/
  );
  assert.doesNotMatch(footerMarkup, /site-header-external-link|mobile-external-site-link/);
});
