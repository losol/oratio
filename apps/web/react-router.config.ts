import type { Config } from '@react-router/dev/config';

// A single-page app: the build is static files, served by nginx in production
// and wrapped by Capacitor if native apps come later. Matrix sync runs in the
// browser, so there is nothing for a server to render.
export default {
  ssr: false,
} satisfies Config;
