import { EventEmitter } from 'node:events';
import type { ReactNode } from 'react';
import {
  HttpApiEvent,
  type MatrixClient,
  type OratioSession,
  startClient,
} from '@eventuras/oratio-core';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSendMessage } from './actions';
import { OratioProvider, useOratioClient } from './OratioProvider';

vi.mock('@eventuras/oratio-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@eventuras/oratio-core')>()),
  startClient: vi.fn(),
}));

// An event emitter with the client methods the provider and hooks call.
function fakeClient() {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  client.stopClient = vi.fn();
  client.sendTextMessage = vi.fn(async () => ({}));
  client.sendEmoteMessage = vi.fn(async () => ({}));
  return client as unknown as MatrixClient & EventEmitter;
}

const session: OratioSession = {
  homeserverUrl: 'https://matrix.example',
  userId: '@ole:example',
  accessToken: 'token-1',
  deviceId: 'DEVICE1',
};

function Probe({ onClient }: { onClient: (client: MatrixClient | null) => void }) {
  onClient(useOratioClient());
  return null;
}

afterEach(() => {
  vi.mocked(startClient).mockReset();
});

describe('OratioProvider', () => {
  it('provides the started client and keeps it across token refreshes', async () => {
    const client = fakeClient();
    vi.mocked(startClient).mockResolvedValue(client);
    let seen: MatrixClient | null = null;
    const probe = (c: MatrixClient | null) => {
      seen = c;
    };

    const { rerender, unmount } = render(
      <OratioProvider session={session}>
        <Probe onClient={probe} />
      </OratioProvider>,
    );
    await waitFor(() => expect(seen).toBe(client));

    rerender(
      <OratioProvider session={{ ...session, accessToken: 'token-2' }}>
        <Probe onClient={probe} />
      </OratioProvider>,
    );
    expect(startClient).toHaveBeenCalledTimes(1);

    unmount();
    expect(client.stopClient).toHaveBeenCalled();
  });

  it('starts a new client for another device', async () => {
    vi.mocked(startClient).mockImplementation(async () => fakeClient());
    const { rerender } = render(<OratioProvider session={session} />);
    await waitFor(() => expect(startClient).toHaveBeenCalledTimes(1));
    rerender(<OratioProvider session={{ ...session, deviceId: 'DEVICE2' }} />);
    await waitFor(() => expect(startClient).toHaveBeenCalledTimes(2));
  });

  it('reports a session the homeserver logged out', async () => {
    const client = fakeClient();
    vi.mocked(startClient).mockResolvedValue(client);
    const onLoggedOut = vi.fn();
    let seen: MatrixClient | null = null;
    render(
      <OratioProvider session={session} onLoggedOut={onLoggedOut}>
        <Probe
          onClient={(c) => {
            seen = c;
          }}
        />
      </OratioProvider>,
    );
    await waitFor(() => expect(seen).toBe(client));

    act(() => {
      client.emit(HttpApiEvent.SessionLoggedOut, new Error('M_UNKNOWN_TOKEN'));
    });
    expect(onLoggedOut).toHaveBeenCalledTimes(1);
    expect(seen).toBeNull();
  });

  it('starts again when the host renews a logged-out session for the same device', async () => {
    const first = fakeClient();
    const second = fakeClient();
    vi.mocked(startClient).mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    let seen: MatrixClient | null = null;
    const probe = (c: MatrixClient | null) => {
      seen = c;
    };
    const { rerender } = render(
      <OratioProvider session={session}>
        <Probe onClient={probe} />
      </OratioProvider>,
    );
    await waitFor(() => expect(seen).toBe(first));

    act(() => {
      first.emit(HttpApiEvent.SessionLoggedOut, new Error('M_UNKNOWN_TOKEN'));
    });
    expect(seen).toBeNull();

    rerender(
      <OratioProvider session={{ ...session, accessToken: 'token-renewed' }}>
        <Probe onClient={probe} />
      </OratioProvider>,
    );
    await waitFor(() => expect(seen).toBe(second));
    expect(startClient).toHaveBeenCalledTimes(2);
  });

  it('reports a client that cannot start', async () => {
    vi.mocked(startClient).mockRejectedValue(new Error('unreachable'));
    const onError = vi.fn();
    render(<OratioProvider session={session} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('unreachable')));
  });
});

describe('useSendMessage', () => {
  it('sends text, sends /me as an emote and skips blank text', async () => {
    const client = fakeClient();
    vi.mocked(startClient).mockResolvedValue(client);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OratioProvider session={session}>{children}</OratioProvider>
    );
    const { result } = renderHook(
      () => ({ client: useOratioClient(), send: useSendMessage('!room') }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.client).toBe(client));

    await result.current.send('  hei  ');
    await result.current.send('/me vinker');
    await result.current.send('   ');
    expect(client.sendTextMessage).toHaveBeenCalledExactlyOnceWith('!room', 'hei');
    expect(client.sendEmoteMessage).toHaveBeenCalledExactlyOnceWith('!room', 'vinker');
  });
});
