const MESSAGE_PAGE_SIZE = 100;

export function createStableStreamController(connect) {
  let disconnect = null;
  let probing = false;
  let token = null;
  const close = () => {
    const activeDisconnect = disconnect;
    disconnect = null;
    probing = false;
    token = null;
    activeDisconnect?.();
  };
  return {
    open({probing: nextProbe, onEvent, onFailure}) {
      if (disconnect) return false;
      probing = Boolean(nextProbe);
      const connectionToken = {};
      token = connectionToken;
      disconnect = connect(
        (event) => {
          if (token !== connectionToken) return;
          probing = false;
          onEvent(event);
        },
        () => {
          if (token !== connectionToken) return;
          onFailure();
          if (probing) close();
        }
      );
      return true;
    },
    stopForPolling() {
      if (!probing) close();
    },
    close
  };
}

export function createLogicalMutationController(createKey) {
  let generation = 0;
  let current = null;
  return {
    begin(payload) {
      if (current?.status === 'pending' || current?.status === 'accepted') return null;
      const key = current?.status === 'retryable' && current.payload === payload
        ? current.key
        : createKey();
      current = {generation: ++generation, payload, key, status: 'pending'};
      return {...current};
    },
    edit() {
      if (current?.status === 'pending' || current?.status === 'accepted') return false;
      current = null;
      generation += 1;
      return true;
    },
    finish(operation, outcome) {
      if (!current || !operation || current.generation !== operation.generation) return false;
      if (outcome === 'ambiguous_failure' || outcome === 'in_progress') {
        current = {...current, status: 'retryable'};
      } else if (outcome === 'accepted') {
        current = {...current, status: 'accepted', key: ''};
      } else {
        current = null;
      }
      return true;
    },
    isLocked() {
      return current?.status === 'pending' || current?.status === 'accepted';
    },
    reset() {
      current = null;
      generation += 1;
    }
  };
}

export function createInvalidationQueue(refresh, options = {}) {
  const schedule = options.schedule ?? ((callback) => setTimeout(callback, 60));
  const cancel = options.cancel ?? clearTimeout;
  let scheduled = null;
  return {
    invalidate() {
      if (scheduled !== null) cancel(scheduled);
      scheduled = schedule(async () => {
        scheduled = null;
        await refresh();
      });
    },
    dispose() {
      if (scheduled !== null) cancel(scheduled);
      scheduled = null;
    }
  };
}

export async function loadMessagePages(loadPage, after) {
  let cursor = positiveId(after);
  const items = [];
  while (true) {
    const page = await loadPage(cursor);
    const rows = Array.isArray(page) ? page : [];
    items.push(...rows);
    const nextCursor = rows.reduce(
      (highest, row) => Math.max(highest, positiveId(row?.id)),
      cursor
    );
    if (rows.length < MESSAGE_PAGE_SIZE || nextCursor <= cursor) {
      return {items, cursor: nextCursor};
    }
    cursor = nextCursor;
  }
}

export function nextFocusIndex(count, currentIndex, reverse) {
  if (!Number.isSafeInteger(count) || count <= 0) return -1;
  if (!Number.isSafeInteger(currentIndex) || currentIndex < 0 || currentIndex >= count) {
    return reverse ? count - 1 : 0;
  }
  if (reverse) return currentIndex === 0 ? count - 1 : currentIndex - 1;
  return currentIndex === count - 1 ? 0 : currentIndex + 1;
}

function positiveId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
