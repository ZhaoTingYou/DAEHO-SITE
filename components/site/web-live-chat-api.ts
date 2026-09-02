const API_ROOT = '/api/live-chat';
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_EVENT_BYTES = 64 * 1024;
const CONVERSATION_STATES = new Set(['opening', 'active', 'closed', 'needs_attention']);
const LOCALES = new Set(['ko', 'en']);

export type WebLiveChatConversation = {
  state: 'opening' | 'active' | 'closed' | 'needs_attention';
  locale: 'ko' | 'en';
  createdAt: string;
  closedAt: string | null;
  lastReadTeamMessageId: number;
};

export type WebLiveChatMessage = {
  id: number;
  direction: 'visitor' | 'team' | 'system';
  body: string;
  createdAt: string;
};

export type WebLiveChatSession = {
  available: boolean;
  conversation: WebLiveChatConversation | null;
  messages: WebLiveChatMessage[];
  unreadCount: number;
};

export type WebLiveChatEvent =
  | {type: 'message'; id: number; message: WebLiveChatMessage}
  | {
    type: 'state';
    id: number;
    state: 'closed';
    body: string;
    createdAt: string;
  }
  | {type: 'heartbeat'; at: string};

export type StartConversationInput = {
  locale: 'ko' | 'en';
  name: string;
  contact: string;
  content: string;
  consent: boolean;
  consentVersion: string;
  companyWebsite?: string;
  formStartedAt: string | number;
  clientMessageKey: string;
};

export class WebLiveChatApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'WebLiveChatApiError';
    this.status = status;
  }
}

export async function getSession(): Promise<WebLiveChatSession> {
  return request(`${API_ROOT}/session`, parseSession);
}

export async function startConversation(input: StartConversationInput): Promise<{
  conversation: WebLiveChatConversation;
}> {
  const clientMessageKey = requireClientMessageKey(input.clientMessageKey);
  return request(`${API_ROOT}/conversations`, parseConversationResponse, jsonWrite('POST', {
    ...input,
    companyWebsite: input.companyWebsite ?? '',
    clientMessageKey
  }));
}

export async function sendVisitorMessage(
  body: string,
  clientMessageKey: string
): Promise<{messageId: number; status: 'sent' | 'in_progress'}> {
  return request(
    `${API_ROOT}/conversations/current/messages`,
    parseSendResponse,
    jsonWrite('POST', {body, clientMessageKey: requireClientMessageKey(clientMessageKey)})
  );
}

export async function getMessages(after = 0): Promise<{items: WebLiveChatMessage[]}> {
  const cursor = positiveInteger(after) ?? 0;
  return request(`${API_ROOT}/conversations/current/messages?after=${cursor}`, parseMessagesResponse);
}

export async function markRead(messageId: number): Promise<{
  conversation: WebLiveChatConversation;
}> {
  const cursor = positiveInteger(messageId);
  if (cursor === null) {
    throw new TypeError('messageId must be a positive safe integer.');
  }
  return request(
    `${API_ROOT}/conversations/current/read`,
    parseConversationResponse,
    jsonWrite('POST', {messageId: cursor})
  );
}

export function connectEvents(
  onEvent: (event: WebLiveChatEvent) => void,
  onFailure: () => void
): () => void {
  const source = new EventSource(`${API_ROOT}/conversations/current/events`, {
    withCredentials: true
  });
  let active = true;

  source.addEventListener('message', (rawEvent) => {
    const event = parseMessageEvent(rawEvent);
    if (active && event) {
      onEvent(event);
    }
  });
  source.addEventListener('state', (rawEvent) => {
    const event = parseStateEvent(rawEvent);
    if (active && event) {
      onEvent(event);
    }
  });
  source.addEventListener('heartbeat', (rawEvent) => {
    const payload = eventPayload(rawEvent);
    if (active && typeof payload?.at === 'string') {
      onEvent({type: 'heartbeat', at: payload.at});
    }
  });
  source.onerror = () => {
    if (active) {
      onFailure();
    }
  };

  return () => {
    active = false;
    source.close();
  };
}

function parseMessageEvent(rawEvent: Event): WebLiveChatEvent | null {
  const event = rawEvent as MessageEvent<string>;
  const payload = eventPayload(event);
  const id = durableEventId(event, payload);
  if (id === null
      || typeof payload?.body !== 'string'
      || typeof payload?.createdAt !== 'string'
      || ('direction' in payload && payload.direction !== 'team')) {
    return null;
  }
  return {
    type: 'message',
    id,
    message: {id, direction: 'team', body: payload.body, createdAt: payload.createdAt}
  };
}

function parseStateEvent(rawEvent: Event): WebLiveChatEvent | null {
  const event = rawEvent as MessageEvent<string>;
  const payload = eventPayload(event);
  const id = durableEventId(event, payload);
  if (id === null
      || payload?.state !== 'closed'
      || typeof payload.body !== 'string'
      || typeof payload.createdAt !== 'string'
      || ('direction' in payload && payload.direction !== 'system')) {
    return null;
  }
  return {
    type: 'state', id, state: 'closed', body: payload.body, createdAt: payload.createdAt
  };
}

