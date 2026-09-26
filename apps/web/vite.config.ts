import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

// Sign-in via OIDC needs an https origin, so the dev server uses the mkcert
// certificate from dev/certs when it exists (see the README).
const cert = fileURLToPath(new URL('../../dev/certs/localhost.pem', import.meta.url));
const key = fileURLToPath(new URL('../../dev/certs/localhost-key.pem', import.meta.url));
const https =
  existsSync(cert) && existsSync(key)
    ? { cert: readFileSync(cert), key: readFileSync(key) }
    : undefined;

// Only the dev server: the build prerenders the SPA shell through a preview
// server over plain http, and fails if that server speaks https.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [reactRouter()],
  ...(command === 'serve' && !isPreview && { server: { https } }),
}));
