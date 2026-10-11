# @eventuras/oratio-core

Framework-agnostic core of the oratio Matrix client. Wraps
[matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) and maps rooms,
timelines and members to the shapes that `@eventuras/ratio-ui/chat` renders.

No DOM dependencies: storage and other platform services are injected, so the
package can serve a web app, a Capacitor shell or React Native.

## Install

```sh
pnpm add @eventuras/oratio-core
```

## History

Sync brings the latest events of each room, and not all events are messages:
memberships, power levels and pins are events too. These functions load the
rest, on any platform:

```ts
import {
  backfill,
  eventsFrom,
  hasOlder,
  loadOlder,
  openAt,
  toOratioMessages,
} from '@eventuras/oratio-core';

const live = room.getLiveTimeline();
// When a room opens: page back until there are 20 messages, at most 5 requests.
await backfill(client, live, { minMessages: 20, maxPages: 5 });
// "Load older", or infinite scroll: at least 10 more messages, however much
// state lies between, at most 5 requests, and false at the room's start.
if (hasOlder(live)) await loadOlder(client, live, { minMessages: 10, maxPages: 5 });
// A link to a message: page back to it, or load the part of the room around
// it, with about 20 messages on both sides.
const found = await openAt(client, room, eventId, { minMessages: 20 }); // { timeline, live } or null
const messages = toOratioMessages(eventsFrom(found?.timeline ?? live));
```

Paging counts messages, not events: a room full of memberships, power levels
and pins still gets messages to show. `loadOlder` and `loadNewer` take a
number too, for one request of that many events, as in 0.2.

`openAt` falls back to the homeserver's `/context` API, which needs a client
created with `timelineSupport`, as `startClient` does. matrix-js-sdk asks it
for the event alone, so `openAt` then pages both ways around it
(`fillAround`). A timeline from it is not the live one: `loadNewer` pages it
forwards, `hasNewer` turns false once it meets the live timeline, and
`eventsFrom` runs on through the timelines it met. `toOratioMessages` skips edits (`m.replace`): matrix-js-sdk shows their
text in place of the message they edit.

## Status

Early, 0.x: the API may change between minor versions. Signs in with a
password or through the homeserver's OIDC (MSC3861), syncs with token refresh,
and maps rooms and timelines. No end-to-end encryption.

## Development

```sh
pnpm --filter @eventuras/oratio-core build
pnpm --filter @eventuras/oratio-core test
```

## License

MPL-2.0
