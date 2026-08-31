'use client';

import {useState} from 'react';

export function ShareLinkButton({copy}: {copy: {label: string; copied: string}}) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    if (isSharing) {
      return;
    }

    const url = window.location.href;
    setIsSharing(true);

    try {
      if (navigator.share) {
        await navigator.share({url});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error('Sharing is not supported');
      }

      setIsCompleted(true);
      window.setTimeout(() => setIsCompleted(false), 3200);
    } catch {
      setIsCompleted(false);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      aria-busy={isSharing}
      className={`group inline-flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-8 border px-4 pl-5 font-body text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition duration-200 ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none disabled:cursor-wait disabled:opacity-70 md:w-auto md:min-w-[190px] ${
        isCompleted
          ? 'border-accent bg-accent'
          : 'border-primary bg-primary hover:border-accent hover:bg-accent'
      }`}
    >
      <span aria-live="polite">{isCompleted ? copy.copied : copy.label}</span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 transition duration-200 ease-brand group-hover:border-white/45 group-hover:bg-white/15 motion-reduce:transition-none">
        {isCompleted ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="1.8">
            <path d="m6.75 12.25 3.35 3.35 7.15-7.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="1.6">
            <path d="M12 15.5V4.75m0 0L8.25 8.5M12 4.75l3.75 3.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 11.75v5.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-5.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
