// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  logout,
  type MatrixClient,
  Preset,
  parseUserId,
  startClient,
} from '@eventuras/oratio-core';
import { useRooms, useTimeline } from '@eventuras/oratio-react';
import { ChatChannelList, ChatLog } from '@eventuras/ratio-ui/chat';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { Input } from '@eventuras/ratio-ui/forms';
import { clearSession, loadSession, saveSession } from '../session';

/** Starts a client for the stored session, or sends the user to /login. */
function useClient(): MatrixClient | null {
  const navigate = useNavigate();
  const [client, setClient] = useState<MatrixClient | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate('/login');
      return;
    }
    let started: MatrixClient | null = null;
    let cancelled = false;
    startClient(session, { onSessionChange: saveSession }).then((c) => {
      started = c;
      if (cancelled) c.stopClient();
      else setClient(c);
    });
    return () => {
      cancelled = true;
      started?.stopClient();
    };
  }, [navigate]);

  return client;
}

export default function Home() {
  const navigate = useNavigate();
  const client = useClient();
  const rooms = useRooms(client);
  const [activeId, setActiveId] = useState<string | null>(null);
  const roomId = activeId ?? rooms[0]?.id ?? null;
  const messages = useTimeline(client, roomId, { locale: 'nb-NO' });
  const encrypted = rooms.find((room) => room.id === roomId)?.encrypted ?? false;
  const me = parseUserId(client?.getUserId() ?? '')?.localpart;

  // ChatLog leaves scrolling to the caller: follow new messages.
  const logRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: new messages are the trigger, not an input
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get('text')).trim();
    if (!client || !roomId || !text) return;
    form.reset();
    await client.sendTextMessage(roomId, text);
  }

  async function createRoom() {
    const name = window.prompt('Navn på rommet');
    if (!client || !name) return;
    // Invite-only: on a federated server a public room is open to anyone
    // who learns its ID.
    const { room_id } = await client.createRoom({ name, preset: Preset.PrivateChat });
    setActiveId(room_id);
  }

  async function signOut() {
    if (client) await logout(client).catch(() => undefined);
    clearSession();
    navigate('/login');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px minmax(0, 1fr)', height: '100dvh' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
        <ChatChannelList
          sections={[{ label: 'Rom', rooms }]}
          activeId={roomId}
          onSelect={setActiveId}
          aria-label="Rom"
        />
        <Button variant="outline" size="sm" onPress={createRoom} isDisabled={!client}>
          Nytt rom
        </Button>
        <Button variant="text" size="sm" onPress={signOut}>
          Logg ut {me}
        </Button>
      </aside>
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div ref={logRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <ChatLog aria-label="Meldinger" me={me} messages={messages} />
        </div>
        {encrypted ? (
          <p role="status" style={{ padding: '12px 22px 14px' }}>
            Dette rommet er ende-til-ende-kryptert. oratio kan ikke lese eller sende krypterte
            meldinger ennå, så bruk Element her.
          </p>
        ) : (
          <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: '12px 22px 14px' }}>
            <Input
              name="text"
              aria-label="Melding"
              placeholder={client ? 'Skriv en melding' : 'Kobler til…'}
              autoComplete="off"
              style={{ flex: 1 }}
            />
            <Button type="submit" isDisabled={!roomId}>
              Send
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
