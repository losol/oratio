# oratio

A chat client for [Matrix](https://matrix.org), built on the eventuras stack:
[ratio-ui](https://github.com/losol/ratio-ui) for the interface,
[Tuwunel](https://github.com/matrix-construct/tuwunel) as the homeserver and
Keycloak ([tessera-idp](https://github.com/losol/tessera-idp)) for sign-in.

One client, several homes: the course system (eventuras), Losvik kommune, and
more later. Web first; native apps may follow.

## Layout

```
apps/web                Demo client (React Router, SPA)
packages/oratio-core    Framework-agnostic Matrix client on matrix-js-sdk
packages/oratio-react   React hooks and components on ratio-ui/chat
charts/tuwunel          Helm chart for the Tuwunel homeserver
dev/                    Local Tuwunel via Docker Compose
```

Folders appear as they are built. See Status.

## Development

Requires Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm lint       # Biome: format, imports and lint rules in one pass
pnpm build
pnpm test
```

### Run the demo

```sh
docker compose -f dev/docker-compose.yml up -d   # Tuwunel on http://localhost:8008
pnpm --filter @eventuras/oratio-web dev          # the web client
```

The local homeserver has `server_name` `localhost` and registration token
`oratio-dev`. Register a user with any Matrix client, or:

```sh
curl -X POST http://localhost:8008/_matrix/client/v3/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ole","password":"oratio","auth":{"type":"m.login.registration_token","token":"oratio-dev"}}'
```

The first user registered becomes server admin.

Releases use [changesets](https://github.com/changesets/changesets):
`pnpm changeset` records a change.

## Status

Early development. The monorepo skeleton is being set up.

## License

MPL-2.0
