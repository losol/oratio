// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

/** A Matrix user ID, `@localpart:server.name`, split into its parts. */
export interface MatrixUserId {
  localpart: string;
  serverName: string;
}

/**
 * Splits a Matrix user ID into localpart and server name.
 * The server name may carry a port (`localhost:8008`), so the first colon
 * after `@` is the separator. Returns null when the input is not a user ID.
 */
export function parseUserId(userId: string): MatrixUserId | null {
  if (!userId.startsWith('@')) {
    return null;
  }
  const colon = userId.indexOf(':', 1);
  if (colon < 2 || colon === userId.length - 1) {
    return null;
  }
  return { localpart: userId.slice(1, colon), serverName: userId.slice(colon + 1) };
}
