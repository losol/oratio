import { EventEmitter } from 'node:events';
import { type MatrixClient, type OratioSession, startClient } from '@eventuras/oratio-core';
import { fireEvent, render, screen } from '@testing-library/react';
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

// One joined room, no messages, and a send that fails.
function fakeClient() {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  const room = {
    roomId: '!r',
    name: 'kurs',
    getMyMembership: () => 'join',
    getJoinedMemberCount: () => 2,
    getUnreadNotificationCount: () => 0,
    hasEncryptionStateEvent: () => false,
    getLiveTimeline: () => ({ getEvents: () => [] }),
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
});
