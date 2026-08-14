'use client';

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
      className="pointer-events-none relative h-14 w-[min(13.5rem,calc(100vw-2rem))] md:h-16 md:w-[15.5rem]"
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
          className="pointer-events-auto absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[min(19rem,calc(100vw-2rem))] origin-bottom-right rounded-xl border border-white/20 bg-[#101D30]/[0.98] px-5 py-4 pr-14 text-white shadow-[0_20px_52px_rgba(5,12,22,0.32)] backdrop-blur-xl [animation:kakao-contact-notice-in_260ms_cubic-bezier(.16,1,.3,1)_both] motion-reduce:animate-none"
        >
          <button
            type="button"
            aria-label={copy.closeLabel}
            onClick={() => dismissNotice()}
            className="absolute right-2 top-2 grid size-11 place-items-center rounded-full border border-white/15 text-[20px] font-light leading-none text-white/75 transition-[background-color,color,transform] duration-200 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A2230] motion-reduce:transition-none"
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C6AE78]">
            {copy.noticeEyebrow}
          </p>
          <p className="mt-2 pr-2 font-heading text-[17px] font-semibold leading-snug text-white">
            {copy.comingSoonTitle}
          </p>
          <p className="mt-2 font-body text-[12px] leading-[1.65] text-white/65">
            {copy.comingSoonBody}
          </p>
          <span
            aria-hidden="true"
            className="absolute -bottom-[6px] right-6 size-3 rotate-45 border-b border-r border-white/20 bg-[#101D30]"
          />
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.ariaLabel}
        aria-expanded={state.noticeOpen}
        aria-controls={noticeId}
        onClick={handleActivate}
        className={`pointer-events-auto absolute bottom-0 right-0 z-10 h-14 overflow-visible rounded-full touch-manipulation select-none text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7A2230] md:h-16 ${
          expanded
            ? 'w-[min(13.5rem,calc(100vw-2rem))] md:w-[15.5rem]'
            : 'w-14 md:w-16'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center rounded-full border border-white/20 bg-[#101D30]/[0.96] p-[5px] text-white shadow-[0_16px_42px_rgba(5,12,22,0.3)] backdrop-blur-xl transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
            expanded
              ? 'translate-x-0 scale-100 opacity-100'
              : 'pointer-events-none translate-x-2 scale-95 opacity-0'
          }`}
        >
          <KakaoTalkSealMark className="size-[46px] shrink-0 md:size-[54px]" />
          <span className="min-w-0 px-3 md:px-4">
            <span className="block truncate font-heading text-[13px] font-semibold leading-tight tracking-[0.02em] md:text-[15px]">
              <span className="md:hidden">{copy.compactLabel}</span>
              <span className="hidden md:inline">{copy.label}</span>
            </span>
            <span className="mt-1 block truncate font-body text-[7px] font-semibold uppercase tracking-[0.16em] text-white/55 md:text-[8px]">
              {copy.descriptor}
            </span>
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`absolute bottom-0 right-0 grid size-14 place-items-center rounded-full border border-white/20 bg-[#101D30]/[0.96] p-[5px] shadow-[0_16px_42px_rgba(5,12,22,0.3)] backdrop-blur-xl transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none md:size-16 ${
            expanded
              ? 'pointer-events-none translate-x-2 scale-90 opacity-0'
              : 'translate-x-0 scale-100 opacity-100'
          }`}
        >
          <span className="absolute -inset-1 -rotate-[28deg] rounded-full border border-[#C6AE78]/80 [clip-path:polygon(0_0,72%_0,72%_100%,0_100%)]" />
          <KakaoTalkSealMark className="size-[46px] md:size-[54px]" />
        </span>
      </button>
    </div>
  );
}

function KakaoTalkSealMark({className}: {className: string}) {
  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-full bg-[#FEE500] text-[#191600] shadow-[inset_0_0_0_1px_rgba(25,22,0,0.08)] ${className}`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full" aria-hidden="true">
        <path
          fill="currentColor"
          d="M26 10C16.6 10 9 15.8 9 23c0 4.6 3.1 8.7 7.9 11l-2 7 8.2-4.9c.9.1 1.9.2 2.9.2 9.4 0 17-5.8 17-13.1C43 15.8 35.4 10 26 10Z"
        />
      </svg>
      <span className="relative mt-[-2px] font-body text-[7px] font-bold tracking-[-0.04em] text-[#FEE500] md:text-[8px]">
        TALK
      </span>
    </span>
  );
}
