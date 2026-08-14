export const MOBILE_IMAGE_MEDIA = '(max-width: 767px)';
export const DESKTOP_IMAGE_MEDIA = '(min-width: 768px)';

export function getResponsiveImagePreloads({priority, desktop, mobile}) {
  if (!priority) {
    return [];
  }

  if (!mobile) {
    return [toPreload(desktop)];
  }

  return [
    toPreload(mobile, MOBILE_IMAGE_MEDIA),
    toPreload(desktop, DESKTOP_IMAGE_MEDIA)
  ];
}

function toPreload(resource, media) {
  return {
    href: resource.src,
    options: {
      as: 'image',
      fetchPriority: 'high',
      ...(resource.srcSet ? {imageSrcSet: resource.srcSet} : {}),
      ...(resource.sizes ? {imageSizes: resource.sizes} : {}),
      ...(media ? {media} : {})
    }
  };
}
