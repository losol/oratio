# @eventuras/oratio-react

React bindings for the oratio Matrix client: a provider, hooks for rooms and
timelines, and composed views built on `@eventuras/ratio-ui/chat`.

Safe to import from React Server Component hosts such as Next.js: every module
with hooks or state carries its own `'use client'` directive, and there are no
compound statics (`Chat.Header`-style) on client components.

## Peer dependencies

- `react` and `react-dom` 19
- `@eventuras/ratio-ui` 2.25 or later, for the chat components and tokens

## Install

```sh
pnpm add @eventuras/oratio-react @eventuras/oratio-core @eventuras/ratio-ui
```

## Status

Early, 0.x: the API may change between minor versions. Has the `useRooms` and
`useTimeline` hooks; the provider and composed views are still to come.

## License

MPL-2.0
