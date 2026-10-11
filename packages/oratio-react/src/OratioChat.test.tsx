import { EventEmitter } from 'node:events';
import { type MatrixClient, type OratioSession, startClient } from '@eventuras/oratio-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OratioChat } from './OratioChat';
import { OratioProvider } from './OratioProvider';

vi.mock('@eventuras/oratio-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@eventuras/oratio-core')>()),
  startClient: vi.fn(),
}));

const session: OratioSession = {
  homeserverUrl: 'https://matrix.example',
  userId: '@ole:example',
  accessToken: 'token-1',
  deviceId: 'DEVICE1',
};

// A text message, as much of a MatrixEvent as the log reads.
function textEvent(id: string, body: string) {
  return {
    getId: () => id,
    getType: () => 'm.room.message',
    getContent: () => ({ msgtype: 'm.text', body }),
    getSender: () => '@ingrid:example',
    getTs: () => 0,
    isRedacted: () => false,
    isRelation: () => false,
    sender: null,
  };
}

// One joined room with the given messages, and a send that fails.
function fakeClient(events: ReturnType<typeof textEvent>[] = []) {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  const room = {
    roomId: '!r',
    name: 'kurs',
    getMyMembership: () => 'join',
    getJoinedMemberCount: () => 2,
    getUnreadNotificationCount: () => 0,
    hasEncryptionStateEvent: () => false,
    getLiveTimeline: () => ({
      getEvents: () => events,
      getPaginationToken: () => null,
      getNeighbouringTimeline: () => null,
    }),
    getMember: () => null,
  };
  client.stopClient = vi.fn();
  client.getRooms = () => [room];
  client.getRoom = () => room;
  client.getAccountData = () => undefined;
  client.getUserId = () => session.userId;
  client.sendTextMessage = vi.fn(async () => {
    throw new Error('offline');
  });
  return client as unknown as MatrixClient;
}

afterEach(() => {
  vi.mocked(startClient).mockReset();
  vi.unstubAllGlobals();
});

describe('OratioChat', () => {
  it('keeps the text and says so when a message cannot be sent', async () => {
    const client = fakeClient();
    vi.mocked(startClient).mockResolvedValue(client);
    render(
      <OratioProvider session={session}>
        <OratioChat />
      </OratioProvider>,
    );
    const field = (await screen.findByPlaceholderText('Skriv en melding')) as HTMLInputElement;
    // The placeholder switches from «Kobler til…» once the client runs.
    await screen.findByText('kurs');

    fireEvent.change(field, { target: { value: 'Hei alle' } });
    fireEvent.submit(field.form as HTMLFormElement);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('Meldingen ble ikke sendt. Prøv igjen.');
    expect(field.value).toBe('Hei alle');
    expect(client.sendTextMessage).toHaveBeenCalledWith('!r', 'Hei alle');
  });

  it('opens a room at a message and highlights it', async () => {
    // ChatLog scrolls the highlighted row into view with what jsdom lacks.
    vi.stubGlobal('CSS', { escape: (value: string) => value.replace(/["\\]/g, '\\$&') });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    Element.prototype.scrollTo = () => {};
    const events = ['God morgen', 'Dagens post', 'Takk'].map((body, i) => textEvent(`$${i}`, body));
    vi.mocked(startClient).mockResolvedValue(fakeClient(events));
    const { container } = render(
      <OratioProvider session={session}>
        <OratioChat roomId="!r" around="$1" />
      </OratioProvider>,
    );
    const row = await waitFor(() => {
      const found = container.querySelector('[data-message-id="$1"]');
      expect(found).not.toBeNull();
      return found;
    });
    expect(row?.getAttribute('aria-current')).toBe('true');
    expect(container.querySelector('[data-message-id="$0"]')?.hasAttribute('aria-current')).toBe(
      false,
    );
  });
});
