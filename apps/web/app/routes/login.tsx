// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { loginWithPassword } from '@eventuras/oratio-core';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { Heading } from '@eventuras/ratio-ui/core/Heading';
import { TextField } from '@eventuras/ratio-ui/forms';
import { defaultHomeserverUrl, saveSession } from '../session';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
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
      setError(err instanceof Error ? err.message : 'Innlogging feilet');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '10vh auto', padding: 16 }}>
      <Heading as="h1">oratio</Heading>
      <form onSubmit={onSubmit}>
        <TextField name="homeserver" label="Server" defaultValue={defaultHomeserverUrl} />
        <TextField name="username" label="Brukernavn" autoComplete="username" />
        <TextField
          name="password"
          label="Passord"
          type="password"
          autoComplete="current-password"
        />
        {error && <p role="alert">{error}</p>}
        <Button type="submit" loading={busy} block>
          Logg inn
        </Button>
      </form>
    </main>
  );
}
