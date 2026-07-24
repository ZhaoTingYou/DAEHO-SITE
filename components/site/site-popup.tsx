'use client';

import {useCallback, useEffect, useMemo, useRef, useSyncExternalStore} from 'react';

import type {Locale} from '@/i18n/routing';
import {imageSrc} from '@/lib/image-src';
import {
  createSitePopupVersion,
  isSitePopupActive,
  isSitePopupDismissed,
  sitePopupStorageKeys,
  type SitePopupConfig
} from '@/lib/site-popup-core.mjs';

export function SitePopup({config, locale}: {config: SitePopupConfig; locale: Locale}) {
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
  const labels = locale === 'ko'
    ? {
        close: '팝업 닫기',
        never: '다시 보지 않기',
        dialog: '공지 팝업',
        image: '공지 이미지'
      }
    : {
        close: 'Close popup',
        never: 'Do not show again',
        dialog: 'Announcement popup',
        image: 'Announcement image'
      };

  const closeWithoutSaving = useCallback(() => {
    visibilityStore.hide();
  }, [visibilityStore]);

  const closePopup = useCallback(() => {
    visibilityStore.dismiss(neverShowRef.current?.checked === true);
  }, [visibilityStore]);

  useEffect(() => {
    if (!open) {
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
  }, [closePopup, open]);

  if (!isSitePopupActive(config) || !open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 md:p-8"
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
          className="absolute right-2 top-2 z-10 grid size-11 place-items-center border border-black/10 bg-white/95 text-2xl leading-none text-[#101827] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          ×
        </button>

        {/* CMS popup images have unknown intrinsic dimensions and must retain their natural ratio. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc(config.image)}
          alt={labels.image}
          onError={closeWithoutSaving}
          className="max-h-[75dvh] max-w-[88vw] object-contain"
        />

        <label className="flex min-h-11 items-center gap-2 px-2 pt-2 text-sm font-semibold text-[#101827]">
          <input
            ref={neverShowRef}
            type="checkbox"
            className="size-4 accent-[#7a2230]"
          />
          <span>{labels.never}</span>
        </label>
      </div>
    </div>
  );
}

function createPopupVisibilityStore(config: SitePopupConfig, version: string) {
  const listeners = new Set<() => void>();
  const keys = sitePopupStorageKeys(version);
  let hiddenInMemory = false;

  const getSnapshot = () => {
    if (hiddenInMemory || !isSitePopupActive(config) || typeof window === 'undefined') {
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
