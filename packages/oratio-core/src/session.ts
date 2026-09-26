// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { createClient, type MatrixClient, TokenRefresher } from 'matrix-js-sdk';
import { oauthForSession } from './oidc';

/** What it takes to resume a signed-in client. The caller decides where it is kept. */
export interface OratioSession {
  homeserverUrl: string;
  userId: string;
  accessToken: string;
  deviceId: string;
  /** Set for OIDC sign-ins: access tokens expire and are renewed with this. */
  refreshToken?: string;
  /** The client ID the homeserver registered for us, for OIDC sign-ins. */
  oauthClientId?: string;
}

export interface PasswordLogin {
  homeserverUrl: string;
  /** Localpart (`ole`) or full user ID (`@ole:losol.no`). */
  username: string;
  password: string;
  /** Shown in the user's device list. @default 'oratio' */
  deviceName?: string;
}

/** Signs in with a password and returns a new session. For development and password-only servers. */
export async function loginWithPassword(login: PasswordLogin): Promise<OratioSession> {
  const client = createClient({ baseUrl: login.homeserverUrl });
  const response = await client.loginRequest({
    type: 'm.login.password',
    identifier: { type: 'm.id.user', user: login.username },
    password: login.password,
    initial_device_display_name: login.deviceName ?? 'oratio',
  });
  return {
    homeserverUrl: login.homeserverUrl,
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
  };
}

export interface StartClientOptions {
  /** Called with the updated session when tokens are refreshed. Store it. */
  onSessionChange?: (session: OratioSession) => void;
}

/**
 * Creates a client for a session and starts syncing. OIDC sessions refresh
 * their access token as it expires. No end-to-end encryption: encrypted rooms
 * show up, but their messages cannot be read.
 */
export async function startClient(
  session: OratioSession,
  options: StartClientOptions = {},
): Promise<MatrixClient> {
  let current = session;
  const oauth = session.refreshToken ? await oauthForSession(session) : null;
  const refresher = oauth
    ? new TokenRefresher(oauth, async ({ accessToken, refreshToken }) => {
        current = { ...current, accessToken, refreshToken };
        options.onSessionChange?.(current);
      })
    : null;
  const client = createClient({
    baseUrl: session.homeserverUrl,
    userId: session.userId,
    accessToken: session.accessToken,
    deviceId: session.deviceId,
    refreshToken: session.refreshToken,
    tokenRefreshFunction: refresher?.tokenRefreshFunction,
    // No voice or video: skip the TURN server lookup that calls need.
    disableVoip: true,
  });
  await client.startClient({ initialSyncLimit: 50 });
  return client;
}

/** Stops syncing and invalidates the access token on the server. */
export async function logout(client: MatrixClient): Promise<void> {
  client.stopClient();
  await client.logout(true);
}
