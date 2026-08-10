'use client';

import {useSyncExternalStore} from 'react';

const listeners = new Set<() => void>();
let originalPushState: History['pushState'] | null = null;
let originalReplaceState: History['replaceState'] | null = null;

function subscribeToLocationSearch(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  if (listeners.size === 1) {
    const history = window.history;
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;
    history.pushState = notifyAfterHistoryChange(history.pushState);
    history.replaceState = notifyAfterHistoryChange(history.replaceState);
    window.addEventListener('popstate', notifyListeners);
  }

  return () => {
    listeners.delete(onStoreChange);

    if (listeners.size === 0) {
      const history = window.history;
      window.removeEventListener('popstate', notifyListeners);
      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;
      originalPushState = null;
      originalReplaceState = null;
    }
  };
}

function notifyAfterHistoryChange<T extends History['pushState'] | History['replaceState']>(method: T): T {
  return function notify(this: History, ...args: Parameters<T>) {
    method.apply(this, args);
    notifyListeners();
  } as T;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return '';
}

export function useLocationSearch() {
  return useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearch,
    getServerLocationSearch
  );
}
