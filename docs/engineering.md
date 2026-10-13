# Engineering decisions

## Data contract and trust boundaries

The synthetic remote provider returns an array of objects containing string `id` fields. Every other remote field is untrusted and discarded. A malformed top-level value, null hit or non-string ID fails closed rather than being partially consumed.

The local catalog is the publication authority. Projection visits IDs in provider order, deduplicates, requires a locally published record, takes the title only from that record, checks its canonical URL, and emits only `{ id, title, url }` until the post-filter cap is reached.

The browser therefore never receives the synthetic private record payload. The demo process contains private fixtures solely to prove that the projection omits them.

## URL and publication policy

Relative paths and absolute same-origin HTTP(S) URLs are accepted. Protocol-relative values are rejected before parsing because their inherited scheme can obscure intent. `javascript:`, malformed and off-origin values are rejected. This is a narrow canonical-navigation policy, not general URL safety certification.

A record being returned by remote search does not make it public. Missing, draft and private records are absent from output. Stable first-seen ordering is retained among records that pass policy; deduplication occurs before local lookup, and the result cap occurs after filtering.

## Request boundary

`normalizeQuery` trims surrounding whitespace and enforces inclusive bounds. It does not silently truncate, because truncation can make logging, caching and user intent disagree. The demo endpoint uses 2–40 characters and responds with HTTP 400 outside that contract.

The HTTP server binds to `127.0.0.1` by default and allows `PORT` only. It has no provider credentials, real network search, purchase flow, filesystem path parameter or generic static-file handler. Routes are explicitly allowlisted: `/`, `/app.js`, `/styles.css`, `/autocomplete.mjs` and `/api/search`.

## Autocomplete state machine

- `idle`: empty trimmed query; list closed.
- `invalid`: query outside configured bounds; no request.
- `loading`: current bounded query has an active request.
- `ready`: validated nonempty results; list open.
- `empty`: validated empty results; list closed.
- `error`: current request or response contract failed; list closed.
- `closed`: Escape closed and invalidated the current suggestions.

Every query change increments a sequence and aborts the previous controller. A completion may render only if its captured sequence still equals the current sequence. Clearing, Escape and disposal also increment the sequence.

### Why cancellation alone is insufficient

Abort is cooperative. A provider may ignore the signal, finish before noticing it, resolve from a cache, or surface an old error after a newer request succeeds. The sequence comparison defines ordering independently of provider behavior. Tests use manually resolved promises, not sleeps, to prove both stale success and stale error suppression when abort is ignored.

## Keyboard and accessibility behavior

The browser uses a labelled `role="combobox"`, controlled `role="listbox"`, `role="option"` children, `aria-expanded`, `aria-activedescendant` and a live status region. Arrow Down/Up wrap through nonempty results, Enter follows the active canonical URL, and Escape closes suggestions and invalidates work. Empty-result arrows and Enter are no-ops. Result titles are assigned with `textContent`.

This compact implementation has deterministic unit coverage for controller keyboard state, but does not claim full assistive-technology interoperability, touch behavior, localization, browser matrix testing or WCAG certification. Browser interaction remains appropriate before adapting the pattern.

## Failure matrix

| Condition | Result |
|---|---|
| Query empty | Invalidate pending request; render idle/closed |
| Query too short or long | No provider call; render invalid/closed |
| Remote response wrong shape | Error/closed; expose no partial results |
| Remote metadata is malicious | Ignored; local title and URL win |
| Local record missing/private/draft | Omitted |
| Local URL unsafe/off-origin/protocol-relative | Omitted |
| Duplicate remote ID | First occurrence considered once |
| Provider ignores abort | Sequence guard suppresses stale completion |
| Old request rejects after new success | Stale error ignored |
| Escape or clear during request | Abort + invalidate; stale completion cannot reopen |
| Controller disposed | Abort + invalidate; no later render |
| Unknown HTTP path/method | 404; no arbitrary file read |

## WordPress adapter responsibilities not implemented

A production WordPress/WooCommerce adapter would still need to register and authorize the intended AJAX or REST route; validate a nonce where appropriate; add rate limiting; call the provider with server-held credentials and strict timeouts; translate IDs; enforce native post status, product visibility, catalog rules and user permissions; obtain titles and permalinks through WordPress APIs; define caching and observability; enqueue/version assets; and run browser and assistive-technology verification in the target environment.

Those platform responsibilities are intentionally not simulated with fake WordPress interfaces here.