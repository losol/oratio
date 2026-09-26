# oratio

A chat client for [Matrix](https://matrix.org), built on the eventuras stack:
[ratio-ui](https://github.com/losol/ratio-ui) for the interface,
[Tuwunel](https://github.com/matrix-construct/tuwunel) as the homeserver and
Keycloak ([tessera-idp](https://github.com/losol/tessera-idp)) for sign-in.

One client, several homes: the course system (eventuras), Losvik kommune, and
more later. Web first; native apps may follow.

## Layout

```
apps/web         Demo client (React Router, SPA)
packages/core    Framework-agnostic Matrix client on matrix-js-sdk
packages/react   React hooks and components on ratio-ui/chat
charts/tuwunel   Helm chart for the Tuwunel homeserver
dev/             Local Tuwunel via Docker Compose
```

Folders appear as they are built. See Status.

## Development

Requires Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm build
pnpm test
```

Releases use [changesets](https://github.com/changesets/changesets):
`pnpm changeset` records a change.

## Status

Early development. The monorepo skeleton is being set up.

## License

MPL-2.0
