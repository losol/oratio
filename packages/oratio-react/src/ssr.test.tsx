// @vitest-environment node

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OratioChat, OratioProvider } from './index';

// Hosts such as civitas render on the server: importing the package and
// rendering the chat there must not touch browser globals.
describe('server rendering', () => {
  it('renders the chat without a client', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(
      <OratioProvider session={null}>
        <OratioChat roomId="!room:example" labels={{ connecting: 'Connecting…' }} />
      </OratioProvider>,
    );
    expect(html).toContain('Connecting…');
  });
});
