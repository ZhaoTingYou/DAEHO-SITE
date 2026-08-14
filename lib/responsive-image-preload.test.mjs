import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

async function loadHelper() {
  const helper = await import('./responsive-image-preload.mjs').catch(() => null);
  assert.ok(helper, 'responsive image preload helper must exist');
  return helper;
}

const desktop = {
  src: '/_next/image?url=desktop&w=3840&q=75',
  srcSet: 'desktop-640 640w, desktop-1200 1200w',
  sizes: '100vw'
};

const mobile = {
  src: '/_next/image?url=mobile&w=3840&q=75',
  srcSet: 'mobile-640 640w, mobile-1200 1200w',
  sizes: '100vw'
};

test('priority art direction preloads one viewport-matched source at high priority', async () => {
  const {
    DESKTOP_IMAGE_MEDIA,
    MOBILE_IMAGE_MEDIA,
    getResponsiveImagePreloads
  } = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: true, desktop, mobile}), [
    {
      href: mobile.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: mobile.srcSet,
        imageSizes: mobile.sizes,
        media: MOBILE_IMAGE_MEDIA
      }
    },
    {
      href: desktop.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: desktop.srcSet,
        imageSizes: desktop.sizes,
        media: DESKTOP_IMAGE_MEDIA
      }
    }
  ]);
});

test('a priority desktop-only image has one unconditional preload', async () => {
  const {getResponsiveImagePreloads} = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: true, desktop}), [
    {
      href: desktop.src,
      options: {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: desktop.srcSet,
        imageSizes: desktop.sizes
      }
    }
  ]);
});

test('lazy images do not create resource hints', async () => {
  const {getResponsiveImagePreloads} = await loadHelper();

  assert.deepEqual(getResponsiveImagePreloads({priority: false, desktop, mobile}), []);
});

const responsiveImageSource = readFileSync(
  new URL('../components/responsive-cms-image.tsx', import.meta.url),
  'utf8'
);

test('ResponsiveCmsImage invokes React preloads and marks the selected image eager and high priority', () => {
  assert.match(responsiveImageSource, /import \{preload\} from 'react-dom'/);
  assert.match(responsiveImageSource, /getResponsiveImagePreloads/);
  assert.match(responsiveImageSource, /fetchPriority: priority \? 'high' : undefined/);
  assert.match(responsiveImageSource, /loading: priority \? 'eager' : loading/);
  assert.match(responsiveImageSource, /preload\(hint\.href, hint\.options\)/);
});
