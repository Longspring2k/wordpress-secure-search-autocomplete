export const catalog = new Map([
  ['p-101', { id: 'p-101', status: 'publish', title: 'Alpine Travel Mug', path: '/products/alpine-travel-mug', internalCost: 7.25 }],
  ['p-102', { id: 'p-102', status: 'private', title: 'Alpha Prototype', path: '/products/alpha-prototype', privateNote: 'synthetic internal payload' }],
  ['p-103', { id: 'p-103', status: 'publish', title: 'Amber Desk Lamp', path: '/products/amber-desk-lamp' }],
  ['p-104', { id: 'p-104', status: 'draft', title: 'Aluminum Stand Draft', path: '/products/aluminum-stand' }],
  ['p-105', { id: 'p-105', status: 'publish', title: 'Unsafe Local URL', path: 'javascript:alert(1)' }],
]);

const remoteHits = [
  { id: 'p-102', title: 'LEAKED PRIVATE TITLE', url: 'https://remote.invalid/private', privatePayload: { margin: 99 } },
  { id: 'p-101', title: '<b>Remote override</b>', url: 'https://remote.invalid/phish' },
  { id: 'missing-9', title: 'Deleted result' },
  { id: 'p-103', title: 'Wrong remote title', url: '//remote.invalid/tracker' },
  { id: 'p-101', title: 'Duplicate' },
  { id: 'p-104', title: 'Draft result' },
  { id: 'p-105', title: 'Unsafe local URL record' },
];

export async function fakeRemoteSearch(query, { signal } = {}) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 90);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
  const words = query.toLowerCase();
  return words.includes('z') ? [] : remoteHits.map((hit) => ({ ...hit }));
}

export { remoteHits };
