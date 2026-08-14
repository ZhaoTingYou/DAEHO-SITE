'use client';

import Image from 'next/image';
import {useCallback, useEffect, useId, useReducer, useRef} from 'react';

import {
  createKakaoContactState,
  isKakaoContactExpanded,
  reduceKakaoContactState,
  shouldCollapseKakaoContact
} from './kakao-contact-button-core.mjs';

export type KakaoContactCopy = {
  label: string;
  compactLabel: string;
  descriptor: string;
  noticeEyebrow: string;
  comingSoonTitle: string;
  comingSoonBody: string;
  closeLabel: string;
  ariaLabel: string;
};

export type KakaoContactButtonProps = {
  copy: KakaoContactCopy;
  onActivate?: () => void;
};

export function KakaoContactButton({copy, onActivate}: KakaoContactButtonProps) {
  const [state, dispatch] = useReducer(
    reduceKakaoContactState,
    undefined,
    createKakaoContactState
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const collapsedRef = useRef(state.collapsed);
  const noticeId = useId();
  const expanded = isKakaoContactExpanded(state);

  useEffect(() => {
    collapsedRef.current = state.collapsed;
  }, [state.collapsed]);

  useEffect(() => {
    let frame = 0;

    const updateScrollState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        dispatch({
          type: 'scroll',
          collapsed: shouldCollapseKakaoContact(window.scrollY, collapsedRef.current)
        });
      });
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, {passive: true});

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateScrollState);
    };
  }, []);

  const dismissNotice = useCallback((restoreFocus = true) => {
    dispatch({type: 'dismiss'});
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!state.noticeOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        dismissNotice();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissNotice();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dismissNotice, state.noticeOpen]);

  const handleActivate = () => {
    if (onActivate) {
      onActivate?.();
      return;
    }

    dispatch({type: 'toggle-notice'});
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none relative h-14 w-[13.5rem] md:h-16 md:w-[15.5rem]"
      onPointerEnter={() => dispatch({type: 'hover', active: true})}
      onPointerLeave={() => dispatch({type: 'hover', active: false})}
      onFocus={() => dispatch({type: 'focus', active: true})}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          dispatch({type: 'focus', active: false});
        }
      }}
    >
      {state.noticeOpen ? (
        <div
          id={noticeId}
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[min(19rem,calc(100vw-2rem))] max-w-[19rem] origin-bottom-right rounded-[10px] border border-[#C6AE78] bg-[#F7F3EA] px-5 py-4 pr-14 text-[#101D30] shadow-[0_18px_44px_rgba(16,29,48,0.18)] [animation:kakao-contact-notice-in_260ms_cubic-bezier(.16,1,.3,1)_both] motion-reduce:animate-none"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <Image
              src="/images/logo.png"
              alt=""
              width={381}
              height={339}
              className="absolute -bottom-7 right-7 h-auto w-24 opacity-[0.06]"
            />
          </span>
          <button
            type="button"
            aria-label={copy.closeLabel}
            onClick={() => dismissNotice()}
            className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full border border-[#C6AE78] bg-[#F7F3EA] text-[20px] font-light leading-none text-[#101D30] transition-[background-color,color,transform] duration-200 hover:bg-[#C6AE78]/20 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A2230] motion-reduce:transition-none"
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="relative z-[1] font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7A2230]">
            {copy.noticeEyebrow}
          </p>
          <p className="relative z-[1] mt-2 pr-2 font-heading text-[17px] font-semibold leading-snug text-[#101D30]">
            {copy.comingSoonTitle}
          </p>
          <p className="relative z-[1] mt-2 font-body text-[12px] leading-[1.65] text-[#101D30]/70">
            {copy.comingSoonBody}
          </p>
          <span
            data-kakao-certificate-connector
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 right-7 flex h-3 w-3 justify-center"
          >
            <span className="h-3 w-px bg-[#C6AE78]" />
            <span className="absolute -bottom-0.5 size-1 rounded-full bg-[#C6AE78]" />
          </span>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.ariaLabel}
        aria-expanded={state.noticeOpen}
        aria-controls={noticeId}
        onClick={handleActivate}
        className={`group pointer-events-auto absolute bottom-0 right-0 z-10 h-14 w-[13.5rem] cursor-pointer touch-manipulation select-none text-left transition-[clip-path,transform] duration-[280ms] ease-[cubic-bezier(.16,1,.3,1)] [clip-path:inset(0_0_0_var(--kakao-contact-inset)_round_var(--kakao-contact-radius))] active:translate-y-px focus-visible:outline-none motion-reduce:transition-none md:h-16 md:w-[15.5rem] ${
          expanded
            ? '[--kakao-contact-inset:0px] [--kakao-contact-radius:10px]'
            : '[--kakao-contact-inset:160px] [--kakao-contact-radius:999px] md:[--kakao-contact-inset:184px]'
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 right-7 bg-[#101D30] shadow-[0_14px_34px_rgba(16,29,48,0.24)] ring-1 ring-inset ring-[#C6AE78]/35 [clip-path:polygon(10px_0,100%_0,100%_100%,10px_100%,0_calc(100%-10px),0_10px)] group-focus-visible:ring-2 group-focus-visible:ring-[#F7F3EA] md:right-8"
        />

        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 right-14 flex min-w-0 items-center pl-5 pr-2 transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none md:right-16 md:pl-6 md:pr-3 ${
            expanded
              ? 'translate-x-0 opacity-100'
              : 'translate-x-3 opacity-0'
          }`}
        >
          <span className="min-w-0">
            <span className="block truncate font-heading text-[13px] font-semibold leading-tight tracking-[0.02em] md:text-[15px]">
              <span className="text-white md:hidden">{copy.compactLabel}</span>
              <span className="hidden text-white md:inline">{copy.label}</span>
            </span>
            <span className="mt-1 block truncate font-body text-[7px] font-semibold uppercase tracking-[0.16em] text-[#C6AE78] md:text-[8px]">
              {copy.descriptor}
            </span>
          </span>
        </span>

        <KakaoJewelrySignet />
      </button>
    </div>
  );
}

function KakaoJewelrySignet() {
  return (
    <span
      aria-hidden="true"
      className="absolute bottom-0 right-0 grid size-14 place-items-center rounded-full bg-[#101D30] shadow-[0_14px_34px_rgba(16,29,48,0.24)] ring-inset group-focus-visible:ring-2 group-focus-visible:ring-[#F7F3EA] md:size-16"
    >
      <span className="absolute inset-1 rounded-full bg-[#C6AE78] md:inset-[5px]" />
      <span className="absolute inset-[7px] grid place-items-center rounded-full bg-[#F7F3EA] md:inset-2">
        <Image
          src="/images/logo.png"
          alt=""
          width={381}
          height={339}
          className="h-[22px] w-[25px] object-contain md:h-[25px] md:w-[28px]"
        />
      </span>
      <span className="absolute bottom-0 right-0 grid size-4 place-items-center rounded-full bg-[#FEE500] shadow-[0_2px_7px_rgba(16,29,48,0.25)] ring-1 ring-[#101D30] md:size-[18px]">
        <svg viewBox="0 0 18 18" className="size-[11px] text-[#101D30] md:size-3">
          <path
            fill="currentColor"
            d="M9 3.2c-3.3 0-6 2.1-6 4.8 0 1.7 1.1 3.2 2.8 4.1l-.7 2.5 2.8-1.7c.4.1.7.1 1.1.1 3.3 0 6-2.1 6-4.9 0-2.7-2.7-4.9-6-4.9Z"
          />
        </svg>
      </span>
    </span>
  );
}
