import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuery, projectRemoteHits } from '../src/projection.mjs';

const catalog = new Map([
  ['p-1', { id: 'p-1', status: 'publish', title: 'Local Alpha', path: '/products/alpha' }],
  ['p-2', { id: 'p-2', status: 'private', title: 'Secret Beta', path: '/products/beta', privateNote: 'never expose' }],
  ['p-3', { id: 'p-3', status: 'publish', title: 'Local Gamma', path: 'https://demo.invalid/products/gamma' }],
  ['p-4', { id: 'p-4', status: 'publish', title: 'Unsafe', path: 'javascript:alert(1)' }],
  ['p-5', { id: 'p-5', status: 'publish', title: 'Off origin', path: 'https://evil.invalid/p-5' }],
  ['p-6', { id: 'p-6', status: 'publish', title: 'Protocol relative', path: '//evil.invalid/p-6' }],
]);

const policy = { origin: 'https://demo.invalid', maxResults: 3 };

test('projects remote identifiers through local published records in stable deduplicated order', () => {
  const remote = [
    { id: 'p-3', title: 'Injected title', url: 'https://evil.invalid/phish', secret: 'remote payload' },
    { id: 'p-2', title: 'Private' },
    { id: 'missing', title: 'Missing' },
    { id: 'p-1', title: '<img onerror=alert(1)>' },
    { id: 'p-3', title: 'Duplicate' },
  ];
  assert.deepEqual(projectRemoteHits(remote, catalog, policy), [
    { id: 'p-3', title: 'Local Gamma', url: 'https://demo.invalid/products/gamma' },
    { id: 'p-1', title: 'Local Alpha', url: 'https://demo.invalid/products/alpha' },
  ]);
});

test('rejects unsafe, protocol-relative, and off-origin local canonical URLs', () => {
  assert.deepEqual(projectRemoteHits([{ id: 'p-4' }, { id: 'p-5' }, { id: 'p-6' }], catalog, policy), []);
});

test('applies the result cap after policy filtering', () => {
  const expanded = new Map(catalog);
  expanded.set('p-7', { id: 'p-7', status: 'publish', title: 'Seven', path: '/products/seven' });
  expanded.set('p-8', { id: 'p-8', status: 'publish', title: 'Eight', path: '/products/eight' });
  assert.deepEqual(
    projectRemoteHits([{ id: 'p-2' }, { id: 'p-1' }, { id: 'p-7' }, { id: 'p-8' }], expanded, policy).map((x) => x.id),
    ['p-1', 'p-7', 'p-8'],
  );
});

test('normalizes surrounding whitespace but rejects queries outside explicit bounds', () => {
  assert.equal(normalizeQuery('  alpha  ', { min: 2, max: 20 }), 'alpha');
  assert.throws(() => normalizeQuery('a', { min: 2, max: 20 }), /between 2 and 20/);
  assert.throws(() => normalizeQuery('x'.repeat(21), { min: 2, max: 20 }), /between 2 and 20/);
  assert.throws(() => normalizeQuery(42, { min: 2, max: 20 }), /string/);
});

test('rejects normalized protocol-relative and credential-bearing canonical URLs', () => {
  for (const path of [' //demo.invalid/products/a', '\\\\demo.invalid/products/a', 'https://user:@demo.invalid/products/a', 'https://demo.invalid/\tproducts/a']) {
    const records = new Map([['p-1', { id: 'p-1', status: 'publish', title: 'A', path }]]);
    assert.deepEqual(projectRemoteHits([{ id: 'p-1' }], records, policy), [], path);
  }
});

test('omits mismatched local identifiers instead of emitting a malformed result', () => {
  const records = new Map([['p-1', { id: 7, status: 'publish', title: 'A', path: '/products/a' }]]);
  assert.deepEqual(projectRemoteHits([{ id: 'p-1' }], records, policy), []);
});

test('fails closed for malformed remote responses', () => {
  for (const invalid of [null, {}, { hits: [] }, 'hits', [null], [{ id: 7 }]]) {
    assert.throws(() => projectRemoteHits(invalid, catalog, policy), /remote response/i);
  }
});
