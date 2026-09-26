# oratio web: the static React Router build, served by Caddy.
#
#   docker build -f apps/web/Dockerfile -t ghcr.io/losol/oratio-web .
#
# Build context is the repo root. At runtime, mount /srv/config.json and set
# HOMESERVER_URL (it goes into the CSP, see Caddyfile).

# 1. Build. The output is plain files, so this stage runs on the build host's
#    own architecture and multi-arch images need no emulation for it.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@eventuras/oratio-web...
# CSP hashes for the inline scripts React Router writes into the HTML.
RUN node apps/web/scripts/csp-hashes.mjs apps/web/build/client > /repo/csp-script-hashes

# 2. Serve.
FROM caddy:2.11.4-alpine
# The official binary carries cap_net_bind_service for ports below 1024. We
# listen on 8080, and with all capabilities dropped (as the chart does) the
# kernel refuses to run a binary that asks for one. Remove it.
RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/build/client /srv
COPY --from=build /repo/csp-script-hashes /etc/caddy/csp-script-hashes
ENV CSP_SCRIPT_HASHES_FILE=/etc/caddy/csp-script-hashes \
    XDG_DATA_HOME=/tmp/caddy-data \
    XDG_CONFIG_HOME=/tmp/caddy-config
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
USER 1000:1000
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