function eventPayload(event: Event): Record<string, unknown> | null {
  const data = (event as MessageEvent<unknown>).data;
  if (typeof data !== 'string' || data.length > MAX_EVENT_BYTES) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function durableEventId(
  event: MessageEvent<string>,
  payload: Record<string, unknown> | null
): number | null {
  const payloadId = positiveInteger(payload?.id);
  const streamId = positiveInteger(Number(event.lastEventId));
  return payloadId !== null && streamId === payloadId ? payloadId : null;
}

export function createClientMessageKey(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireClientMessageKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('clientMessageKey must be a string containing 20 to 100 characters.');
  }
  const length = Array.from(value).length;
  if (length < 20 || length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError('clientMessageKey must be a string containing 20 to 100 characters.');
  }
  return value;
}

function jsonWrite(method: 'POST', value: unknown): RequestInit {
  return {
    method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(value)
  };
}

async function request<T>(
  path: string,
  parse: (value: unknown) => T,
  init: RequestInit = {}
): Promise<T> {
  if (!path.startsWith(`${API_ROOT}/`)) {
    throw new TypeError('Live-chat requests must use same-origin API paths.');
  }
  const response = await fetch(path, {...init, credentials: 'same-origin'});
  const payload = await readJson(response);
  if (!response.ok) {
    throw new WebLiveChatApiError(response.status, errorMessage(payload, response.status));
  }
  try {
    return parse(payload);
  } catch (error) {
    if (error instanceof WebLiveChatApiError) {
      throw error;
    }
    throw new WebLiveChatApiError(response.status, 'Live-chat response had an invalid shape.');
  }
}

function parseSession(value: unknown): WebLiveChatSession {
  const object = responseObject(value);
  if (typeof object.available !== 'boolean'
      || !Array.isArray(object.messages)
      || !nonnegativeInteger(object.unreadCount)) {
    throw new TypeError('Invalid session response.');
  }
  return {
    available: object.available,
    conversation: object.conversation === null
      ? null
      : parseConversation(object.conversation),
    messages: projectPublicMessages(object.messages),
    unreadCount: object.unreadCount
  };
}

function parseConversationResponse(value: unknown): {conversation: WebLiveChatConversation} {
  const object = responseObject(value);
  return {conversation: parseConversation(object.conversation)};
}

function parseSendResponse(value: unknown): {
  messageId: number;
  status: 'sent' | 'in_progress';
} {
  const object = responseObject(value);
  const messageId = positiveInteger(object.messageId);
  if (messageId === null
      || (object.status !== 'sent' && object.status !== 'in_progress')) {
    throw new TypeError('Invalid send response.');
  }
  return {messageId, status: object.status};
}

function parseMessagesResponse(value: unknown): {items: WebLiveChatMessage[]} {
  const object = responseObject(value);
  if (!Array.isArray(object.items)) {
    throw new TypeError('Invalid messages response.');
  }
  return {items: projectPublicMessages(object.items)};
}

function parseConversation(value: unknown): WebLiveChatConversation {
  const object = responseObject(value);
  const state = object.state;
  const locale = object.locale;
  if (!isConversationState(state)
      || !isLocale(locale)
      || typeof object.createdAt !== 'string'
      || !(object.closedAt === null || typeof object.closedAt === 'string')
      || !nonnegativeInteger(object.lastReadTeamMessageId)) {
    throw new TypeError('Invalid conversation response.');
  }
  return {
    state,
    locale,
    createdAt: object.createdAt,
    closedAt: object.closedAt,
    lastReadTeamMessageId: object.lastReadTeamMessageId
  };
}

function isConversationState(value: unknown): value is WebLiveChatConversation['state'] {
  return typeof value === 'string' && CONVERSATION_STATES.has(value);
}

function isLocale(value: unknown): value is WebLiveChatConversation['locale'] {
  return typeof value === 'string' && LOCALES.has(value);
}

/** Malformed rows are dropped; visitor rows are accepted only from owner-authenticated history. */
function projectPublicMessages(items: unknown[]): WebLiveChatMessage[] {
  const seen = new Set<number>();
  const result: WebLiveChatMessage[] = [];
  for (const value of items) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const object = value as Record<string, unknown>;
    const id = positiveInteger(object.id);
    if (id === null
        || seen.has(id)
        || (object.direction !== 'visitor'
          && object.direction !== 'team'
          && object.direction !== 'system')
        || typeof object.body !== 'string'
        || typeof object.createdAt !== 'string') {
      continue;
    }
    seen.add(id);
    result.push({
      id,
      direction: object.direction,
      body: object.body,
      createdAt: object.createdAt
    });
  }
  return result;
}

function responseObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Expected an object response.');
  }
  return value as Record<string, unknown>;
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

async function readJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new WebLiveChatApiError(response.status, 'Live-chat response was too large.');
  }
  if (!response.body) {
    throw new WebLiveChatApiError(response.status, 'Live-chat response was empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    byteLength += value.byteLength;
    if (byteLength > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new WebLiveChatApiError(response.status, 'Live-chat response was too large.');
    }
    text += decoder.decode(value, {stream: true});
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new WebLiveChatApiError(response.status, 'Live-chat response was not valid JSON.');
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload !== null && typeof payload === 'object') {
    const value = payload as Record<string, unknown>;
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }
    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error;
    }
  }
  return `Live-chat request failed with status ${status}.`;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}
