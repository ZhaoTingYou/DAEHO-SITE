'use client';

import type {ReactNode} from 'react';

type ExternalSiteLinkProps = {
  label: string;
  href: string;
  className?: string;
  children?: ReactNode;
};

export function ExternalSiteLink({label, href, className = '', children}: ExternalSiteLinkProps) {
  const safeHref = getSafeExternalHref(href);
  const isEnabled = safeHref.length > 0;

  return (
    <a
      href={isEnabled ? safeHref : '#'}
      target={isEnabled ? '_blank' : undefined}
      rel={isEnabled ? 'noopener' : undefined}
      aria-label={children ? label : undefined}
      aria-disabled={!isEnabled}
      tabIndex={isEnabled ? undefined : -1}
      title={label}
      onClick={(event) => {
        if (!isEnabled) {
          event.preventDefault();
        }
      }}
      className={`${className} ${isEnabled ? '' : 'cursor-default opacity-70'}`}
    >
      {children ?? label}
    </a>
  );
}

function getSafeExternalHref(href: string) {
  const trimmedHref = href.trim();

  if (!trimmedHref) {
    return '';
  }

  try {
    const url = new URL(trimmedHref);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}
