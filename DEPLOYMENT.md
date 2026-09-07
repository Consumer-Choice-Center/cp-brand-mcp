# Deploy CP Brand MCP

CP uses the same deployment model as CCC Brand MCP: GitHub hosts the repository
and release; an MCP client starts the server using stdio. GitHub does not run a
persistent MCP endpoint. No HTTP URL or open port is required.

## Local or server checkout

Requires Node.js 22 or 24 and pnpm 11.19.0.

```sh
git clone https://github.com/Consumer-Choice-Center/cp-brand-mcp.git
cd cp-brand-mcp
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
cp data/fonts.example.json data/fonts.local.json
```

Supply your licensed full Futura Medium, Proxima Nova Semibold, and Proxima Nova
Regular font files in `assets/fonts/`, or edit `data/fonts.local.json` to point to
existing files. Relative font paths resolve relative to that JSON file. The
server never substitutes fonts. A `.ttc` collection containing Futura-Medium is
supported. Font binaries and local machine paths are excluded from Git and the
release package.

```sh
pnpm run audit:assets
pnpm test
pnpm run smoke
```

Asset audit and full rendering tests must pass before using the installation for
final output. `pnpm run test:portable` verifies discovery and fail-closed behavior
on machines without fonts; it is not a substitute for these full rendering tests.

Configure the MCP client:

```json
{
  "mcpServers": {
    "cp-brand": {
      "command": "node",
      "args": ["/absolute/path/to/cp-brand-mcp/src/server.mjs"]
    }
  }
}
```

Optional environment variables:

- `CP_BRAND_FONT_CONFIG`: absolute path to a font configuration JSON.
- `CP_BRAND_OUTPUT_DIR`: writable output directory; defaults to `deliverables/`.

Put new generated image assets in the checkout's `inputs/` directory. Use the
calling assistant's image-generation tool for the four contextual images.
The MCP itself does not invoke an image model.

## Container

Build from the public repository:

```sh
docker build -t cp-brand-mcp .
```

Prepare a private `runtime-config/fonts.json` whose font paths refer to
`/fonts/Futura.ttc`, `/fonts/ProximaNova-Semibold.otf`, and
`/fonts/ProximaNova-Regular.otf`. Provision those files in a private `fonts/`
directory. Create `inputs/` and `deliverables/` writable by container UID 1000.

```sh
docker run --rm -i \
  -v "$PWD/runtime-config:/config:ro" \
  -v "$PWD/fonts:/fonts:ro" \
  -v "$PWD/inputs:/app/inputs" \
  -v "$PWD/deliverables:/app/deliverables" \
  cp-brand-mcp
```

Use that command as the MCP client's stdio command. `-i` is required; do not use
`-t`, which can corrupt protocol traffic. For a remote machine, run the same
command over `ssh -T` using an existing SSH account.

Tagged releases publish the npm-format archive as a GitHub release asset and a
container image at `ghcr.io/consumer-choice-center/cp-brand-mcp`. Container pull
access follows the organisation's GitHub Packages visibility settings. A public
source checkout can always build the same container locally. The container does
not include proprietary font binaries.

## Update

```sh
git pull --ff-only
pnpm install --frozen-lockfile
pnpm run audit:assets
pnpm test
pnpm run smoke
```

Restart the MCP client to load the new process. `get_mcp_status` reports the live
version and asset health. CP remains independent of CCC Brand MCP.
