// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  HttpApiEvent,
  type MatrixClient,
  type OratioSession,
  startClient,
} from '@eventuras/oratio-core';

const ClientContext = createContext<MatrixClient | null>(null);

export interface OratioProviderProps {
  /**
   * The session to run a client for, from wherever the host keeps it: a web
   * app's own storage, or a server that signed the user in, e.g. a Matrix
   * appservice. Null stops the client.
   */
  session: OratioSession | null;
  /** Called with the updated session when an OIDC access token is refreshed. Store it. */
  onSessionChange?: (session: OratioSession) => void;
  /**
   * The homeserver no longer accepts the session's token, e.g. it was
   * revoked or has expired without a refresh token. Get a new session.
   */
  onLoggedOut?: () => void;
  /** The client could not start, e.g. the homeserver is unreachable. */
  onError?: (error: unknown) => void;
  children?: ReactNode;
}

/**
 * Runs a Matrix client for a session and gives it to the hooks and views
 * below. The client restarts when the homeserver, user or device changes,
 * not when a refreshed token comes back through `onSessionChange`.
 */
export function OratioProvider({
  session,
  onSessionChange,
  onLoggedOut,
  onError,
  children,
}: OratioProviderProps) {
  const [client, setClient] = useState<MatrixClient | null>(null);

  // Callbacks and the latest session are read when needed, so the host can
  // pass new ones on every render without restarting the client.
  const latest = useRef({ session, onSessionChange, onLoggedOut, onError });
  latest.current = { session, onSessionChange, onLoggedOut, onError };

  const homeserverUrl = session?.homeserverUrl;
  const userId = session?.userId;
  const deviceId = session?.deviceId;

  // Only these identify the client: token updates for the same device are
  // the client's own refreshes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the session is read through latest
  useEffect(() => {
    const current = latest.current.session;
    if (!current) {
      setClient(null);
      return;
    }
    let started: MatrixClient | null = null;
    let cancelled = false;
    const loggedOut = () => {
      started?.stopClient();
      setClient(null);
      latest.current.onLoggedOut?.();
    };

    startClient(current, {
      onSessionChange: (next) => latest.current.onSessionChange?.(next),
    }).then(
      (c) => {
        started = c;
        if (cancelled) {
          c.stopClient();
          return;
        }
        c.on(HttpApiEvent.SessionLoggedOut, loggedOut);
        setClient(c);
      },
      (error: unknown) => {
        if (!cancelled) latest.current.onError?.(error);
      },
    );

    return () => {
      cancelled = true;
      started?.off(HttpApiEvent.SessionLoggedOut, loggedOut);
      started?.stopClient();
      setClient(null);
    };
  }, [homeserverUrl, userId, deviceId]);

  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

/** The running client from the nearest {@link OratioProvider}, or null while it starts. */
export function useOratioClient(): MatrixClient | null {
  return useContext(ClientContext);
}

/** For hooks that take a client of their own. */
export interface ClientOption {
  /** A client to use instead of the provider's. Null means none. */
  client?: MatrixClient | null;
}

/** An explicit client wins; `undefined` means the provider's. */
export function useResolvedClient(client: MatrixClient | null | undefined): MatrixClient | null {
  const fromContext = useContext(ClientContext);
  return client === undefined ? fromContext : client;
}
