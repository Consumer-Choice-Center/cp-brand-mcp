# CP HTTP alongside CCC and WVA

CP has its own checkout, container and port. The shared external Docker network is `archivebox_default`.

| Service | Checkout | Docker upstream | HTTPS connector |
| --- | --- | --- | --- |
| CCC | `/home/archive/ccc-brand-mcp` | `ccc-brand-mcp:8080` | `https://mcp.consumerchoicecenter.org/mcp` |
| WVA | `/home/archive/wva-brand-mcp` | `wva-brand-mcp:8082` | `https://wva-mcp.consumerchoicecenter.org/mcp` |
| CP | `/home/archive/cp-brand-mcp` | `cp-brand-mcp:8083` | Proposed: `https://cp-mcp.consumerchoicecenter.org/mcp` |

The CP hostname and Caddy fragment are deployment configuration, not a claim of live DNS or server deployment. The Compose file publishes no host port. Leave CCC and WVA services and Caddy entries in place.

## Transports

HTTP exposes **8 tools and 3 resources**, including quote rendering with inline previews and temporary PNG/SVG downloads. CP portraits are supplied by public HTTPS URL or PNG/JPEG data URI; no arbitrary server paths are exposed. Other rendering remains in stdio. See [HTTP quotes](../docs/http-quotes.md).

Local or operator-controlled SSH stdio exposes **all 18 tools**, including one-pagers, social posts, quotes, photo cutouts and validation. It uses bundled open fonts and operator-controlled input/output directories. General-purpose hosted rendering and uploads are not included; quote portraits and quote outputs are supported.

## Bundled fonts and preserved artwork

Jost Medium and Montserrat Regular/SemiBold are included as static TTFs with OFL notices. New text uses these approved fallback faces; finished logos use fixed vectors preserving original Futura lettering. Source logos/reference artwork are retained unchanged.

No private font transfer or `/fonts` / `/config` mounts are required. On upgrade, remove legacy `CP_BRAND_FONT_CONFIG` overrides and old font/config bind mounts. The default Compose file already does this. Old local files are not automatically loaded, and no CI font secrets are used. See [font policy](../README.md#typography-policy).

## Bootstrap on the shared server

```sh
cd /home/archive
git clone https://github.com/Consumer-Choice-Center/cp-brand-mcp.git
cd cp-brand-mcp
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

Keep the previous image and its matching configuration for rollback. Roll back only CP:

```sh
CP_BRAND_MCP_IMAGE=cp-brand-mcp:previous docker compose -f deploy/docker-compose.yml up -d --no-build --wait
```

The image runs as non-root. Compose uses a read-only root filesystem, bundled open fonts, resource limits and rotating logs. Caddy is the single trusted proxy hop; keep port 8083 unexposed on the host while that trust is enabled.

## HTTP quote downloads

The Compose configuration sets `CP_MCP_PUBLIC_BASE_URL` to the HTTPS origin. Caddy must proxy the entire host, including `/artifacts/`; the supplied fragment already does. Quote renders use one isolated worker at a time and a 64 MiB in-memory artifact store. Links expire after one hour and disappear on restart; no output volume is needed. The service uses a 768 MiB memory limit for rendering. After deploying, refresh the Claude connector to rediscover `create_quote_post`, then run the HTTP smoke script.
