import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

// Sign-in via OIDC needs an https origin, so the dev server uses the mkcert
// certificate from infra/dev/certs when it exists (see the README).
const cert = fileURLToPath(new URL('../../infra/dev/certs/localhost.pem', import.meta.url));
const key = fileURLToPath(new URL('../../infra/dev/certs/localhost-key.pem', import.meta.url));
const https =
  existsSync(cert) && existsSync(key)
    ? { cert: readFileSync(cert), key: readFileSync(key) }
    : undefined;

// Only the dev server: the build prerenders the SPA shell through a preview
// server over plain http, and fails if that server speaks https.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [reactRouter()],
  // The build prerenders through a preview server and requests 127.0.0.1. In
  // containers, localhost can resolve to ::1 first, so bind the address it asks.
  preview: { host: '127.0.0.1' },
  ...(command === 'serve' && !isPreview && { server: { https } }),
}));
