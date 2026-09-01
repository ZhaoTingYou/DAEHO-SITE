export type WebLiveChatView =
  | 'closed_launcher'
  | 'registration'
  | 'waiting'
  | 'active'
  | 'closed'
  | 'temporarily_unavailable';

export type PublicMessage = {
  id: number;
  direction: 'team' | 'system';
  body: string;
  createdAt?: string;
};

export type WebLiveChatSessionInput = {
  available: boolean;
  conversation: {
    state: 'opening' | 'active' | 'closed' | 'needs_attention';
    lastReadTeamMessageId?: number;
  } | null;
  messages: Array<PublicMessage | {id: number; direction: 'visitor'; body: string; createdAt?: string}>;
  unreadCount: number;
};

export type WebLiveChatDurableEvent =
  | {type: 'message'; id: number; message: PublicMessage | {id: number; direction: 'visitor'; body: string}}
  | {type: 'state'; id: number; state: 'closed'; body: string; createdAt?: string};

export type WebLiveChatState = {
  panelOpen: boolean;
  hovered: boolean;
  launcherExpanded: false;
  view: WebLiveChatView;
  available: boolean;
  conversationState: 'opening' | 'active' | 'closed' | 'needs_attention' | null;
  messages: PublicMessage[];
  unread: number;
  lastReadTeamMessageId: number;
  highestTeamMessageId: number;
  highestDurableEventId: number;
  formDraft: {name: string; contact: string; content: string; consent: boolean};
  messageDraft: string;
  sendStatus: 'idle' | 'pending' | 'sent' | 'failed';
  sseFailures: number;
  polling: boolean;
  retryDelayMs: number;
};

export type WebLiveChatReducerEvent =
  | {type: 'hover'; active: boolean}
  | {type: 'toggle'}
  | {type: 'form_draft'; patch: Partial<WebLiveChatState['formDraft']>}
  | {type: 'message_draft'; body: string}
  | {type: 'send_pending' | 'send_succeeded' | 'send_failed'}
  | {type: 'session_loaded'; session: WebLiveChatSessionInput}
  | {type: 'conversation_closed'}
  | {type: 'new_consultation'}
  | {type: 'mark_read'; messageId?: number}
  | {type: 'durable_event'; event: WebLiveChatDurableEvent}
  | {type: 'sse_failure' | 'sse_connected'};

export function createWebLiveChatState(): WebLiveChatState;
export function reduceWebLiveChatState(
  state: WebLiveChatState,
  event: WebLiveChatReducerEvent
): WebLiveChatState;
export function visibleTeamMessages(messages: unknown): PublicMessage[];
export function shouldUsePolling(sseFailures: number): boolean;
export function unreadCount(session: unknown): number;
