'use client';

import {useRouter} from 'next/navigation';

type HistoryBackButtonProps = {
  fallbackHref: string;
  ariaLabel: string;
  className?: string;
};

export function HistoryBackButton({
  fallbackHref,
  ariaLabel,
  className
}: HistoryBackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={handleClick} aria-label={ariaLabel} className={className}>
      <span aria-hidden="true">←</span>
    </button>
  );
}
