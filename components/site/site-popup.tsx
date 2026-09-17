'use client';

import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {imageSrc} from '@/lib/image-src';
import {
  createSitePopupVersion,
  getActiveSitePopupItems,
  isSitePopupDismissed,
  sitePopupStorageKeys,
  type SitePopupConfig
} from '@/lib/site-popup-core.mjs';

type SitePopupLabels = {
  close: string;
  never: string;
  dialog: string;
  image: string;
  previous: string;
  next: string;
  pause: string;
  resume: string;
  select: string;
};

export function SitePopup({config, labels}: {config: SitePopupConfig; labels: SitePopupLabels}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [autoRotate, setAutoRotate] = useState(true);
  const activeItems = useMemo(
    () => getActiveSitePopupItems(config, now).filter((item) => !failedImages.has(imageFailureKey(item.id, item.image))),
    [config, failedImages, now]
  );
  const version = useMemo(() => createSitePopupVersion(config), [config]);
  const visibilityStore = useMemo(
    () => createPopupVisibilityStore(config, version),
    [config, version]
  );
  const open = useSyncExternalStore(
    visibilityStore.subscribe,
    visibilityStore.getSnapshot,
    visibilityStore.getServerSnapshot
  );
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const neverShowRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const displayIndex = activeIndex % Math.max(activeItems.length, 1);
  const activeItem = activeItems[displayIndex];
  const visibleOpen = open && Boolean(activeItem);

  const closePopup = useCallback(() => {
    visibilityStore.dismiss(neverShowRef.current?.checked === true);
  }, [visibilityStore]);

  const selectPrevious = useCallback(() => {
    setAutoRotate(false);
    setActiveIndex((index) => (index - 1 + activeItems.length) % activeItems.length);
  }, [activeItems.length]);

  const selectNext = useCallback(() => {
    setAutoRotate(false);
    setActiveIndex((index) => (index + 1) % activeItems.length);
  }, [activeItems.length]);

  const advanceNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % activeItems.length);
  }, [activeItems.length]);

  useEffect(() => {
    const boundaries = config.items
      .flatMap((item) => [Date.parse(item.startsAt), Date.parse(item.endsAt)])
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now);

    if (boundaries.length === 0) {
      return;
    }

    const nextBoundary = Math.min(...boundaries);
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(nextBoundary - now + 50, 2_147_483_647)
    );
    return () => window.clearTimeout(timer);
  }, [config.items, now]);

  useEffect(() => {
    if (!visibleOpen || !autoRotate || prefersReducedMotion || activeItems.length < 2) {
      return;
    }

    const timer = window.setInterval(advanceNext, 5000);
    return () => window.clearInterval(timer);
  }, [activeItems.length, advanceNext, autoRotate, prefersReducedMotion, visibleOpen]);

  useEffect(() => {
    if (!visibleOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopup();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>('button, input:not([disabled])')
      ];

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closePopup, visibleOpen]);

  if (!visibleOpen || !activeItem) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-primary/65 p-4 md:p-8"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          closePopup();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        className="relative flex max-h-[90dvh] max-w-[92vw] flex-col bg-white p-2 shadow-2xl md:p-3"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label={labels.close}
          onClick={closePopup}
          className="absolute right-2 top-2 z-10 grid size-11 place-items-center border border-hairline bg-white/95 text-2xl leading-none text-primary shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ×
        </button>

        {/* CMS popup images have unknown intrinsic dimensions and must retain their natural ratio. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeItem.id}
          src={imageSrc(activeItem.image)}
          alt={labels.image}
          onError={() => setFailedImages((current) => new Set(current).add(imageFailureKey(activeItem.id, activeItem.image)))}
          className="max-h-[75dvh] max-w-[88vw] object-contain"
        />

        {activeItems.length > 1 ? (
          <div className="flex min-h-12 items-center justify-center gap-3 px-2 pt-2" aria-label={`${displayIndex + 1} / ${activeItems.length}`}>
            <button
              type="button"
              aria-label={labels.previous}
              onClick={selectPrevious}
              className="grid size-10 place-items-center rounded-full border border-hairline text-xl text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ‹
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label={labels.dialog}>
              {activeItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === displayIndex}
                  aria-label={labels.select.replace('{number}', String(index + 1))}
                  onClick={() => {
                    setAutoRotate(false);
                    setActiveIndex(index);
                  }}
                  className={`min-h-10 min-w-10 rounded-full border px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    index === displayIndex
                      ? 'border-accent bg-accent text-white'
                      : 'border-hairline bg-white text-primary'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label={labels.next}
              onClick={selectNext}
              className="grid size-10 place-items-center rounded-full border border-hairline text-xl text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ›
            </button>
            <button
              type="button"
              aria-pressed={!autoRotate}
              onClick={() => setAutoRotate((playing) => !playing)}
              className="min-h-10 rounded-full border border-hairline px-3 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {autoRotate && !prefersReducedMotion ? labels.pause : labels.resume}
            </button>
          </div>
        ) : null}

        <label className="flex min-h-11 items-center gap-2 px-2 pt-2 text-sm font-semibold text-primary">
          <input
            ref={neverShowRef}
            type="checkbox"
            className="size-4 accent-accent"
          />
          <span>{labels.never}</span>
        </label>
      </div>
    </div>
  );
}

function imageFailureKey(id: string, image: string) {
  return `${id}\u0000${image}`;
}

function createPopupVisibilityStore(config: SitePopupConfig, version: string) {
  const listeners = new Set<() => void>();
  const keys = sitePopupStorageKeys(version);
  let hiddenInMemory = false;

  const getSnapshot = () => {
    if (hiddenInMemory || getActiveSitePopupItems(config).length === 0 || typeof window === 'undefined') {
      return false;
    }

    let sessionValue: string | null = null;
    let persistentValue: string | null = null;

    try {
      sessionValue = window.sessionStorage.getItem(keys.session);
      persistentValue = window.localStorage.getItem(keys.persistent);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }

    return !isSitePopupDismissed(version, sessionValue, persistentValue);
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === keys.persistent) {
          listener();
        }
      };

      window.addEventListener('storage', onStorage);

      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
    getSnapshot,
    getServerSnapshot: () => false,
    dismiss(persistent: boolean) {
      try {
        if (persistent) {
          window.localStorage.setItem(keys.persistent, version);
        } else {
          window.sessionStorage.setItem(keys.session, version);
        }
      } catch {
        // The in-memory state still closes the popup.
      }

      hiddenInMemory = true;
      notify();
    },
    hide() {
      hiddenInMemory = true;
      notify();
    }
  };
}
