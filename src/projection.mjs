const DEFAULT_BOUNDS = Object.freeze({ min: 2, max: 80 });

export function normalizeQuery(value, bounds = DEFAULT_BOUNDS) {
  if (typeof value !== 'string') throw new TypeError('query must be a string');
  const query = value.trim();
  if (query.length < bounds.min || query.length > bounds.max) {
    throw new RangeError(`query length must be between ${bounds.min} and ${bounds.max}`);
  }
  return query;
}

function canonicalUrl(candidate, origin) {
  if (typeof candidate !== 'string' || candidate !== candidate.trim()
      || candidate.startsWith('//') || /[\\\\\u0000-\u001f\u007f]/u.test(candidate)) return null;
  try {
    const base = new URL(origin);
    const url = new URL(candidate, base);
    if (url.origin !== base.origin || !['http:', 'https:'].includes(url.protocol)
        || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function projectRemoteHits(remoteHits, catalog, { origin, maxResults = 8 } = {}) {
  if (!Array.isArray(remoteHits) || remoteHits.some((hit) => !hit || typeof hit !== 'object' || typeof hit.id !== 'string')) {
    throw new TypeError('remote response must be an array of objects with string ids');
  }
  if (!(catalog instanceof Map) || !Number.isInteger(maxResults) || maxResults < 1) {
    throw new TypeError('projection policy is invalid');
  }

  const seen = new Set();
  const projected = [];
  for (const hit of remoteHits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const record = catalog.get(hit.id);
    if (!record || record.status !== 'publish' || record.id !== hit.id) continue;
    const url = canonicalUrl(record.path, origin);
    if (!url || typeof record.title !== 'string') continue;
    projected.push({ id: record.id, title: record.title, url });
    if (projected.length === maxResults) break;
  }
  return projected;
}
