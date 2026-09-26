import { describe, expect, it } from 'vitest';
import { parseUserId } from './ids';

describe('parseUserId', () => {
  it('splits localpart and server name', () => {
    expect(parseUserId('@ole:losol.no')).toEqual({ localpart: 'ole', serverName: 'losol.no' });
  });

  it('keeps a port in the server name', () => {
    expect(parseUserId('@ole:localhost:8008')).toEqual({
      localpart: 'ole',
      serverName: 'localhost:8008',
    });
  });

  it('rejects strings that are not user IDs', () => {
    expect(parseUserId('ole:losol.no')).toBeNull();
    expect(parseUserId('@:losol.no')).toBeNull();
    expect(parseUserId('@ole:')).toBeNull();
    expect(parseUserId('@ole')).toBeNull();
  });
});
