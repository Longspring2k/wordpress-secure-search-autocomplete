import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutocompleteController } from '../src/autocomplete.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness({ abortAware = false } = {}) {
  const requests = [];
  const views = [];
  const navigations = [];
  const controller = createAutocompleteController({
    minLength: 2,
    maxLength: 20,
    search(query, { signal }) {
      const task = deferred();
      requests.push({ query, signal, task });
      if (abortAware) signal.addEventListener('abort', () => task.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
      return task.promise;
    },
    render(view) { views.push(structuredClone(view)); },
    navigate(url) { navigations.push(url); },
  });
  return { controller, requests, views, navigations, last: () => views.at(-1) };
}

const alpha = [{ id: 'a', title: 'Alpha', url: '/alpha' }, { id: 'b', title: 'Beta', url: '/beta' }];

test('latest query wins even when the provider ignores abort', async () => {
  const h = harness();
  const first = h.controller.setQuery('al');
  const second = h.controller.setQuery('alp');
  assert.equal(h.requests[0].signal.aborted, true);
  h.requests[1].task.resolve([alpha[0]]);
  await second;
  h.requests[0].task.resolve(alpha);
  await first;
  assert.deepEqual(h.last().items, [alpha[0]]);
  assert.equal(h.last().query, 'alp');
});

test('stale errors cannot replace a newer successful query', async () => {
  const h = harness();
  const first = h.controller.setQuery('al');
  const second = h.controller.setQuery('alp');
  h.requests[1].task.resolve([alpha[0]]);
  await second;
  h.requests[0].task.reject(new Error('old failure'));
  await first;
  assert.equal(h.last().status, 'ready');
});

test('clear query invalidates pending work and closes the list', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  await h.controller.setQuery('');
  h.requests[0].task.resolve(alpha);
  await pending;
  assert.deepEqual(h.last(), { query: '', status: 'idle', open: false, items: [], activeIndex: -1 });
});

test('Escape invalidates pending work and stale results cannot reopen it', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  assert.equal(h.controller.key('Escape'), true);
  h.requests[0].task.resolve(alpha);
  await pending;
  assert.equal(h.last().open, false);
  assert.deepEqual(h.last().items, []);
});

test('dispose invalidates work and suppresses subsequent rendering', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  const count = h.views.length;
  h.controller.dispose();
  h.requests[0].task.resolve(alpha);
  await pending;
  assert.equal(h.views.length, count);
  await assert.rejects(h.controller.setQuery('beta'), /disposed/);
});

test('Arrow keys wrap nonempty results and Enter navigates the active item', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  h.requests[0].task.resolve(alpha);
  await pending;
  assert.equal(h.controller.key('ArrowDown'), true);
  assert.equal(h.last().activeIndex, 0);
  h.controller.key('ArrowUp');
  assert.equal(h.last().activeIndex, 1);
  assert.equal(h.controller.key('Enter'), true);
  assert.deepEqual(h.navigations, ['/beta']);
  assert.equal(h.last().open, false);
  assert.equal(h.last().activeIndex, -1);
});

test('keyboard commands are harmless when results are empty', async () => {
  const h = harness();
  const pending = h.controller.setQuery('none');
  h.requests[0].task.resolve([]);
  await pending;
  assert.equal(h.controller.key('ArrowDown'), false);
  assert.equal(h.controller.key('Enter'), false);
  assert.equal(h.last().activeIndex, -1);
});

test('an unsolicited abort on the current request leaves loading and fails closed', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  h.requests[0].task.reject(Object.assign(new Error('provider aborted'), { name: 'AbortError' }));
  await pending;
  assert.equal(h.last().status, 'error');
  assert.deepEqual(h.last().items, []);
});

test('invalid response shape fails closed', async () => {
  const h = harness();
  const pending = h.controller.setQuery('alpha');
  h.requests[0].task.resolve({ items: alpha });
  await pending;
  assert.equal(h.last().status, 'error');
  assert.deepEqual(h.last().items, []);
  assert.equal(h.last().open, false);
});
