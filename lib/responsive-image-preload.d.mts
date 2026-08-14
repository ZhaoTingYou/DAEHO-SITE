export const MOBILE_IMAGE_MEDIA: '(max-width: 767px)';
export const DESKTOP_IMAGE_MEDIA: '(min-width: 768px)';

export type ResponsiveImageResource = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

export type ResponsiveImagePreload = {
  href: string;
  options: {
    as: 'image';
    fetchPriority: 'high';
    imageSrcSet?: string;
    imageSizes?: string;
    media?: string;
  };
};

export function getResponsiveImagePreloads(input: {
  priority: boolean;
  desktop: ResponsiveImageResource;
  mobile?: ResponsiveImageResource;
}): ResponsiveImagePreload[];
