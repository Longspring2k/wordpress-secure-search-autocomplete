function validResults(value) {
  if (!Array.isArray(value)) return false;
  return value.every((item) => item && typeof item === 'object'
    && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string');
}

export function createAutocompleteController({ search, render, navigate, minLength = 2, maxLength = 80 }) {
  let sequence = 0;
  let request = null;
  let disposed = false;
  let state = { query: '', status: 'idle', open: false, items: [], activeIndex: -1 };

  const emit = () => { if (!disposed) render({ ...state, items: state.items.map((item) => ({ ...item })) }); };
  const invalidate = () => {
    sequence += 1;
    request?.abort();
    request = null;
  };

  async function setQuery(raw) {
    if (disposed) throw new Error('autocomplete controller is disposed');
    const query = String(raw).trim();
    invalidate();
    const mine = sequence;

    if (!query) {
      state = { query: '', status: 'idle', open: false, items: [], activeIndex: -1 };
      emit();
      return;
    }
    if (query.length < minLength || query.length > maxLength) {
      state = { query, status: 'invalid', open: false, items: [], activeIndex: -1 };
      emit();
      return;
    }

    request = new AbortController();
    state = { query, status: 'loading', open: false, items: [], activeIndex: -1 };
    emit();
    try {
      const items = await search(query, { signal: request.signal });
      if (disposed || mine !== sequence) return;
      if (!validResults(items)) throw new TypeError('search response must be an array of public result objects');
      state = { query, status: items.length ? 'ready' : 'empty', open: items.length > 0, items, activeIndex: -1 };
      request = null;
      emit();
    } catch (error) {
      if (disposed || mine !== sequence) return;
      state = { query, status: 'error', open: false, items: [], activeIndex: -1 };
      request = null;
      emit();
    }
  }

  function key(name) {
    if (disposed) return false;
    if (name === 'Escape') {
      invalidate();
      state = { ...state, status: state.query ? 'closed' : 'idle', open: false, items: [], activeIndex: -1 };
      emit();
      return true;
    }
    if (!state.items.length || !state.open) return false;
    if (name === 'ArrowDown' || name === 'ArrowUp') {
      const delta = name === 'ArrowDown' ? 1 : -1;
      const start = state.activeIndex < 0 ? (delta > 0 ? -1 : 0) : state.activeIndex;
      state = { ...state, activeIndex: (start + delta + state.items.length) % state.items.length };
      emit();
      return true;
    }
    if (name === 'Enter' && state.activeIndex >= 0) {
      const url = state.items[state.activeIndex].url;
      key('Escape');
      navigate(url);
      return true;
    }
    return false;
  }

  function dispose() {
    if (disposed) return;
    invalidate();
    disposed = true;
  }

  emit();
  return { setQuery, key, dispose };
}
