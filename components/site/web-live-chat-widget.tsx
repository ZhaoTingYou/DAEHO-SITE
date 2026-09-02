'use client';

import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {useCallback, useEffect, useId, useReducer, useRef, useState} from 'react';

import type {Locale} from '@/lib/locales';

import {
  connectEvents,
  createClientMessageKey,
  getMessages,
  getSession,
  markRead,
  sendVisitorMessage,
  startConversation,
  WebLiveChatApiError
} from './web-live-chat-api';
import {
  createWebLiveChatState,
  reduceWebLiveChatState
} from './web-live-chat-core.mjs';
import {
  createInvalidationQueue,
  createLogicalMutationController,
  createStableStreamController,
  loadMessagePages,
  nextFocusIndex
} from './web-live-chat-widget-core.mjs';

export type WebLiveChatCopy = {
  label: string;
  noSignIn: string;
  unreadLabel: string;
  openLabel: string;
  closeLabel: string;
  title: string;
  eyebrow: string;
  loadingLabel: string;
  registrationTitle: string;
  registrationBody: string;
  nameLabel: string;
  namePlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  consentLabel: string;
  privacyNote: string;
  startLabel: string;
  retryStartLabel: string;
  requiredError: string;
  submissionError: string;
  hydrationError: string;
  waitingTitle: string;
  waitingBody: string;
  retentionNote: string;
  activeTitle: string;
  teamLabel: string;
  systemLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  sendLabel: string;
  sendingLabel: string;
  sentLabel: string;
  inProgressLabel: string;
  sendError: string;
  retrySendLabel: string;
  reconnectingLabel: string;
  closedTitle: string;
  closedBody: string;
  newConsultationLabel: string;
  unavailableTitle: string;
  unavailableBody: string;
};

type StartStatus = 'idle' | 'pending' | 'accepted' | 'failed';
type ChatState = ReturnType<typeof createWebLiveChatState>;

const CLOSED_REFRESH_MS = 30_000;

