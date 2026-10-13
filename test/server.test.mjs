import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../demo/server.mjs';

test('HTTP route exposes only projected public fields and rejects unknown paths', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const response = await fetch(`${base}/api/search?q=alpha`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.length > 0);
    assert.ok(body.every((item) => new URL(item.url).origin === base));
    assert.deepEqual(Object.keys(body[0]).sort(), ['id', 'title', 'url']);
    assert.equal(JSON.stringify(body).includes('privateNote'), false);
    assert.equal(JSON.stringify(body).includes('LEAKED'), false);
    assert.equal((await fetch(`${base}/../package.json`)).status, 404);
    assert.equal((await fetch(`${base}/api/search?q=x`)).status, 400);
    assert.equal((await fetch(`${base}/api/search?q=${'x'.repeat(41)}`)).status, 400);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
