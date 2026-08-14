const COLLAPSE_SCROLL_THRESHOLD = 160;

export function shouldCollapseKakaoContact(scrollY) {
  return Number.isFinite(scrollY) && scrollY > COLLAPSE_SCROLL_THRESHOLD;
}

export function createKakaoContactState() {
  return {
    collapsed: false,
    hovered: false,
    focused: false,
    noticeOpen: false
  };
}

export function reduceKakaoContactState(state, event) {
  switch (event.type) {
    case 'scroll':
      if (state.collapsed === event.collapsed) return state;
      return {...state, collapsed: event.collapsed};
    case 'hover':
      if (state.hovered === event.active) return state;
      return {...state, hovered: event.active};
    case 'focus':
      if (state.focused === event.active) return state;
      return {...state, focused: event.active};
    case 'toggle-notice':
      return {...state, noticeOpen: !state.noticeOpen};
    case 'dismiss':
      if (!state.noticeOpen) return state;
      return {...state, noticeOpen: false};
    default:
      return state;
  }
}

export function isKakaoContactExpanded(state) {
  return !state.collapsed || state.hovered || state.focused || state.noticeOpen;
}
