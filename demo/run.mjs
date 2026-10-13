import { catalog, remoteHits } from './fixtures.mjs';
import { projectRemoteHits } from '../src/projection.mjs';

const results = projectRemoteHits(remoteHits, catalog, { origin: 'http://127.0.0.1:4175', maxResults: 5 });
console.log('Remote hit order:', remoteHits.map((hit) => hit.id).join(' -> '));
console.log('Safe public projection:');
console.log(JSON.stringify(results, null, 2));
console.log('Omitted: private, missing, draft, duplicate, and unsafe-URL records.');
