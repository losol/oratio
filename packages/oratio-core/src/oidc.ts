// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { createClient, OAuth2 } from 'matrix-js-sdk';
import type { OratioSession } from './session';

/**
 * Sign-in through the homeserver's OAuth 2.0 API (next-gen auth, MSC3861).
 * The homeserver hands the actual login to its identity provider, e.g. Keycloak.
 * Two halves, because a browser leaves the page in between:
 * {@link beginOidcLogin} before the redirect, {@link completeOidcLogin} after.
 */
export interface OidcLoginOptions {
  homeserverUrl: string;
  /** The app's https home page. Redirect URIs must share its host. */
  clientUri: string;
  /** Where the homeserver sends the user back, e.g. `https://chat.example/auth/callback`. */
  redirectUri: string;
  /** Shown to the user by the homeserver. @default 'oratio' */
  clientName?: string;
}

/** What {@link completeOidcLogin} needs. Keep it until the user comes back, then drop it. */
export interface PendingOidcLogin {
  homeserverUrl: string;
  clientId: string;
  deviceId: string;
  codeVerifier: string;
  redirectUri: string;
  state: string;
}

async function authMetadata(homeserverUrl: string) {
  return createClient({ baseUrl: homeserverUrl }).getAuthMetadata();
}

/** Registers the app with the homeserver and returns the URL to send the user to. */
export async function beginOidcLogin(
  options: OidcLoginOptions,
): Promise<{ url: string; pending: PendingOidcLogin }> {
  const metadata = await authMetadata(options.homeserverUrl);
  const clientId = await OAuth2.registerClient(metadata, {
    client_name: options.clientName ?? 'oratio',
    client_uri: options.clientUri,
    redirect_uris: [options.redirectUri],
    application_type: 'web',
  });
  const oauth = new OAuth2(metadata, { clientId, redirectUri: options.redirectUri });
  const state = crypto.randomUUID();
  const url = await oauth.generateAuthorizationCodeGrantUrl(state);
  return {
    url,
    pending: { ...oauth.context, homeserverUrl: options.homeserverUrl, state },
  };
}

/**
 * Finishes sign-in from the URL the homeserver redirected to. The code comes in
 * the fragment by default; the query string is read as a fallback.
 */
export async function completeOidcLogin(
  pending: PendingOidcLogin,
  callbackUrl: string,
): Promise<OratioSession> {
  const url = new URL(callbackUrl);
  const params = new URLSearchParams(url.hash.slice(1) || url.search);
  const error = params.get('error');
  if (error) {
    throw new Error(params.get('error_description') ?? error);
  }
  if (params.get('state') !== pending.state) {
    throw new Error('Sign-in state does not match. Start again.');
  }
  const code = params.get('code');
  if (!code) {
    throw new Error('The homeserver sent no authorization code.');
  }

  const metadata = await authMetadata(pending.homeserverUrl);
  const oauth = new OAuth2(metadata, pending);
  const tokens = await oauth.completeAuthorizationCodeGrant(code);
  const client = createClient({ baseUrl: pending.homeserverUrl, accessToken: tokens.access_token });
  const { user_id } = await client.whoami();
  return {
    homeserverUrl: pending.homeserverUrl,
    userId: user_id,
    accessToken: tokens.access_token,
    deviceId: pending.deviceId,
    refreshToken: tokens.refresh_token,
    oauthClientId: pending.clientId,
  };
}

/** An OAuth2 helper for a signed-in OIDC session, for token refresh and revocation. */
export async function oauthForSession(session: OratioSession): Promise<OAuth2 | null> {
  if (!session.oauthClientId) {
    return null;
  }
  const metadata = await authMetadata(session.homeserverUrl);
  return new OAuth2(metadata, {
    clientId: session.oauthClientId,
    deviceId: session.deviceId,
    redirectUri: '',
  });
}
