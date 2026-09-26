import { describe, expect, it } from 'vitest';
import { completeOidcLogin, type PendingOidcLogin } from './oidc';

const pending: PendingOidcLogin = {
  homeserverUrl: 'http://localhost:8008',
  clientId: 'client',
  deviceId: 'DEVICE',
  codeVerifier: 'verifier',
  redirectUri: 'https://localhost:5173/auth/callback',
  state: 'expected',
};

// These checks run before any request, so no homeserver is needed.
describe('completeOidcLogin', () => {
  it('reports an error sent back by the homeserver', async () => {
    await expect(
      completeOidcLogin(
        pending,
        `${pending.redirectUri}#error=access_denied&error_description=Nope`,
      ),
    ).rejects.toThrow('Nope');
  });

  it('rejects a callback for another sign-in', async () => {
    await expect(
      completeOidcLogin(pending, `${pending.redirectUri}#code=abc&state=other`),
    ).rejects.toThrow('state');
  });

  it('rejects a callback without a code, reading the query when there is no fragment', async () => {
    await expect(
      completeOidcLogin(pending, `${pending.redirectUri}?state=expected`),
    ).rejects.toThrow('no authorization code');
  });
});
