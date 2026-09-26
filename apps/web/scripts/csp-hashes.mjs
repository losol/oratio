// Prints CSP source expressions ('sha256-…') for every inline <script> in the
// HTML files of a build directory, space separated. The image puts them in
// script-src, so the page's own inline scripts run and injected ones do not.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: csp-hashes.mjs <build/client>');
  process.exit(1);
}

const hashes = new Set();
for (const file of readdirSync(dir, { recursive: true })) {
  if (!String(file).endsWith('.html')) continue;
  const html = readFileSync(join(dir, String(file)), 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=/.test(attrs) || !body.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
}
process.stdout.write([...hashes].join(' '));
