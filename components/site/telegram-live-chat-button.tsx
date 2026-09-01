'use client';

import {useCallback, useEffect, useId, useReducer, useRef} from 'react';

import type {Locale} from '@/lib/locales';

import {
  createTelegramLiveChatState,
  isTelegramLiveChatExpanded,
  reduceTelegramLiveChatState,
  shouldCollapseTelegramLiveChat,
  telegramLiveChatUrl
} from './telegram-live-chat-button-core.mjs';

export type TelegramLiveChatCopy = {
  label: string;
  compactLabel: string;
  descriptor: string;
  noticeEyebrow: string;
  comingSoonTitle: string;
  comingSoonBody: string;
  closeLabel: string;
  unavailableAriaLabel: string;
  openAriaLabel: string;
};

export function TelegramLiveChatButton({
  copy,
  locale,
  enabled,
  botUsername
}: {
  copy: TelegramLiveChatCopy;
  locale: Locale;
  enabled: boolean;
  botUsername: string;
}) {
  const [state, dispatch] = useReducer(
    reduceTelegramLiveChatState,
    undefined,
    createTelegramLiveChatState
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const noticeId = useId();
  const expanded = isTelegramLiveChatExpanded(state);
  const chatUrl = enabled ? telegramLiveChatUrl(botUsername, locale) : '';

  useEffect(() => {
    let frame = 0;
    const updateScrollState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        dispatch({
          type: 'scroll',
          collapsed: shouldCollapseTelegramLiveChat(window.scrollY)
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
    if (!state.noticeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node
        && rootRef.current
        && !rootRef.current.contains(event.target)
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

  const triggerClassName = `pointer-events-auto absolute bottom-0 right-0 z-10 h-14 overflow-visible rounded-full touch-manipulation select-none text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#229ED9] md:h-16 ${
    expanded
      ? 'w-[min(13.5rem,calc(100vw-2rem))] md:w-[15.5rem]'
      : 'w-14 md:w-16'
  }`;
  const triggerContent = (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center rounded-full border border-white/20 bg-[#101D30]/[0.96] p-[5px] text-white shadow-[0_16px_42px_rgba(5,12,22,0.3)] backdrop-blur-xl transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
          expanded
            ? 'translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none translate-x-2 scale-95 opacity-0'
        }`}
      >
        <TelegramSealMark className="size-[46px] shrink-0 md:size-[54px]" />
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
        <TelegramSealMark className="size-[46px] md:size-[54px]" />
      </span>
    </>
  );

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
      {state.noticeOpen && !chatUrl ? (
        <div
          id={noticeId}
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[min(19rem,calc(100vw-2rem))] origin-bottom-right rounded-xl border border-white/20 bg-[#101D30]/[0.98] px-5 py-4 pr-14 text-white shadow-[0_20px_52px_rgba(5,12,22,0.32)] backdrop-blur-xl [animation:live-chat-notice-in_260ms_cubic-bezier(.16,1,.3,1)_both] motion-reduce:animate-none"
        >
          <button
            type="button"
            aria-label={copy.closeLabel}
            onClick={() => dismissNotice()}
            className="absolute right-2 top-2 grid size-11 place-items-center rounded-full border border-white/15 text-[20px] font-light leading-none text-white/75 transition-[background-color,color,transform] duration-200 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9] motion-reduce:transition-none"
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
          <span aria-hidden="true" className="absolute -bottom-[6px] right-6 size-3 rotate-45 border-b border-r border-white/20 bg-[#101D30]" />
        </div>
      ) : null}

      {chatUrl ? (
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.openAriaLabel}
          className={triggerClassName}
        >
          {triggerContent}
        </a>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-label={copy.unavailableAriaLabel}
          aria-expanded={state.noticeOpen}
          aria-controls={noticeId}
          onClick={() => dispatch({type: 'toggle-notice'})}
          className={triggerClassName}
        >
          {triggerContent}
        </button>
      )}
    </div>
  );
}

function TelegramSealMark({className}: {className: string}) {
  return (
    <span className={`relative grid place-items-center overflow-hidden rounded-full bg-[#229ED9] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] ${className}`}>
      <svg viewBox="0 0 52 52" className="size-[62%]" aria-hidden="true">
        <path
          fill="currentColor"
          d="M42.1 10.9 35.9 40c-.5 2.1-1.8 2.6-3.6 1.6l-9.5-7-4.6 4.4c-.5.5-.9.9-1.9.9l.7-9.7 17.7-16c.8-.7-.2-1.1-1.2-.4L11.7 27.6l-9.4-3c-2-.6-2.1-2 .4-3L39.4 7.5c1.7-.6 3.2.4 2.7 3.4Z"
        />
      </svg>
    </span>
  );
}
