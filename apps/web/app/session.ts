// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import type { OratioSession, PendingOidcLogin } from '@eventuras/oratio-core';

// The web app keeps its session in localStorage. Native shells will use
// secure storage instead, which is why core leaves this to the app.
const sessionKey = 'oratio.session';
// A sign-in in progress lives only as long as the tab.
const pendingKey = 'oratio.pending-login';

// The OIDC client the homeserver registered for this app, reused so users
// approve oratio once. Keyed by homeserver, since each one registers its own.
const clientKey = (homeserverUrl: string) => `oratio.oidc-client:${homeserverUrl}`;

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const loadSession = () => read<OratioSession>(localStorage, sessionKey);
export const saveSession = (session: OratioSession) =>
  localStorage.setItem(sessionKey, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(sessionKey);

export const loadPendingLogin = () => read<PendingOidcLogin>(sessionStorage, pendingKey);
export const savePendingLogin = (pending: PendingOidcLogin) =>
  sessionStorage.setItem(pendingKey, JSON.stringify(pending));
export const clearPendingLogin = () => sessionStorage.removeItem(pendingKey);

export const loadClientId = (homeserverUrl: string) =>
  localStorage.getItem(clientKey(homeserverUrl));
export const saveClientId = (homeserverUrl: string, clientId: string) =>
  localStorage.setItem(clientKey(homeserverUrl), clientId);
