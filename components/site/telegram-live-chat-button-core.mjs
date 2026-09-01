const COLLAPSE_SCROLL_THRESHOLD = 160;

export function shouldCollapseTelegramLiveChat(scrollY) {
  return Number.isFinite(scrollY) && scrollY > COLLAPSE_SCROLL_THRESHOLD;
}

export function createTelegramLiveChatState() {
  return {
    collapsed: false,
    hovered: false,
    focused: false,
    noticeOpen: false
  };
}

export function reduceTelegramLiveChatState(state, event) {
  switch (event.type) {
    case 'scroll':
      return state.collapsed === event.collapsed ? state : {...state, collapsed: event.collapsed};
    case 'hover':
      return state.hovered === event.active ? state : {...state, hovered: event.active};
    case 'focus':
      return state.focused === event.active ? state : {...state, focused: event.active};
    case 'toggle-notice':
      return {...state, noticeOpen: !state.noticeOpen};
    case 'dismiss':
      return state.noticeOpen ? {...state, noticeOpen: false} : state;
    default:
      return state;
  }
}

export function isTelegramLiveChatExpanded(state) {
  return !state.collapsed || state.hovered || state.focused || state.noticeOpen;
}

export function telegramLiveChatUrl(botUsername, locale) {
  const username = typeof botUsername === 'string' ? botUsername.trim().replace(/^@/, '') : '';
  if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    return '';
  }
  const start = locale === 'en' ? 'site_en' : 'site_ko';
  return `https://t.me/${username}?start=${start}`;
}
