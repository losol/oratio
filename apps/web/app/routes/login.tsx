// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { beginOidcLogin, loginWithPassword } from '@eventuras/oratio-core';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { Heading } from '@eventuras/ratio-ui/core/Heading';
import { Text } from '@eventuras/ratio-ui/core/Text';
import { TextField } from '@eventuras/ratio-ui/forms';
import { defaultHomeserverUrl, savePendingLogin, saveSession } from '../session';

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Innlogging feilet';
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The usual way in: the homeserver sends the user on to Keycloak.
  async function signInWithSso() {
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const { url, pending } = await beginOidcLogin({
        homeserverUrl: defaultHomeserverUrl,
        clientUri: `${origin}/`,
        redirectUri: `${origin}/auth/callback`,
      });
      savePendingLogin(pending);
      window.location.assign(url);
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const session = await loginWithPassword({
        homeserverUrl: String(form.get('homeserver')),
        username: String(form.get('username')),
        password: String(form.get('password')),
      });
      saveSession(session);
      navigate('/');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '10vh auto', padding: 16 }}>
      <Heading as="h1">oratio</Heading>
      <Button onPress={signInWithSso} loading={busy} block>
        Logg inn
      </Button>
      {error && <p role="alert">{error}</p>}
      <details style={{ marginTop: 32 }}>
        <summary>
          <Text as="span">Logg inn med passord</Text>
        </summary>
        <form onSubmit={signInWithPassword}>
          <TextField name="homeserver" label="Server" defaultValue={defaultHomeserverUrl} />
          <TextField name="username" label="Brukernavn" autoComplete="username" />
          <TextField
            name="password"
            label="Passord"
            type="password"
            autoComplete="current-password"
          />
          <Button type="submit" variant="outline" loading={busy} block>
            Logg inn med passord
          </Button>
        </form>
      </details>
    </main>
  );
}
