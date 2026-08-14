export type KakaoContactState = {
  collapsed: boolean;
  hovered: boolean;
  focused: boolean;
  noticeOpen: boolean;
};

export type KakaoContactEvent =
  | {type: 'scroll'; collapsed: boolean}
  | {type: 'hover'; active: boolean}
  | {type: 'focus'; active: boolean}
  | {type: 'toggle-notice'}
  | {type: 'dismiss'};

export function shouldCollapseKakaoContact(scrollY: number): boolean;
export function createKakaoContactState(): KakaoContactState;
export function reduceKakaoContactState(
  state: KakaoContactState,
  event: KakaoContactEvent
): KakaoContactState;
export function isKakaoContactExpanded(state: KakaoContactState): boolean;
