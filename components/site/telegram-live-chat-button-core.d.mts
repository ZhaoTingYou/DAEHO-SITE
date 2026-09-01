export type TelegramLiveChatState = {
  collapsed: boolean;
  hovered: boolean;
  focused: boolean;
  noticeOpen: boolean;
};

export type TelegramLiveChatEvent =
  | {type: 'scroll'; collapsed: boolean}
  | {type: 'hover'; active: boolean}
  | {type: 'focus'; active: boolean}
  | {type: 'toggle-notice'}
  | {type: 'dismiss'};

export function shouldCollapseTelegramLiveChat(scrollY: number): boolean;
export function createTelegramLiveChatState(): TelegramLiveChatState;
export function reduceTelegramLiveChatState(
  state: TelegramLiveChatState,
  event: TelegramLiveChatEvent
): TelegramLiveChatState;
export function isTelegramLiveChatExpanded(state: TelegramLiveChatState): boolean;
export function telegramLiveChatUrl(botUsername: string, locale: string): string;
