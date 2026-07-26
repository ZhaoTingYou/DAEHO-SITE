import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

function source(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

const homePage = source('../app/[locale]/(site)/page.tsx');
const homeHero = source('./home/home-hero.tsx');
const heroMedia = source('./home/hero-media.tsx');
const archivePage = source('../app/[locale]/(site)/archive/page.tsx');
const archiveMobile = source('./chronicle/chronicle-mobile.tsx');
const heritageHero = source('./legacy/heritage-hero.tsx');
const loyaltyPage = source('./legacy/loyalty-commitment-page.tsx');
const loyaltyCarousel = source('./legacy/loyalty-feature-carousel.tsx');
const credibilityPage = source('./legacy/credibility-compliance-page.tsx');
const achievementPage = source('./legacy/achievement-records-page.tsx');
const techniquePage = source('../app/[locale]/(site)/mastery/technique/page.tsx');
const techniqueCarousel = source('./specialty/technique-carousel-section.tsx');
const makingPage = source('../app/[locale]/(site)/mastery/making/page.tsx');
const creationsPage = source('../app/[locale]/(site)/mastery/creations/page.tsx');
const creationsCategory = source('../app/[locale]/(site)/mastery/creations/_category-page.tsx');
const creationsGallery = source('./specialty/specialty-collection-gallery.tsx');

test('Home uses optional mobile Hero, video poster and Current Pulse images', () => {
  assert.match(homePage, /mobilePoster=\{optionalImage\(content, 'mobileImage'\)\}/);
  assert.match(homePage, /mobileVideoPoster=\{optionalImage\(content, 'mobileVideoPoster'\)\}/);
  assert.match(homePage, /mobileFilename=\{optionalImage\(currentPulse, 'primaryMobileImage'\)\}/);
  assert.match(homePage, /mobileFilename=\{optionalImage\(currentPulse, 'secondaryMobileImage'\)\}/);
  assert.match(homeHero, /mobilePoster\?: string/);
  assert.match(heroMedia, /ResponsiveCmsImage/);
  assert.match(heroMedia, /mobileFilename=\{resolvedMobilePoster\}/);
  assert.match(heroMedia, /useState<boolean \| null>\(null\)/);
  assert.match(heroMedia, /mobileViewport === null\s+\? undefined/);
  assert.match(heroMedia, /mobileViewport && mobileVideoPoster/);
});

test('Archive mobile cards use the mobile image while desktop keeps the existing image', () => {
  assert.match(archivePage, /mobileImage: imageSrc\(optionalImage\(item, 'mobileImage'\)\)/);
  assert.match(archiveMobile, /mobileImage=\{slide\.mobileImage\}/);
  assert.match(archiveMobile, /mobileFilename=\{mobileImage\}/);
});

test('Heritage Hero and Loyalty carousel consume their optional mobile images', () => {
  assert.match(heritageHero, /mobileImage\?: string/);
  assert.match(heritageHero, /mobileFilename=\{mobileImage\}/);
  assert.match(loyaltyPage, /mobileImage=\{optionalImage\(content\.hero, 'mobileImage'\)\}/);
  assert.match(credibilityPage, /mobileImage=\{optionalImage\(content\.hero, 'mobileImage'\)\}/);
  assert.match(achievementPage, /mobileImage=\{optionalImage\(content\.hero, 'mobileImage'\)\}/);
  assert.match(loyaltyCarousel, /mobileImage\?: string/);
  assert.match(loyaltyCarousel, /mobileFilename=\{activeSlide\.mobileImage\}/);
});

test('Technique and Making use mobile Hero images and Technique uses mobile carousel images', () => {
  assert.match(techniquePage, /mobileFilename=\{optionalImage\(content\.hero, 'mobileImage'\)\}/);
  assert.match(makingPage, /mobileFilename=\{optionalImage\(content\.hero, 'mobileImage'\)\}/);
  assert.match(techniqueCarousel, /mobileImage\?: string/);
  assert.match(techniqueCarousel, /mobileFilename=\{item\.mobileImage\}/);
});

test('Creations mobile category cards use mobileBackground without changing desktop stage artwork', () => {
  assert.match(creationsPage, /mobileBackground: optionalImage\(filter, 'mobileBackground'\)/);
  assert.match(creationsCategory, /mobileBackground: optionalImage\(filter, 'mobileBackground'\)/);
  assert.match(creationsGallery, /mobileBackground\?: string/);
  assert.match(creationsGallery, /mobileFilename=\{artwork\.mobileBackground\}/);
});
