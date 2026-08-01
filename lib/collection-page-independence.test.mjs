import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const landingPageSource = readFileSync(
  new URL('../app/[locale]/(site)/mastery/creations/page.tsx', import.meta.url),
  'utf8'
);
const categoryPageSource = readFileSync(
  new URL('../app/[locale]/(site)/mastery/creations/_category-page.tsx', import.meta.url),
  'utf8'
);
const gallerySource = readFileSync(
  new URL('../components/specialty/specialty-collection-gallery.tsx', import.meta.url),
  'utf8'
);

test('Creations category selection renders without querying Collection records', () => {
  assert.doesNotMatch(
    landingPageSource,
    /getCollectionItemsForSite/,
    'the fixed category selector must not depend on Collection records'
  );
  assert.match(
    landingPageSource,
    /<SpecialtyCollectionGallery\s+filters=\{filters\}/,
    'the selector should render directly from its fixed category definitions'
  );
});

test('Appointment showcase does not receive or fetch Collection records', () => {
  assert.match(
    categoryPageSource,
    /categoryId === 'appointment'\s*\?\s*\[\]\s*:\s*await getCollectionItemsForSite/,
    'the appointment route should skip the Collection query'
  );

  const appointmentBranch = gallerySource.slice(
    gallerySource.indexOf("if (categoryId === 'appointment')"),
    gallerySource.indexOf('if (visibleItems.length === 0)')
  );
  const appointmentView = gallerySource.slice(
    gallerySource.indexOf('function AppointmentCollectionView('),
    gallerySource.indexOf('function AppointmentReveal(')
  );

  assert.doesNotMatch(appointmentBranch, /items=\{/);
  assert.doesNotMatch(appointmentView, /items: SpecialtyCollectionItem\[\]|EmptyState/);
});
