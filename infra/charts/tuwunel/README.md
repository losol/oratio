# tuwunel

Helm chart for the [Tuwunel](https://github.com/matrix-construct/tuwunel)
Matrix homeserver: one pod on a RocksDB volume, a Gateway API route, and
optional sign-in through Keycloak (tessera-idp) via Tuwunel's OIDC server.

## Minimal

```yaml
serverName: example.org          # permanent: in every user ID
hostname: matrix.example.org
httpRoute:
  gateway:
    sectionName: https-example
```

A closed server: no federation, no registration, clients only.

## With Keycloak sign-in

```yaml
serverName: example.org
hostname: matrix.example.org
existingSecret: tuwunel-secrets   # key keycloak_client_secret
oidc:
  # Only our own apps may register a client, so the approval page can go.
  allowedRedirectHosts: [chat.example.org]
  requireClientApproval: false
identityProviders:
  - brand: Keycloak
    name: Example ID
    clientId: tuwunel             # never change once in use
    issuerUrl: https://id.example.org/realms/example
    clientSecretKey: keycloak_client_secret
    trusted: true                 # matching usernames sign in as existing users
    useridClaims: [preferred_username]
```

Register a confidential client in Keycloak with the redirect URI
`https://matrix.example.org/_matrix/client/unstable/login/sso/callback/tuwunel`.

## Secrets

The chart mounts `existingSecret` at `/run/secrets/tuwunel` and never creates
it. Keys it reads:

| Key                        | When                     |
| -------------------------- | ------------------------ |
| `registration_token`       | `registration.enabled`   |
| `<clientSecretKey>`        | per identity provider    |

## Delegation

When `serverName` differs from `hostname`, set `wellKnown.delegation.enabled`
so `https://<serverName>/.well-known/matrix/*` reaches Tuwunel, with the
Gateway listener for that host in `wellKnown.delegation.sectionName`.

## Data

Messages, rooms, users and uploads live in RocksDB on the PVC. The PVC is kept
when the release is uninstalled. The deployment uses `Recreate`: two pods must
never open the same database. Backups are not part of this chart.

Local development uses the same settings in `infra/dev/tuwunel.toml`.
