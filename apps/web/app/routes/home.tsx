// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { logout, type OratioSession, parseUserId } from '@eventuras/oratio-core';
import {
  OratioChat,
  OratioProvider,
  useCreateRoom,
  useOratioClient,
} from '@eventuras/oratio-react';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { clearSession, loadSession, saveSession } from '../session';

/** Creates rooms and signs out, under the room list. */
function Actions({ onRoomCreated }: { onRoomCreated: (roomId: string) => void }) {
  const navigate = useNavigate();
  const client = useOratioClient();
  const createRoom = useCreateRoom();
  // The display name: with Keycloak sign-in the localpart is the user's UUID.
  const userId = client?.getUserId() ?? '';
  const me = client?.getUser(userId)?.displayName || parseUserId(userId)?.localpart;

  async function create() {
    const name = window.prompt('Navn på rommet');
    if (name) onRoomCreated(await createRoom(name));
  }

  async function signOut() {
    if (client) await logout(client).catch(() => undefined);
    clearSession();
    navigate('/login');
  }

  return (
    <>
      <Button variant="outline" size="sm" onPress={create} isDisabled={!client}>
        Nytt rom
      </Button>
      <Button variant="text" size="sm" onPress={signOut}>
        Logg ut {me}
      </Button>
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [session, setSession] = useState<OratioSession | null>(null);
  // A new room opens right away: remount the chat with it as the default.
  const [openRoomId, setOpenRoomId] = useState<string>();

  useEffect(() => {
    const stored = loadSession();
    if (stored) setSession(stored);
    else navigate('/login');
  }, [navigate]);

  function signedOut() {
    clearSession();
    navigate('/login');
  }

  return (
    <OratioProvider session={session} onSessionChange={saveSession} onLoggedOut={signedOut}>
      <OratioChat
        key={openRoomId}
        defaultRoomId={openRoomId}
        locale="nb-NO"
        aside={<Actions onRoomCreated={setOpenRoomId} />}
        style={{ height: '100dvh' }}
      />
    </OratioProvider>
  );
}
