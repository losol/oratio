// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { completeOidcLogin } from '@eventuras/oratio-core';
import { clearPendingLogin, loadPendingLogin, saveSession } from '../session';

/** Where the homeserver sends the user back after signing in. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // The code can be exchanged once; StrictMode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const pending = loadPendingLogin();
    if (!pending) {
      setError('Fant ingen påbegynt innlogging.');
      return;
    }
    completeOidcLogin(pending, window.location.href)
      .then((session) => {
        saveSession(session);
        navigate('/', { replace: true });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(clearPendingLogin);
  }, [navigate]);

  return (
    <main style={{ maxWidth: 360, margin: '10vh auto', padding: 16 }}>
      {error ? (
        <>
          <p role="alert">Innloggingen feilet: {error}</p>
          <Link to="/login">Prøv igjen</Link>
        </>
      ) : (
        <p>Logger inn…</p>
      )}
    </main>
  );
}
