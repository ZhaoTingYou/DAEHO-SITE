const API_ROOT = '/api/live-chat';
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_EVENT_BYTES = 64 * 1024;

export type WebLiveChatConversation = {
  state: 'opening' | 'active' | 'closed' | 'needs_attention';
  locale: 'ko' | 'en';
  createdAt: string;
  closedAt: string | null;
  lastReadTeamMessageId: number;
};

export type WebLiveChatMessage = {
  id: number;
  direction: 'team' | 'system';
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
  clientMessageKey?: string;
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
  return request<WebLiveChatSession>(`${API_ROOT}/session`);
}

export async function startConversation(input: StartConversationInput): Promise<{
  conversation: WebLiveChatConversation;
}> {
  return request(`${API_ROOT}/conversations`, jsonWrite('POST', {
    ...input,
    companyWebsite: input.companyWebsite ?? '',
    clientMessageKey: input.clientMessageKey ?? createClientMessageKey()
  }));
}

export async function sendVisitorMessage(
  body: string,
  clientMessageKey = createClientMessageKey()
): Promise<{messageId: number; status: string}> {
  return request(
    `${API_ROOT}/conversations/current/messages`,
    jsonWrite('POST', {body, clientMessageKey})
  );
}

export async function getMessages(after = 0): Promise<{items: WebLiveChatMessage[]}> {
  const cursor = positiveInteger(after) ?? 0;
  return request(`${API_ROOT}/conversations/current/messages?after=${cursor}`);
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

function createClientMessageKey(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function jsonWrite(method: 'POST', value: unknown): RequestInit {
  return {
    method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(value)
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith(`${API_ROOT}/`)) {
    throw new TypeError('Live-chat requests must use same-origin API paths.');
  }
  const response = await fetch(path, {...init, credentials: 'same-origin'});
  const payload = await readJson(response);
  if (!response.ok) {
    throw new WebLiveChatApiError(response.status, errorMessage(payload, response.status));
  }
  return payload as T;
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
