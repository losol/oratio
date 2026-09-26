import { MatrixEvent } from 'matrix-js-sdk';
import { describe, expect, it } from 'vitest';
import { toOratioMessages } from './timeline';

const ts = Date.UTC(2026, 8, 26, 7, 41);

function event(type: string, content: Record<string, unknown>, id = '$1') {
  return new MatrixEvent({
    event_id: id,
    type,
    content,
    sender: '@ingrid:losol.no',
    origin_server_ts: ts,
    room_id: '!r',
  });
}

describe('toOratioMessages', () => {
  it('maps text messages and emotes, falling back to the localpart for the nick', () => {
    const rows = toOratioMessages(
      [
        event('m.room.message', { msgtype: 'm.text', body: 'Hei!' }, '$1'),
        event('m.room.message', { msgtype: 'm.emote', body: 'vinker' }, '$2'),
      ],
      { locale: 'nb-NO' },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: '$1', type: 'msg', nick: 'ingrid', text: 'Hei!' });
    expect(rows[0]?.time).toMatch(/^\d{2}[:.]\d{2}$/);
    expect(rows[1]).toMatchObject({ type: 'action', text: 'vinker' });
  });

  it('skips state events and messages without a text body', () => {
    const rows = toOratioMessages([
      event('m.room.member', { membership: 'join' }),
      event('m.room.message', { msgtype: 'm.image', url: 'mxc://x/y' }),
    ]);
    expect(rows).toEqual([]);
  });
});
