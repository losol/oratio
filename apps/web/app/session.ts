// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import type { OratioSession } from '@eventuras/oratio-core';

// The web app keeps its session in localStorage. Native shells will use
// secure storage instead, which is why core leaves this to the app.
const key = 'oratio.session';

export const defaultHomeserverUrl = import.meta.env.VITE_HOMESERVER_URL ?? 'http://localhost:8008';

export function loadSession(): OratioSession | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as OratioSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: OratioSession): void {
  localStorage.setItem(key, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(key);
}
