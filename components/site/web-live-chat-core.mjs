const TEAM_DIRECTIONS = new Set(['team', 'system']);

function openView(state) {
  if (state.available === false) {
    return 'temporarily_unavailable';
  }
  if (state.conversationState === 'closed') {
    return 'closed';
  }
  if (state.conversationState === 'active') {
    return 'active';
  }
  if (state.conversationState === 'opening' || state.conversationState === 'needs_attention') {
    return 'waiting';
  }
  return 'registration';
}

export function visibleTeamMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  const seen = new Set();
  return messages.filter((message) => {
    const id = durableId(message?.id);
    if (!id || seen.has(id) || !TEAM_DIRECTIONS.has(message?.direction)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function createWebLiveChatState() {
  return {
    panelOpen: false,
    hovered: false,
    launcherExpanded: false,
    view: 'closed_launcher',
    available: true,
    conversationState: null,
    messages: [],
    unread: 0,
    lastReadTeamMessageId: 0,
    highestDurableEventId: 0,
    formDraft: {name: '', contact: '', content: '', consent: false},
    messageDraft: '',
    sendStatus: 'idle',
    sseFailures: 0,
    polling: false,
    retryDelayMs: 0
  };
}

export function reduceWebLiveChatState(state, event) {
  switch (event.type) {
    case 'sse_failure': {
      const sseFailures = state.sseFailures + 1;
      return {
        ...state,
        sseFailures,
        polling: shouldUsePolling(sseFailures),
        retryDelayMs: Math.min(30_000, 1000 * (2 ** (sseFailures - 1)))
      };
    }
    case 'sse_connected':
      return {...state, sseFailures: 0, polling: false, retryDelayMs: 0};
    case 'durable_event': {
      const incoming = event.event;
      const id = durableId(incoming?.id);
      if (!id || state.messages.some((message) => message.id === id)) {
        return state;
      }
      let message;
      let conversationState = state.conversationState;
      if (incoming.type === 'message'
          && durableId(incoming.message?.id) === id
          && incoming.message?.direction === 'team') {
        message = incoming.message;
      } else if (incoming.type === 'state'
          && incoming.state === 'closed'
          && typeof incoming.body === 'string') {
        message = {
          id,
          direction: 'system',
          body: incoming.body,
          createdAt: incoming.createdAt
        };
        conversationState = 'closed';
      } else {
        return state;
      }
      const next = {
        ...state,
        conversationState,
        messages: [...state.messages, message].sort((left, right) => left.id - right.id),
        highestDurableEventId: Math.max(state.highestDurableEventId, id),
        unread: state.panelOpen || id <= state.lastReadTeamMessageId
          ? state.unread
          : state.unread + 1
      };
      return {...next, view: next.panelOpen ? openView(next) : 'closed_launcher'};
    }
    case 'session_loaded': {
      const session = event.session ?? {};
      const messages = visibleTeamMessages(session.messages);
      const next = {
        ...state,
        available: session.available !== false,
        conversationState: session.conversation?.state ?? null,
        messages,
        unread: unreadCount(session),
        lastReadTeamMessageId: durableId(session.conversation?.lastReadTeamMessageId),
        highestDurableEventId: messages.reduce(
          (highest, message) => Math.max(highest, durableId(message.id)), 0
        )
      };
      return {...next, view: next.panelOpen ? openView(next) : 'closed_launcher'};
    }
    case 'mark_read': {
      const messageId = durableId(event.messageId || state.highestDurableEventId);
      if (!messageId) {
        return state;
      }
      return {
        ...state,
        lastReadTeamMessageId: Math.max(state.lastReadTeamMessageId, messageId),
        unread: state.messages.filter((message) => message.id > messageId).length
      };
    }
    case 'conversation_closed': {
      const next = {...state, conversationState: 'closed'};
      return {...next, view: next.panelOpen ? 'closed' : 'closed_launcher'};
    }
    case 'new_consultation': {
      const reset = createWebLiveChatState();
      return {
        ...reset,
        panelOpen: state.panelOpen,
        hovered: state.hovered,
        available: state.available,
        view: state.panelOpen
          ? (state.available === false ? 'temporarily_unavailable' : 'registration')
          : 'closed_launcher'
      };
    }
    case 'message_draft':
      return {...state, messageDraft: String(event.body ?? ''), sendStatus: 'idle'};
    case 'send_pending':
      return {...state, sendStatus: 'pending'};
    case 'send_succeeded':
      return {...state, messageDraft: '', sendStatus: 'sent'};
    case 'send_failed':
      return {...state, sendStatus: 'failed'};
    case 'form_draft':
      return {...state, formDraft: {...state.formDraft, ...event.patch}};
    case 'hover':
      return {...state, hovered: Boolean(event.active)};
    case 'toggle': {
      const panelOpen = !state.panelOpen;
      return {
        ...state,
        panelOpen,
        view: panelOpen ? openView(state) : 'closed_launcher'
      };
    }
    default:
      return state;
  }
}

function durableId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function unreadCount(session) {
  const supplied = session?.unreadCount ?? session?.unread;
  if (supplied !== undefined) {
    return Number.isSafeInteger(supplied) && supplied > 0 ? supplied : 0;
  }
  const cursor = durableId(
    session?.lastReadTeamMessageId ?? session?.conversation?.lastReadTeamMessageId
  );
  return visibleTeamMessages(session?.messages).filter((message) => message.id > cursor).length;
}

export function shouldUsePolling(sseFailures) {
  return Number.isFinite(sseFailures) && sseFailures >= 3;
}
