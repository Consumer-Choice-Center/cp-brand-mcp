# CP HTTP alongside CCC and WVA

CP has its own checkout, container and port. The shared external Docker network is `archivebox_default`.

| Service | Checkout | Docker upstream | HTTPS connector |
| --- | --- | --- | --- |
| CCC | `/home/archive/ccc-brand-mcp` | `ccc-brand-mcp:8080` | `https://mcp.consumerchoicecenter.org/mcp` |
| WVA | `/home/archive/wva-brand-mcp` | `wva-brand-mcp:8082` | `https://wva-mcp.consumerchoicecenter.org/mcp` |
| CP | `/home/archive/cp-brand-mcp` | `cp-brand-mcp:8083` | Proposed: `https://cp-mcp.consumerchoicecenter.org/mcp` |

The CP hostname and Caddy fragment are deployment configuration, not a claim of live DNS or server deployment. The Compose file publishes no host port. Leave CCC and WVA services and Caddy entries in place.

## Transports

Public HTTP is stateless and read-only, matching CCC/WVA: **7 tools and 3 resources** for guidelines, status, asset audit, templates, spelling and generation/photo briefs. It exposes no upload, render, server-file-path, download or filesystem-write tools. Public status redacts runtime and font paths. HTTP has host validation, rate/body/concurrency limits, security headers and bounded timeouts.

Local or operator-controlled SSH stdio exposes **all 18 tools**, including one-pagers, social posts, quotes, photo cutouts and validation. It requires licensed fonts and input/output directories. A public hosted rendering/upload service is not included.

## Private fonts

On a machine with the licensed fonts configured, run:

```sh
python3 scripts/prepare-private-fonts.py --config data/fonts.local.json --output runtime-private
```

This creates private `fonts/` and `config/fonts.json` mount directories, plus CI secret parts. `runtime-private/` is excluded from Git, npm packages and Docker build context. Copy **only** `runtime-private/fonts` and `runtime-private/config` through an authenticated private transfer to the CP server checkout. Never put fonts or CI secret parts in a public release. On Linux, make the mount directories readable by container UID 1000; use owner-only directory/file permissions (0700/0600). The read-only mounts point to `/fonts` and `/config/fonts.json`. Alternatively place the fonts elsewhere and set absolute `CP_FONT_DIRECTORY` / `CP_FONT_CONFIG_DIRECTORY` in `deploy/.env`.

Verify the exact font identities and asset hashes before rendering. No fallback fonts are used.

## Bootstrap on the shared server

```sh
cd /home/archive
git clone https://github.com/Consumer-Choice-Center/cp-brand-mcp.git
cd cp-brand-mcp
# Transfer the private font/config directories before this step.
docker network inspect archivebox_default
docker compose -f deploy/docker-compose.yml config --quiet
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d --wait
```

Create DNS for `cp-mcp.consumerchoicecenter.org` pointing to the CCC server. Back up `/home/archive/archivebox/Caddyfile`, then append only `deploy/Caddyfile.cp`. Validate and reload the existing Caddy service:

```sh
cd /home/archive/archivebox
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

If the existing service has a different name, use its name from `docker compose ps`. When overriding the hostname, update both the Caddy fragment and `CP_MCP_PUBLIC_HOST`, and add `--env-file deploy/.env` to Compose commands.

Verify CP and the existing services after reload:

```sh
curl --fail --silent --show-error https://cp-mcp.consumerchoicecenter.org/healthz
curl --fail --silent --show-error https://mcp.consumerchoicecenter.org/healthz
curl --fail --silent --show-error https://wva-mcp.consumerchoicecenter.org/healthz
node scripts/smoke-http.mjs https://cp-mcp.consumerchoicecenter.org/mcp
```

The MCP smoke check verifies CP identity, font/asset health, tool restrictions and resource discovery. Register CP as its own connector.

## Updates and rollback

GitHub Actions builds/tests code and releases; it does not deploy to the server. In the CP checkout only:

```sh
docker tag cp-brand-mcp:local cp-brand-mcp:previous
git pull --ff-only
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d --wait
```

Keep the previous commit and private configuration. Roll back only CP:

```sh
CP_BRAND_MCP_IMAGE=cp-brand-mcp:previous docker compose -f deploy/docker-compose.yml up -d --no-build --wait
```

The image runs as non-root. Compose uses a read-only root filesystem, private read-only font mounts, resource limits and rotating logs. Caddy is the single trusted proxy hop; keep port 8083 unexposed on the host while that trust is enabled.
