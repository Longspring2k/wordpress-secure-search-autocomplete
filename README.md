# Secure Search Autocomplete

An original, dependency-free Node and vanilla-JavaScript demonstration of two security mechanisms used in product search:

1. **Server-side public projection:** remote search hits contribute IDs only. Local publication state, titles and canonical URLs determine what the browser may receive.
2. **Latest-query-wins autocomplete:** cancellation reduces work, while sequence guards prevent stale success or error responses from changing current UI state.

This educational demo is newly written and separate from the original private implementation. It is not a WordPress plugin, production deployment, or accessibility certification.

## Run

Requires a current Node.js release with built-in `fetch` and `node:test`.

```bash
node --test
node demo/run.mjs
node demo/server.mjs
```

Open `http://127.0.0.1:4175`. Set another loopback port with `PORT=4180 node demo/server.mjs`.

Type `alp`, use ArrowDown/ArrowUp and Enter, or click a result. The demo displays the selected destination without leaving the page: real product detail pages are intentionally not implemented. Escape closes the suggestions; clearing the input invalidates pending work.

The fake provider returns the same hostile fixture batch for valid queries without `z`; queries containing `z` return no hits. This makes filtering policy reproducible. It is not a relevance-ranking or full-text-search implementation. Selecting a result closes the dropdown before displaying its destination.

Representative CLI output:

```text
Remote hit order: p-102 -> p-101 -> missing-9 -> p-103 -> p-101 -> p-104 -> p-105
Safe public projection:
[
  { "id": "p-101", "title": "Alpine Travel Mug", "url": "http://127.0.0.1:4175/products/alpine-travel-mug" },
  { "id": "p-103", "title": "Amber Desk Lamp", "url": "http://127.0.0.1:4175/products/amber-desk-lamp" }
]
Omitted: private, missing, draft, duplicate, and unsafe-URL records.
```

## File map

- `src/projection.mjs` — query bounds, local publication lookup, URL policy, stable deduplication and cap.
- `src/autocomplete.mjs` — framework-free async state machine and keyboard behavior.
- `demo/fixtures.mjs` — synthetic local catalog plus deliberately hostile/stale remote hits.
- `demo/server.mjs` — loopback-only HTTP server with an explicit route/file allowlist.
- `demo/public/` — compact usable combobox/listbox UI; no images, fonts or network dependencies.
- `test/` — deterministic policy, race, lifecycle, keyboard and HTTP tests.
- `docs/engineering.md` — contracts, trust boundaries, lifecycle, failure policy and adapter notes.
- `docs/scope.md` — evidence and non-claims.

## Safety properties demonstrated

- Remote titles, URLs and extra payloads are ignored.
- Missing, draft and private local records are omitted.
- Canonical URLs must resolve to the configured origin over HTTP(S); protocol-relative forms, credentials, surrounding whitespace, backslashes, control characters, off-origin URLs and unsafe schemes fail closed. The local HTTP adapter derives the port from its listening socket, not the request Host header.
- Order follows the first occurrence of each remote ID; duplicates are removed; the cap applies after filtering.
- Queries are trimmed and must satisfy explicit minimum/maximum lengths; oversized input is rejected, not silently truncated.
- The endpoint returns only `id`, `title` and `url`.
- Browser labels use `textContent`, not HTML parsing.
- Clearing, Escape and disposal invalidate pending work. Even a provider that ignores abort cannot publish stale output.

See [engineering details](docs/engineering.md) and [scope boundaries](docs/scope.md).