# @eventuras/oratio-react

React bindings for the oratio Matrix client: a provider, hooks for rooms and
timelines, and composed views built on `@eventuras/ratio-ui/chat`.

Safe to import and render on the server, e.g. in React Router or Next.js:
every module with hooks or state carries its own `'use client'` directive, and
the client only starts in the browser.

## Peer dependencies

- `react` and `react-dom` 19
- `@eventuras/ratio-ui` 2.25 or later, for the chat components and tokens

## Install

```sh
pnpm add @eventuras/oratio-react @eventuras/oratio-core @eventuras/ratio-ui
```

## Usage

`OratioProvider` runs a Matrix client for a session. Where the session comes
from is up to the host: the web app keeps its own after an OIDC sign-in, while
a host that signs users in itself, e.g. through a Matrix appservice, hands over
the session its server got.

```tsx
import { OratioChat, OratioProvider } from '@eventuras/oratio-react';

<OratioProvider session={session} onLoggedOut={getNewSession}>
  <div style={{ height: 480 }}>
    <OratioChat locale="nb-NO" />
  </div>
</OratioProvider>;
```

The client restarts when the homeserver, user or device of the session
changes. Refreshed OIDC tokens come back through `onSessionChange`;
`onLoggedOut` fires when the homeserver no longer accepts the token.

`OratioChat` shows the room list, the log of the open room and a message
field, and fills its container. Pass `roomId` to show one room without the
list, e.g. the chat of one place. Text defaults to Norwegian Bokmål:
`labels={oratioChatLabelsEn}`, or the host's own translations, change it.

For your own views, the hooks read the provider's client: `useOratioClient`,
`useRooms`, `useTimeline(roomId)`, `useSendMessage(roomId)` (`/me` sends an
emote) and `useCreateRoom`. Each also takes `{ client }` to use another one.

## Status

Early, 0.x: the API may change between minor versions. No end-to-end
encryption: encrypted rooms are listed, but not readable.

## License

MPL-2.0
