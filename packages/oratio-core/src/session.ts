// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { createClient, type MatrixClient } from 'matrix-js-sdk';

/** What it takes to resume a signed-in client. The caller decides where it is kept. */
export interface OratioSession {
  homeserverUrl: string;
  userId: string;
  accessToken: string;
  deviceId: string;
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

/**
 * Creates a client for a session and starts syncing. No end-to-end encryption:
 * encrypted rooms show up, but their messages cannot be read.
 */
export async function startClient(session: OratioSession): Promise<MatrixClient> {
  const client = createClient({
    baseUrl: session.homeserverUrl,
    userId: session.userId,
    accessToken: session.accessToken,
    deviceId: session.deviceId,
  });
  await client.startClient({ initialSyncLimit: 50 });
  return client;
}

/** Stops syncing and invalidates the access token on the server. */
export async function logout(client: MatrixClient): Promise<void> {
  client.stopClient();
  await client.logout(true);
}