const FOCUSABLE = [
  'button:not([disabled])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function WebLiveChatWidget({
  copy,
  locale,
  enabled
}: {
  copy: WebLiveChatCopy;
  locale: Locale;
  enabled: boolean;
}) {
  const [state, dispatch] = useReducer(
    reduceWebLiveChatState,
    undefined,
    createWebLiveChatState
  );
  const [initializing, setInitializing] = useState(false);
  const [startStatus, setStartStatus] = useState<StartStatus>('idle');
  const [startError, setStartError] = useState('');
  const [openCycle, setOpenCycle] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const reduceMotion = useReducedMotion();
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const startMutationRef = useRef(createLogicalMutationController(createClientMessageKey));
  const sendMutationRef = useRef(createLogicalMutationController(createClientMessageKey));
  const formStartedAtRef = useRef(0);
  const restoreFocusRef = useRef(false);
  const stateRef = useRef(state);
  const streamControllerRef = useRef(createStableStreamController(connectEvents));
  const announcedTeamIdRef = useRef(0);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const focusGenerationRef = useRef(0);
  const focusShellReadyRef = useRef(false);
  const focusContentReadyRef = useRef(false);
  const focusContainedRef = useRef(false);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshAuthoritative = useCallback(async () => {
    const session = await getSession();
    const fingerprint = session.conversation
      ? `${session.conversation.locale}|${session.conversation.createdAt}`
      : null;
    const changed = fingerprint !== stateRef.current.conversationFingerprint;
    const currentCursor = changed ? 0 : stateRef.current.highestDurableEventId;
    dispatch({
      type: 'session_metadata_loaded',
      session: {
        available: session.available,
        conversation: session.conversation,
        unreadCount: session.unreadCount
      }
    });
    if (!session.conversation) return session;

    dispatch({type: 'messages_merged', messages: session.messages});
    const sessionCursor = session.messages.reduce(
      (highest, message) => Math.max(highest, message.id),
      currentCursor
    );
    const page = await loadMessagePages(
      async (after) => (await getMessages(after)).items,
      sessionCursor
    );
    dispatch({type: 'messages_merged', messages: page.items});
    const newestTeamMessage = [...session.messages, ...page.items]
      .filter((message) => message.direction === 'team')
      .sort((left, right) => right.id - left.id)[0];
    if (newestTeamMessage && newestTeamMessage.id > announcedTeamIdRef.current) {
      announcedTeamIdRef.current = newestTeamMessage.id;
      setAnnouncement(newestTeamMessage.body);
    }
    return session;
  }, []);

  const closePanel = useCallback(() => {
    if (state.panelOpen) {
      focusGenerationRef.current += 1;
      focusContainedRef.current = false;
      restoreFocusRef.current = true;
      dispatch({type: 'toggle'});
    }
  }, [state.panelOpen]);

  const openPanel = useCallback(() => {
    formStartedAtRef.current = Date.now();
    const generation = focusGenerationRef.current + 1;
    focusGenerationRef.current = generation;
    focusShellReadyRef.current = Boolean(reduceMotion);
    focusContentReadyRef.current = false;
    focusContainedRef.current = false;
    setInitializing(true);
    setOpenCycle(generation);
    dispatch({type: 'toggle'});
  }, [reduceMotion]);

  useEffect(() => {
    if (!state.panelOpen) return;
    let active = true;
    refreshAuthoritative()
      .catch(() => {
        if (active) {
          dispatch({
            type: 'session_metadata_loaded',
            session: {available: false, conversation: null, unreadCount: 0}
          });
        }
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [openCycle, refreshAuthoritative, state.panelOpen]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        refreshAuthoritative().catch(() => undefined);
      }
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, refreshAuthoritative]);

  const tryEnterFocus = useCallback((generation: number) => {
    if (generation !== focusGenerationRef.current
        || !stateRef.current.panelOpen
        || !focusShellReadyRef.current
        || !focusContentReadyRef.current) return;
    focusContainedRef.current = true;
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.panelOpen) return;
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      if (!focusContainedRef.current) {
        event.preventDefault();
        return;
      }
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const targetIndex = nextFocusIndex(focusable.length, currentIndex, event.shiftKey);
      event.preventDefault();
      if (targetIndex < 0) dialog.focus();
      else focusable[targetIndex]?.focus();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!focusContainedRef.current || !dialog) return;
      if (event.target instanceof Node && dialog.contains(event.target)) return;
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialog).focus();
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [closePanel, state.panelOpen]);

  useEffect(() => {
    if (!state.panelOpen) return;
    const boundary = document.querySelector<HTMLElement>('.site-cursor-scope');
    if (!boundary) return;
    const outside = Array.from(boundary.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
        && !element.hasAttribute('data-site-floating-actions')
    );
    const previous = outside.map((element) => element.inert);
    outside.forEach((element) => { element.inert = true; });
    return () => outside.forEach((element, index) => { element.inert = previous[index] ?? false; });
  }, [state.panelOpen]);

  useEffect(() => {
    if (!state.panelOpen || !window.matchMedia('(max-width: 767px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [state.panelOpen]);

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('daeho-live-chat');
    const invalidation = createInvalidationQueue(async () => {
      await refreshAuthoritative().catch(() => undefined);
    });
    broadcastRef.current = channel;
    channel.onmessage = ({data}: MessageEvent<unknown>) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      const hint = data as {type?: unknown; messageId?: unknown};
      const validRead = hint.type === 'read' && Number.isSafeInteger(hint.messageId);
      if (validRead || hint.type === 'closed') invalidation.invalidate();
    };
    return () => {
      broadcastRef.current = null;
      invalidation.dispose();
      channel.close();
    };
  }, [enabled, refreshAuthoritative]);

  const streamEligible = state.conversationState === 'opening'
    || state.conversationState === 'active'
    || state.conversationState === 'needs_attention';

  useEffect(() => {
    if (state.panelOpen || !streamEligible) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAuthoritative().catch(() => undefined);
      }
    }, CLOSED_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshAuthoritative, state.panelOpen, streamEligible]);

  useEffect(() => {
    if (!state.panelOpen || !streamEligible) return;
    const stream = streamControllerRef.current;
    stream.open({
      probing: stateRef.current.polling,
      onEvent(event) {
        dispatch({type: 'sse_connected'});
        if (event.type === 'heartbeat') return;
        dispatch({type: 'durable_event', event});
        if (event.type === 'message' && event.id > announcedTeamIdRef.current) {
          announcedTeamIdRef.current = event.id;
          setAnnouncement(event.message.body);
        }
        if (event.type === 'state') broadcastRef.current?.postMessage({type: 'closed'});
      },
      onFailure() {
        dispatch({type: 'sse_failure'});
      }
    });
    const onPageHide = () => stream.close();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      stream.close();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [openCycle, state.panelOpen, streamEligible]);

  useEffect(() => {
    if (!state.polling) return;
    streamControllerRef.current.stopForPolling();
  }, [state.polling]);

  useEffect(() => {
    if (!state.panelOpen || !streamEligible || !state.polling) return;
    const timer = window.setInterval(() => {
      refreshAuthoritative().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshAuthoritative, state.panelOpen, state.polling, streamEligible]);

  useEffect(() => {
    if (!state.panelOpen
        || state.highestTeamMessageId <= state.lastReadTeamMessageId) return;
    const messageId = state.highestTeamMessageId;
    let active = true;
    markRead(messageId).then(() => {
      if (!active) return;
      dispatch({type: 'mark_read', messageId});
      broadcastRef.current?.postMessage({type: 'read', messageId});
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [state.highestTeamMessageId, state.lastReadTeamMessageId, state.panelOpen]);

  const changeForm = useCallback((patch: Partial<ChatState['formDraft']>) => {
    if (!startMutationRef.current.edit()) return;
    setStartStatus('idle');
    setStartError('');
    dispatch({type: 'form_draft', patch});
  }, []);

  const changeCompanyWebsite = useCallback((value: string) => {
    if (!startMutationRef.current.edit()) return;
    setCompanyWebsite(value);
  }, []);

  const submitStart = useCallback(async () => {
    const {name, contact, content, consent} = state.formDraft;
    if (name.trim().length < 2
        || contact.trim().length < 5
        || content.trim().length < 2
        || !consent) {
      setStartError(copy.requiredError);
      return;
    }
    const operationPayload = JSON.stringify({
      locale,
      name: name.trim(),
      contact: contact.trim(),
      content: content.trim(),
      consent,
      companyWebsite
    });
    const operation = startMutationRef.current.begin(operationPayload);
    if (!operation) return;
    setStartStatus('pending');
    setStartError('');
    try {
      await startConversation({
        locale,
        name: name.trim(),
        contact: contact.trim(),
        content: content.trim(),
        consent,
        consentVersion: 'web-live-chat-2026-09',
        companyWebsite,
        formStartedAt: formStartedAtRef.current,
        clientMessageKey: operation.key
      });
      if (!startMutationRef.current.finish(operation, 'accepted')) return;
      setStartStatus('accepted');
      try {
        await refreshAuthoritative();
      } catch {
        if (startMutationRef.current.isLocked()) {
          setStartError(copy.hydrationError);
        }
      }
    } catch (error) {
      const outcome = isDefinitiveMutationFailure(error)
        ? 'definitive_failure'
        : 'ambiguous_failure';
      if (!startMutationRef.current.finish(operation, outcome)) return;
      setStartStatus('failed');
      setStartError(copy.submissionError);
    }
  }, [companyWebsite, copy.hydrationError, copy.requiredError, copy.submissionError, locale, refreshAuthoritative, state.formDraft]);

  const changeMessage = useCallback((body: string) => {
    if (!sendMutationRef.current.edit()) return;
    dispatch({type: 'message_draft', body});
  }, []);

  const submitMessage = useCallback(async () => {
    const body = state.messageDraft.trim();
    if (!body) return;
    const operation = sendMutationRef.current.begin(body);
    if (!operation) return;
    dispatch({type: 'send_pending'});
    try {
      const response = await sendVisitorMessage(body, operation.key);
      if (response.status === 'sent') {
        if (!sendMutationRef.current.finish(operation, 'success')) return;
        dispatch({type: 'send_succeeded'});
        await refreshAuthoritative().catch(() => undefined);
      } else {
        if (!sendMutationRef.current.finish(operation, 'in_progress')) return;
        dispatch({type: 'send_in_progress'});
      }
    } catch (error) {
      const outcome = isDefinitiveMutationFailure(error)
        ? 'definitive_failure'
        : 'ambiguous_failure';
      if (!sendMutationRef.current.finish(operation, outcome)) return;
      dispatch({type: 'send_failed'});
    }
  }, [refreshAuthoritative, state.messageDraft]);

  const startNewConsultation = useCallback(() => {
    startMutationRef.current.reset();
    sendMutationRef.current.reset();
    formStartedAtRef.current = Date.now();
    setStartStatus('idle');
    setStartError('');
    setCompanyWebsite('');
    dispatch({type: 'new_consultation'});
  }, []);

  if (!enabled) return null;

  const transition = reduceMotion
    ? {duration: 0.12}
    : {layout: {duration: state.panelOpen ? 0.44 : 0.3, ease: [0.16, 1, 0.3, 1] as const}};

  return (
    <>
      <AnimatePresence initial={false}>
        {state.panelOpen ? (
          <motion.div
            data-web-live-chat-backdrop
            aria-hidden="true"
            className="pointer-events-auto fixed inset-0 z-[110] bg-[#071426]/45"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: reduceMotion ? 0.1 : 0.2}}
          />
        ) : null}
      </AnimatePresence>
      <motion.div
        data-web-live-chat-open={state.panelOpen ? 'true' : undefined}
        layout={!reduceMotion}
        transition={transition}
        whileHover={state.panelOpen || reduceMotion ? undefined : {y: -2, scale: 1.03}}
        onLayoutAnimationComplete={() => {
          if (stateRef.current.panelOpen) {
            focusShellReadyRef.current = true;
            tryEnterFocus(focusGenerationRef.current);
          } else if (restoreFocusRef.current) {
            restoreFocusRef.current = false;
            launcherRef.current?.focus();
          }
        }}
        className={state.panelOpen
          ? 'pointer-events-auto fixed inset-x-0 bottom-0 z-[120] flex h-[min(100dvh,46rem)] origin-bottom-right flex-col overflow-hidden rounded-t-[1.5rem] bg-[#F7F1E5] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_70px_rgba(5,16,31,0.28)] md:inset-x-auto md:bottom-8 md:right-8 md:h-[min(42rem,calc(100dvh-4rem))] md:w-[25rem] md:rounded-[1.5rem]'
          : 'pointer-events-auto fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] md:bottom-8 md:right-8'}
      >
        <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
        <AnimatePresence
          initial={false}
          mode="wait"
          onExitComplete={() => {
            if (reduceMotion && restoreFocusRef.current && !stateRef.current.panelOpen) {
              restoreFocusRef.current = false;
              launcherRef.current?.focus();
            }
          }}
        >
          {state.panelOpen ? (
            <motion.section
              key="dialog"
              ref={dialogRef}
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{opacity: 0}}
              animate={{
                opacity: 1,
                transition: {duration: reduceMotion ? 0.12 : 0.22, delay: reduceMotion ? 0 : 0.12}
              }}
              exit={{
                opacity: 0,
                transition: {duration: reduceMotion ? 0.12 : 0.18}
              }}
              onAnimationComplete={() => {
                if (!stateRef.current.panelOpen || openCycle !== focusGenerationRef.current) return;
                focusContentReadyRef.current = true;
                tryEnterFocus(openCycle);
              }}
              className="flex min-h-0 flex-1 flex-col text-[#101D30]"
            >
              <header className="flex min-h-16 items-center justify-between border-b border-[#C6AE78]/35 bg-[#101D30] px-5 text-white">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E4C77D]">{copy.eyebrow}</p>
                  <h2 id={titleId} className="font-heading text-lg font-semibold">{copy.title}</h2>
                </div>
                <button ref={closeRef} type="button" onClick={closePanel} aria-label={copy.closeLabel} className={iconButtonClass}>
                  <CloseIcon />
                </button>
              </header>

              {initializing ? (
                <div className="grid flex-1 place-items-center px-6" role="status">
                  <p className="text-sm text-[#34445A]">{copy.loadingLabel}</p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  {state.view === 'registration' ? (
                    <RegistrationView copy={copy} draft={state.formDraft} status={startStatus} error={startError} errorId={errorId} companyWebsite={companyWebsite} onCompanyWebsite={changeCompanyWebsite} onChange={changeForm} onSubmit={submitStart} />
                  ) : null}
                  {state.view === 'waiting' ? (
                    <ConversationView copy={copy} mode="waiting" state={state} onChange={changeMessage} onSubmit={submitMessage} />
                  ) : null}
                  {state.view === 'active' ? (
                    <ConversationView copy={copy} mode="active" state={state} onChange={changeMessage} onSubmit={submitMessage} />
                  ) : null}
                  {state.view === 'closed' ? (
                    <ClosedView copy={copy} messages={state.messages} onStartNew={startNewConsultation} />
                  ) : null}
                  {state.view === 'temporarily_unavailable' ? (
                    <StatusView title={copy.unavailableTitle} body={copy.unavailableBody} />
                  ) : null}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.button
              key="launcher"
              ref={launcherRef}
              type="button"
              onClick={openPanel}
              aria-label={copy.openLabel}
              className="relative flex min-h-16 items-center gap-3 rounded-full border border-white/15 bg-[#101D30] p-1.5 pr-5 text-left text-white shadow-[0_16px_42px_rgba(5,12,22,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C6AE78]"
            >
              <span aria-hidden="true" className="grid size-[52px] shrink-0 place-items-center rounded-full border border-[#C6AE78]/70 bg-[#172A44] text-[#E4C77D]">
                <ChatIcon />
              </span>
              <span>
                <span className="block font-heading text-sm font-semibold">{copy.label}</span>
                <span className="mt-0.5 block text-xs text-white/75">{copy.noSignIn}</span>
              </span>
              {state.unread > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full bg-[#C6AE78] px-1 text-xs font-bold text-[#101D30]" aria-label={`${copy.unreadLabel}: ${state.unread}`}>
                  {state.unread > 99 ? '99+' : state.unread}
                </span>
              ) : null}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function RegistrationView({copy, draft, status, error, errorId, companyWebsite, onCompanyWebsite, onChange, onSubmit}: {
  copy: WebLiveChatCopy;
  draft: ChatState['formDraft'];
  status: StartStatus;
  error: string;
  errorId: string;
  companyWebsite: string;
  onCompanyWebsite: (value: string) => void;
  onChange: (patch: Partial<ChatState['formDraft']>) => void;
  onSubmit: () => void;
}) {
  return (
    <form className="min-h-0 flex-1 overflow-y-auto px-5 py-6" onSubmit={(event) => { event.preventDefault(); onSubmit(); }} noValidate>
      <fieldset disabled={status === 'pending' || status === 'accepted'} className="m-0 min-w-0 border-0 p-0 disabled:opacity-75">
        <h3 className="font-heading text-2xl font-semibold">{copy.registrationTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-[#34445A]">{copy.registrationBody}</p>
        <div className="mt-6 space-y-4">
          <Field label={copy.nameLabel}>
            <input required minLength={2} maxLength={80} value={draft.name} onChange={(event) => onChange({name: event.target.value})} placeholder={copy.namePlaceholder} className={fieldClass} />
          </Field>
          <Field label={copy.contactLabel}>
            <input required minLength={5} maxLength={120} value={draft.contact} onChange={(event) => onChange({contact: event.target.value})} placeholder={copy.contactPlaceholder} autoComplete="email" className={fieldClass} />
          </Field>
          <Field label={copy.contentLabel}>
            <textarea required minLength={2} maxLength={2000} rows={4} value={draft.content} onChange={(event) => onChange({content: event.target.value})} placeholder={copy.contentPlaceholder} className={`${fieldClass} resize-none py-3`} />
          </Field>
          <div aria-hidden="true" className="absolute left-[-10000px] top-auto size-px overflow-hidden">
            <label>Website<input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => onCompanyWebsite(event.target.value)} /></label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-5 text-[#263A52]">
            <input type="checkbox" checked={draft.consent} onChange={(event) => onChange({consent: event.target.checked})} className="mt-0.5 size-5 shrink-0 accent-[#101D30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78135]" />
            <span>{copy.consentLabel}</span>
          </label>
          <p className="text-xs leading-5 text-[#526074]">{copy.privacyNote}</p>
          <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-[#9B2C2C]">{error}</p>
        </div>
        <button type="submit" disabled={status === 'pending' || status === 'accepted'} aria-describedby={error ? errorId : undefined} className={primaryButtonClass}>
          {status === 'pending' || status === 'accepted' ? copy.loadingLabel : status === 'failed' ? copy.retryStartLabel : copy.startLabel}
        </button>
      </fieldset>
    </form>
  );
}

function ConversationView({copy, mode, state, onChange, onSubmit}: {
  copy: WebLiveChatCopy;
  mode: 'waiting' | 'active';
  state: ChatState;
  onChange: (body: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl border border-[#C6AE78]/45 bg-white/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8B6D2F]">{mode === 'waiting' ? copy.waitingTitle : copy.activeTitle}</p>
          <p className="mt-2 text-sm leading-6 text-[#263A52]">{copy.waitingBody}</p>
          <p className="mt-2 text-xs leading-5 text-[#526074]">{copy.retentionNote}</p>
        </div>
        {state.polling || state.sseFailures > 0 ? (
          <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[#6B5730]"><span aria-hidden="true" className="size-2 rounded-full bg-[#A78135]" />{copy.reconnectingLabel}</p>
        ) : null}
        <MessageHistory copy={copy} messages={state.messages} />
      </div>
      <form className="border-t border-[#C6AE78]/30 bg-white/70 p-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <label className="block text-xs font-semibold text-[#263A52]">
          {copy.messageLabel}
          <textarea rows={2} maxLength={2000} value={state.messageDraft} onChange={(event) => onChange(event.target.value)} placeholder={copy.messagePlaceholder} disabled={state.sendStatus === 'pending'} className={`${fieldClass} mt-2 resize-none py-3`} />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className={`text-xs ${state.sendStatus === 'failed' ? 'text-[#9B2C2C]' : 'text-[#526074]'}`}>
            {state.sendStatus === 'sent'
              ? copy.sentLabel
              : state.sendStatus === 'in_progress'
                ? copy.inProgressLabel
                : state.sendStatus === 'failed'
                  ? copy.sendError
                  : ''}
          </p>
          <button type="submit" disabled={!state.messageDraft.trim() || state.sendStatus === 'pending'} className={`${primaryButtonClass} mt-0 w-auto min-w-28 px-5`}>
            {state.sendStatus === 'pending'
              ? copy.sendingLabel
              : state.sendStatus === 'failed' || state.sendStatus === 'in_progress'
                ? copy.retrySendLabel
                : copy.sendLabel}
          </button>
        </div>
      </form>
    </>
  );
}

function ClosedView({copy, messages, onStartNew}: {copy: WebLiveChatCopy; messages: ChatState['messages']; onStartNew: () => void}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <h3 className="font-heading text-2xl font-semibold">{copy.closedTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-[#34445A]">{copy.closedBody}</p>
      <MessageHistory copy={copy} messages={messages} />
      <button type="button" onClick={onStartNew} className={primaryButtonClass}>{copy.newConsultationLabel}</button>
    </div>
  );
}

function MessageHistory({copy, messages}: {copy: WebLiveChatCopy; messages: ChatState['messages']}) {
  return (
    <ol className="mt-5 space-y-2">
      {messages.map((message) => message.direction === 'visitor' ? (
        <li key={message.id} className="ml-auto w-fit max-w-[78%] rounded-2xl rounded-tr-sm bg-[#D9BF82] px-3.5 py-2.5 text-[#101D30] shadow-sm">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6">{message.body}</p>
        </li>
      ) : message.direction === 'team' ? (
        <li key={message.id} className="mr-auto w-fit max-w-[78%] rounded-2xl rounded-tl-sm bg-[#101D30] px-3.5 py-2.5 text-white shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E4C77D]">{copy.teamLabel}</p>
          <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6">{message.body}</p>
        </li>
      ) : (
        <li key={message.id} className="mx-auto w-fit max-w-[90%] rounded-full bg-[#E9E1D2] px-3 py-1.5 text-center text-xs leading-5 text-[#46566B]">
          <span className="sr-only">{copy.systemLabel}: </span>{message.body}
        </li>
      ))}
    </ol>
  );
}

function StatusView({title, body}: {title: string; body: string}) {
  return (
    <div className="grid flex-1 place-items-center px-8 text-center">
      <div><StatusIcon /><h3 className="mt-5 font-heading text-2xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#46566B]">{body}</p></div>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className="block text-sm font-semibold text-[#263A52]">{label}<span className="mt-2 block">{children}</span></label>;
}

const fieldClass = 'min-h-11 w-full rounded-xl border border-[#AFA58F] bg-white px-3 text-base text-[#101D30] outline-none placeholder:text-[#727C89] focus-visible:border-[#8B6D2F] focus-visible:ring-2 focus-visible:ring-[#C6AE78]/60 disabled:cursor-wait disabled:opacity-65';
const primaryButtonClass = 'mt-5 min-h-11 w-full rounded-full bg-[#101D30] px-6 text-sm font-semibold text-white shadow-sm transition-[transform,background-color] hover:bg-[#172A44] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78135] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none';
const iconButtonClass = 'grid size-11 place-items-center rounded-full text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C77D]';

function isDefinitiveMutationFailure(error: unknown) {
  return error instanceof WebLiveChatApiError && error.status >= 400 && error.status < 500;
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current" strokeWidth="1.7"><path d="M5.5 17.5 4 21l4.2-1.8A9 9 0 1 0 5.5 17.5Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 12h8M8 9h5" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="1.8"><path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" /></svg>;
}

function StatusIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="mx-auto size-12 fill-none stroke-[#A78135]" strokeWidth="1.5"><circle cx="24" cy="24" r="19" /><path d="M24 15v11M24 33h.01" strokeLinecap="round" /></svg>;
}
