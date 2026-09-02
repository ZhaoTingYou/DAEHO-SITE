import type {WebLiveChatEvent, WebLiveChatMessage} from './web-live-chat-api';

export function createStableStreamController(
  connect: (
    onEvent: (event: WebLiveChatEvent) => void,
    onFailure: () => void
  ) => () => void
): {
  open(options: {
    probing: boolean;
    onEvent: (event: WebLiveChatEvent) => void;
    onFailure: () => void;
  }): boolean;
  stopForPolling(): void;
  close(): void;
};

export type LogicalMutationOperation = {
  generation: number;
  payload: string;
  key: string;
  status: 'pending';
};

export function createLogicalMutationController(createKey: () => string): {
  begin(payload: string): LogicalMutationOperation | null;
  edit(): boolean;
  finish(
    operation: LogicalMutationOperation,
    outcome: 'success' | 'accepted' | 'definitive_failure' | 'ambiguous_failure'
  ): boolean;
  isLocked(): boolean;
  reset(): void;
};

export function createInvalidationQueue(
  refresh: () => Promise<void>,
  options?: {
    schedule?: (callback: () => Promise<void>) => ReturnType<typeof setTimeout>;
    cancel?: (handle: ReturnType<typeof setTimeout>) => void;
  }
): {invalidate(): void; dispose(): void};

export function loadMessagePages(
  loadPage: (after: number) => Promise<WebLiveChatMessage[]>,
  after: number
): Promise<{items: WebLiveChatMessage[]; cursor: number}>;
export function nextFocusIndex(count: number, currentIndex: number, reverse: boolean): number;
