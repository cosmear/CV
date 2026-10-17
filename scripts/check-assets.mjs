import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'assets/asset-manifest.json')));
for (const output of Object.values(manifest)) {
  assert(existsSync(resolve(root, output)), `Missing delivery file: ${output}`);
  const hash = createHash('sha256').update(readFileSync(resolve(root, output))).digest('hex').slice(0, 12);
  assert(output.includes(`.${hash}.`), `Stale fingerprint: ${output}`);
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const [, attribute, value] of html.matchAll(/\b(src|href|srcset)="([^"]+)"/g)) {
  const urls = attribute === 'srcset' ? value.split(',').map(item => item.trim().split(/\s+/)[0]) : [value];
  for (const url of urls) {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(url)) continue;
    assert(existsSync(resolve(root, decodeURIComponent(url.split(/[?#]/)[0]))), `Missing HTML resource: ${url}`);
  }
}
for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json);
assert(!html.includes('src="js/translations.js"'), 'Translations must not block the head parser');
assert(!html.includes('fonts.googleapis.com'), 'Unexpected blocking font stylesheet');
console.log(`OK: ${Object.keys(manifest).length} fingerprints, local HTML resources and JSON-LD.`);
