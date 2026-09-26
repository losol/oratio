// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import '@eventuras/ratio-ui/ratio-ui.css';
import '@eventuras/ratio-ui/fonts.css';

// Follow the OS colour scheme before first paint, so dark mode never flashes.
const colorSchemeScript = `document.documentElement.dataset.colorScheme =
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>oratio</title>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return null;
}
