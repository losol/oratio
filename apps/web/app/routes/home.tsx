// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { useState } from 'react';
import { ChatChannelList, type ChatChannelListSection, ChatLog } from '@eventuras/ratio-ui/chat';

// Sample data until the app talks to a homeserver.
const sections: ChatChannelListSection[] = [
  {
    label: 'Rom',
    rooms: [
      { id: 'general', kind: 'channel', name: 'general', members: 12 },
      { id: 'kurs', kind: 'channel', name: 'kurs', unread: 3 },
    ],
  },
  {
    label: 'Direkte',
    rooms: [{ id: 'ingrid', kind: 'dm', name: 'Ingrid', presence: 'online' }],
  },
];

export default function Home() {
  const [activeId, setActiveId] = useState('general');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px minmax(0, 1fr)', height: '100dvh' }}>
      <ChatChannelList
        sections={sections}
        activeId={activeId}
        onSelect={setActiveId}
        aria-label="Rom"
      />
      <ChatLog
        aria-label={activeId}
        me="ole"
        messages={[
          { id: '1', type: 'divider', text: 'I dag' },
          { id: '2', time: '09:41', nick: 'ingrid', role: 'op', text: 'Velkommen til oratio!' },
          { id: '3', time: '09:42', nick: 'ole', text: 'Hei @ingrid, dette er ratio-ui/chat.' },
          { id: '4', type: 'event', time: '09:43', text: 'Tor har blitt med i rommet' },
        ]}
      />
    </div>
  );
}
