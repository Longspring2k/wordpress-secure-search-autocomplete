import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalog, fakeRemoteSearch } from './fixtures.mjs';
import { normalizeQuery, projectRemoteHits } from '../src/projection.mjs';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4175);
const root = new URL('./public/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/autocomplete.mjs', [fileURLToPath(new URL('../src/autocomplete.mjs', import.meta.url)), 'text/javascript; charset=utf-8']],
]);

export function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const origin = `http://${host}:${request.socket.localPort}`;
      const url = new URL(request.url, origin);
      if (request.method === 'GET' && url.pathname === '/api/search') {
        let query;
        try { query = normalizeQuery(url.searchParams.get('q') ?? '', { min: 2, max: 40 }); }
        catch (error) {
          response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          response.end(JSON.stringify({ error: error.message }));
          return;
        }
        const remote = await fakeRemoteSearch(query);
        const results = projectRemoteHits(remote, catalog, { origin, maxResults: 5 });
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify(results));
        return;
      }

      const allowed = files.get(url.pathname);
      if (request.method !== 'GET' || !allowed) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const [file, type] = allowed;
      const body = await readFile(file.includes?.(':') ? file : new URL(file, root));
      response.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
      response.end(body);
    } catch {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Request failed safely' }));
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(port, host, () => console.log(`Demo: http://${host}:${port}`));
}
