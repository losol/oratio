---
'@eventuras/oratio-core': minor
'@eventuras/oratio-react': minor
---

An embeddable chat. `oratio-react` gets `OratioProvider`, which runs a client for a session from the host and reports sessions the homeserver logged out; `OratioChat`, a complete chat that can also show a single room; `useOratioClient`, `useSendMessage` (with `/me` emotes) and `useCreateRoom`; and translatable labels in Norwegian Bokmål and English. `oratio-core` exports `HttpApiEvent`.

Breaking: `useRooms` and `useTimeline` read the provider's client. Pass another as an option: `useRooms({ client })` and `useTimeline(roomId, { client, locale })`, instead of `useRooms(client)` and `useTimeline(client, roomId, options)`.

`OratioChat` keeps the text of a message that could not be sent and shows `labels.sendFailed`. The English labels cover the room list and the log, and host labels for those merge per entry. `OratioProvider` starts a new client when the host renews a logged-out session, also for the same device.
