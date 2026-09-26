#!/bin/sh
# Hands Caddy the script hashes computed at build time and the runtime
# homeserver, both of which end up in the Content-Security-Policy.
set -eu
: "${HOMESERVER_URL:?HOMESERVER_URL must be set, e.g. https://matrix.example.org}"
CSP_SCRIPT_HASHES="$(cat "$CSP_SCRIPT_HASHES_FILE")"
export CSP_SCRIPT_HASHES HOMESERVER_URL
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
