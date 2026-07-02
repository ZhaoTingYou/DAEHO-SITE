import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const localeLayoutSource = readFileSync(new URL('../app/[locale]/layout.tsx', import.meta.url), 'utf8');
const faviconSvgSource = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');

test('site favicon files use a square crawlable brand icon set', () => {
  assert.match(faviconSvgSource, /viewBox="0 0 192 192"/);
  assert.match(faviconSvgSource, /<rect[^>]+width="192"[^>]+height="192"/);

  assert.equal(pngDimensions('../public/icon-192.png').width, 192);
  assert.equal(pngDimensions('../public/icon-192.png').height, 192);
  assert.equal(pngDimensions('../public/apple-touch-icon.png').width, 180);
  assert.equal(pngDimensions('../public/apple-touch-icon.png').height, 180);
  assert.ok(existsSync(new URL('../public/favicon.ico', import.meta.url)));
});

test('localized pages advertise stable favicon URLs for Google and browsers', () => {
  assert.match(localeLayoutSource, /url: '\/favicon\.ico'/);
  assert.match(localeLayoutSource, /url: '\/favicon\.svg'/);
  assert.match(localeLayoutSource, /url: '\/icon-192\.png'/);
  assert.match(localeLayoutSource, /apple: \[\{url: '\/apple-touch-icon\.png'/);
});

function pngDimensions(path) {
  const buffer = readFileSync(new URL(path, import.meta.url));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}
