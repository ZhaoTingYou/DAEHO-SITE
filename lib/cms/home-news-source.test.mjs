import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const homePageSource = readFileSync(new URL('../../app/[locale]/(site)/page.tsx', import.meta.url), 'utf8');
const homeNewsPopupsSource = readFileSync(new URL('../../components/home/home-news-popups.tsx', import.meta.url), 'utf8');
const newsJournalGridSource = readFileSync(new URL('../../components/news/news-journal-grid.tsx', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('./public-content.ts', import.meta.url), 'utf8');
const pageCatalog = JSON.parse(readFileSync(new URL('./page-catalog.json', import.meta.url), 'utf8'));

test('home latest news is sourced from the News CMS list, not duplicated page JSON', () => {
  assert.match(homePageSource, /getHomeNewsCardsForSite/);
  assert.match(homePageSource, /await getHomeNewsCardsForSite\(locale\)/);
  assert.doesNotMatch(homePageSource, /getHomeNewsCardsFromPage/);
  assert.doesNotMatch(homePageSource, /latestNews\.cards/);
});

test('home CMS editor no longer exposes a separate latest news cards field', () => {
  const homePage = pageCatalog.find((page) => page.pageKey === 'home');
  const paths = homePage.fields.map((field) => field.path);

  assert.ok(paths.includes('latestNews.title'));
  assert.ok(paths.includes('latestNews.body'));
  assert.ok(!paths.includes('latestNews.cards'));
});

test('home news popup body prefers the selected News item body before the default copy', () => {
  assert.match(homeNewsPopupsSource, /splitModalBody\(activeCard\?\.body \?\? text\.body\)/);
});

test('home latest news cards and News page cards use the same portrait image frame', () => {
  assert.match(homeNewsPopupsSource, /: 'aspect-\[3\/4\]'/);
  assert.match(newsJournalGridSource, /aspect-\[3\/4\]/);
});

test('home and News cards render stored image filenames through the shared image source helper', () => {
  assert.match(homeNewsPopupsSource, /import \{imageSrc\} from '@\/lib\/image-src'/);
  assert.match(newsJournalGridSource, /import \{imageSrc\} from '@\/lib\/image-src'/);
  assert.match(homeNewsPopupsSource, /src=\{imageSrc\(card\.image\)\}/);
  assert.match(newsJournalGridSource, /src=\{imageSrc\(card\.image\)\}/);
});

test('News page CMS card image edits override public News item image paths', () => {
  assert.match(publicContentSource, /getNewsPageCardOverrides/);
  assert.match(publicContentSource, /applyNewsCardImageOverride/);
  assert.match(publicContentSource, /override\?\.image/);
});

test('CMS image normalization stores public image fields as bare filenames', () => {
  assert.match(publicContentSource, /\.replace\(\/\^images\\\//);
  assert.match(publicContentSource, /\.replace\(\/\^uploads\\\//);
  assert.doesNotMatch(publicContentSource, /normalized\.startsWith\('uploads\/'\)/);
});
