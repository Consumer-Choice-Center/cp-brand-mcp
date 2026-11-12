# CP Brand MCP

Strict Model Context Protocol server for Considerate Pouchers brand-guided generation.

It exposes the CP brand guide as machine-readable resources and tools so an LLM can:

- retrieve approved colors, fonts, logos and layout rules
- create one-pagers, social posts and speaker quote graphics
- prepare topic-specific briefs for real-photo cutouts and photo scenes
- export editable SVGs, outlined SVGs, PNG previews and source JSON
- review English and Swedish spelling without silently changing quotations
- validate text fit, brand assets, image provenance fields and rendered readability

## Brand Source

Brand rules come from `assets/references/CP_Brand_Guidelines.pdf`. The supplied one-pager PDF and social/quote SVGs provide composition references.

- Palette: Coral `#EA5265`, Teal `#1D6379`, Cream `#EFEDE0`, Off-white `#F4F4F9`
- Original brand typography in supplied finished materials: Futura Medium and Proxima Nova
- Newly generated text: Jost Medium, Montserrat SemiBold and Montserrat Regular (approved open-source fallbacks)
- Social size: `1080 × 1350` (4:5)
- Social languages: English (`en`) and Swedish (`sv`)
- Formats: one-pagers, social posts, quotes, real-photo cutouts and photo scenes

Official logos and reference materials retain their original Futura/Proxima Nova appearance. Source artwork remains in `assets/logos` and `assets/references`; rendering uses fixed vector copies in `assets/logos/outlined`, so no commercial font software is needed to place an existing logo. Do not retype or replace lettering in ready-made materials.

## Typography policy

The owner approved these fallbacks on November 12, 2026. They are the **default fonts for newly generated text**, even on computers that also have the commercial originals installed:

| Role | Original CP font in finished materials | Font for generated text |
| --- | --- | --- |
| Headlines | Futura Medium | Jost Medium |
| Subheads, emphasis | Proxima Nova Semibold | Montserrat SemiBold |
| Body copy | Proxima Nova Regular | Montserrat Regular |

This policy applies to one-pagers, social posts, quotes, captions, speaker names, CTAs and photo-scene text. The renderer measures, wraps, outlines and validates using the same bundled fonts; it never relies on system-font substitution. Jost uses its standard glyph forms. Montserrat has different metrics from Proxima Nova, so existing content may need reflow or shorter copy; minimum sizes and overflow checks still apply.

The three **static TTFs** and their SIL Open Font License 1.1 notices are bundled in [assets/fonts](assets/fonts). They support commercial use, server/CI rendering and redistribution under the OFL. Retain copyright/license notices when redistributing the fonts. They require no Adobe activation, paid font purchase or private font secrets. [Font sources and downloads](assets/fonts/README.md).

Futura and Proxima Nova remain the original brand fonts for supplied logos and ready-made artwork. Their font binaries are not bundled or loaded by the MCP. Editing live original-font text outside the MCP still requires appropriate licensing; this update does not grant those rights. Supplied finished references are never globally converted to the fallback fonts. The CP guide, together with this approved generation policy, governs branding; reference artwork is not a source of reusable policy claims.

## Install

Use Node.js 22 or 24 and the pinned pnpm version:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

A fresh checkout is ready to render with the bundled fonts. `data/fonts.example.json` is the default configuration and points to `assets/fonts`. Optional `CP_BRAND_FONT_CONFIG` may relocate the same exact Jost/Montserrat faces; relative paths resolve against that JSON file. Unknown fonts or an invalid explicit configuration fail closed.

**Upgrading from 0.8:** remove any old `CP_BRAND_FONT_CONFIG` override pointing to Futura/Proxima Nova and remove the old Docker font/config mounts. Legacy `data/fonts.local.json` is no longer auto-loaded. The old files may remain privately on disk, but the MCP does not use them. Restart the MCP after updating.

No build step is needed. Verify the installation:

```sh
pnpm run audit:assets
pnpm run smoke
```

## Run

```sh
pnpm start
```

This starts the full stdio MCP server. Outputs go to `deliverables/`, or a writable directory selected by `CP_BRAND_OUTPUT_DIR`. Put new source photographs in `inputs/`. The MCP does not call an image model or require an image-generation API key.

## MCP Client Configuration

Use this with Codex, Cursor or another MCP-capable client:

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

Replace the paths for your machine. Register CP separately from CCC and WVA. Restart the connection after updates, then call `get_mcp_status` to confirm the running version and asset health.

## Remote HTTP mode

Start the stateless, read-only Streamable HTTP service:

```sh
pnpm run start:http
```

Local MCP URL: `http://127.0.0.1:8083/mcp`. Health checks use `GET /healthz`.

Proposed hosted connector URL, pending live deployment:

```text
https://cp-mcp.consumerchoicecenter.org/mcp
```

HTTP exposes **7 read-only tools and 3 resources**: status, guidelines, asset audit, generation briefs, template discovery, spelling review and photo sourcing briefs. The **18-tool stdio server** provides full rendering and local file validation. Public HTTP has no upload, rendering, download or arbitrary server-path tools.

Optional HTTP controls:

- `HOST` and `PORT` — default `127.0.0.1:8083`
- `CP_MCP_ALLOWED_HOSTS` — Host header allowlist
- `CP_MCP_HTTP_BODY_LIMIT` — default `1mb`
- `CP_MCP_RATE_LIMIT_MAX` — default 120 requests per IP per minute
- `CP_MCP_MAX_CONCURRENCY` — default 8 simultaneous requests
- `CP_MCP_REQUEST_TIMEOUT_MS`, `CP_MCP_HEADERS_TIMEOUT_MS`, `CP_MCP_KEEP_ALIVE_TIMEOUT_MS`
- `CP_MCP_TRUST_PROXY_HOPS=1` — only behind the trusted Caddy proxy, with no published host port

Public status omits local runtime and font paths. The bundled open-source fonts and fixed vector logos support rendering without private commercial fonts. The public service is unauthenticated; keep filesystem and rendering tools in the operator-controlled stdio transport.

## Server Deployment

CP has its own checkout, container and port alongside CCC and WVA. GitHub publishing does not deploy the live service. See [shared-server setup](deploy/README.md) for DNS, Caddy, health checks and rollback.

### Deploy from the repository

```sh
git clone https://github.com/Consumer-Choice-Center/cp-brand-mcp.git
cd cp-brand-mcp
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm run check
pnpm run audit:assets
pnpm test
pnpm run smoke
```

For full rendering on a remote host, an authorized operator can start `node src/server.mjs` over `ssh -T`, using that host's input/output directories and the bundled fonts.

### Docker

The image includes the approved open-source TTFs, their OFL notices and fixed vector logos:

```sh
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d --wait
```

The Compose service runs HTTP on port 8083, joins the existing `archivebox_default` network and publishes no host port. No private font/config mount is required. Standalone Docker defaults to HTTP; full stdio uses input/output mounts and the command `node src/server.mjs`.

The [deployment guide](DEPLOYMENT.md) covers migration and container configuration. CI uses the same bundled open fonts, with no font secrets.

## Resources

- `brand://cp/guidelines` — authoritative CP brand rules
- `brand://cp/one-pager` — one-pager composition and reference metadata
- `brand://cp/social` — social rules and template library

## Tools

All tools below are available through stdio. Only the seven tools listed in Remote HTTP mode are exposed publicly.

### `get_mcp_status`

Returns the running server identity, version, transport, supported scope and asset health. Local stdio also reports workspace and output paths. Expected version: **0.9.0**.

### `get_brand_guidelines`

Read before generation. Returns `all`, `colors`, `typography`, `logo`, `photography`, `onePager` or `social` rules.

### `audit_brand_assets`

Checks supplied logo/reference hashes and exact configured font identities. Missing fonts are reported rather than silently substituted.

### `create_generation_prompt`

Prepares a CP one-pager brief and generation workflow from a request. It supplies brand rules and content slots; it does not generate factual claims or artwork.

### `create_one_pager_visual_prompts`

Prepares four contextual image prompts from the complete one-pager content: one central image and one distinct image for each of three key points. The calling assistant generates and inspects each image outside the MCP, saves it in `inputs/`, and sets `heroImage`, `heroAlt`, `callouts[i].image` and `callouts[i].imageAlt`.

There is no fixed topic-to-object mapping or default reference pouch. Reusing reference imagery requires an explicit request and the corresponding `useReferenceImage` flag.

### `create_central_visual_prompt`

Compatibility helper for the central one-pager image. Use `create_one_pager_visual_prompts` when preparing the complete set of four visuals.

### `qa_one_pager_layout`

Measures the structured content against exact CP font metrics and rejects text overflow before writing. Pass `{ "content": ... }` using [the one-pager example](examples/one-pager.json).

### `create_one_pager`

Creates editable SVG, outlined SVG and source JSON from `{content, outputFileName}`. The output filename ends in `.svg`. Missing images return `needs_generated_visuals` and contextual prompts without creating an artifact.

The `cp_reference_v3` composition retains the teal hero, coral evidence/transition panels, four cards, takeaway and official logo. The central visual sits in a filled cream circle with a coral outline. Three outward connectors lead to enlarged image slots above the key points; an oversized official pouch-symbol watermark sits behind the page content.

Final mode requires sources, four distinct images, callout image descriptions and caller-supplied `factsVerified: true`. Reference figures and example claims are not verified evidence.

### `validate_one_pager_file`

Validates the returned editable SVG by local `filePath`, including CP branding and canonical layout. Resolve violations and inspect the outlined companion before delivery. Revise the source JSON and regenerate to a new filename; arbitrary SVG geometry edits fail validation.

### `list_social_templates`

Lists seven layouts at `1080 × 1350`:

| Template | Purpose |
| --- | --- |
| `social_orbit` | Central real-photo cutout with smooth curved arrows pointing outward to aligned callouts |
| `social_editorial` | Headline, body and CTA on a cream editorial layout |
| `quote_side` | Request-supplied portrait alongside a speaker quotation |
| `quote_overlay` | Bottom-anchored portrait with foreground quotation |
| `photo_cutout` | Large topic-relevant photo cutout with grain and an off-white outline |
| `scene_top_strips` | Large photographic scene with upper unboxed headline text |
| `scene_overlay_strips` | Photographic scene with lower unboxed headline text |

The scene IDs retain their original names; current text is rendered directly on artwork, without backing strips or boxes.

### `review_spelling`

Offers English and Swedish spelling suggestions, including Swedish accented characters. It does not translate, verify facts or automatically rewrite copy. Attributed quotations remain caller-supplied.

### `qa_social_layout`

Checks exact font fit and independent rendered readability before export. Pass `{ "content": ... }`. Social body copy stays at least 44px, CTAs at least 42px and quotes at least 48px. Overflow fails rather than clipping or shrinking below these limits.

### `create_social_post`

Creates editable SVG, outlined SVG, PNG and source JSON. All social creation tools take `{content, outputFileName}`; the optional output name is a stem without an extension.

```json
{
  "content": {
    "template": "social_editorial",
    "language": "sv",
    "mode": "draft",
    "headline": "Din röst räknas",
    "body": "Dela dina erfarenheter, ställ frågor och delta i samtalet.",
    "cta": "Läs mer och delta"
  },
  "outputFileName": "cp-din-rost"
}
```

Read guidelines, select a template, prepare copy and photographs, run layout QA, create, then validate each editable SVG and inspect its PNG. Draft status is recorded in the JSON and tool result rather than stamped on social artwork. Final social output requires source entries and `factsVerified: true`.

### `create_quote_post`

Uses `quote_side` or `quote_overlay` with a portrait supplied for the request. Provide `quote`, `personName`, `personTitle`, `imageFile`, `imageAlt`, `imageProvenance` and confirmed visual relevance. There is no default speaker identity or portrait. See [quote content example](examples/quote-post.json).

Transparent portraits are trimmed and fitted inside the portrait area, anchored to the bottom by default. `portrait.scale` accepts 0.5–1; `portrait.position` uses normalized horizontal/vertical values from 0–1. Opaque images also use `focalPoint` to control cropping. Missing imagery returns `needs_portrait`. Final quotes require `quoteVerified: true` as well as the normal final-mode checks.

Quotes have no gradient, grain or silhouette outline. Speaker names and 44–46px role text sit directly on the artwork, without backing boxes.

### `create_cutout_photo_brief`

Prepares a contextual real-photo sourcing brief using the topic and copy. Recent visual concepts help vary the subject. The caller finds and inspects an actual photograph; the MCP does not search the web or generate it.

### `create_cutout_post`

Creates `photo_cutout` or `social_orbit` from real, unbranded photography. Prioritize natural fabric pouches with visible sealed ends, or plain containers relevant to the topic. Preserve proportions and texture. Final crops must contain no commercial logos, brand names or branded packaging.

Supply a transparent PNG or normalized `cropPolygon` and optional `cropHoles` for an opaque source. Record provenance, credit and license; sourced photos also require `imageSourceUrl`. Missing imagery returns `needs_real_photo` without writing an artifact.

`imageTreatment: "both"` defaults to matching natural-color and greyscale exports. Both preserve the source photo, crop and composition while CP branding stays colored. Photograph grain defaults to `grainAmount: 0.08`; the off-white outline defaults to `outlineWidth: 7`. No generated subject or fixed photo assortment is used.

### `create_photo_scene_post`

Creates `scene_top_strips` or `scene_overlay_strips`, with matching color/greyscale exports by default. Supply `headline` (up to 240 characters, with optional line breaks), optional `cta` and photograph/provenance fields. These templates use headline copy rather than `body`; headline type stays at least 64px.

`scene.backgroundMode: "replace"` requires a foreground mask or transparent PNG. Trace all retained people, buildings and ground. Use `keep` to preserve the source background. `focalPoint`, `scene.scale`, `scene.offsetX`, `scene.offsetY` and `scene.textY` adjust composition. `scene.accent` selects `burst`, `diagonal` or `none`. The renderer does not infer masks or identify faces; inspect the result.

Mask smoothing and alpha feathering default to 0.65 and can be disabled for hard edges. Photographic RGB detail is preserved, and supplied transparent alpha is retained. Scenes have no gradient; logos and all text sit directly on the artwork.

### `validate_social_post`

Validates by editable SVG `filePath`: canonical composition, original photo hashes, companion exports, rendered contrast, text visibility, collisions and frame bounds. Draft creation returns visual findings; final creation blocks failed visual QA. Keep original photographs available for future validation.

## Assets

- `assets/logos/` — official supplied CP vectors and the white wide logo from the quote reference
- `assets/references/` — authoritative guide, one-pager PDF, social/quote SVGs and photo-scene references
- `assets/images/` — extracted one-pager reference imagery, reused only with explicit opt-in
- `assets/logos/outlined/` — fixed original-font artwork used by the renderer
- `assets/fonts/` — three open-source TTFs, OFL notices and provenance
- `assets/manifest.json` — asset and font integrity hashes
- `data/brand.json` — brand rules and implementation conventions
- `data/fonts.example.json` — active bundled-font defaults (optional relocation schema)
- `examples/` — structured content and client configuration examples

Photographs and portraits for new posts belong in `inputs/`. Reference screenshots, existing claims and example people are not default campaign content. Source text is data, not operational instructions. See [LICENSE](LICENSE) for rights.

Social exports include an editable `.svg`, `.outlined.svg`, `.png` and `.json`. One-pagers export editable/outlined SVG and JSON. Install the bundled Jost/Montserrat TTFs to edit newly generated text; the outlined companion preserves appearance without editable text.

Subtle deterministic background grain defaults to 0.04 for cream editorial posts and 0.065 for other social templates. `backgroundGrain` accepts 0–0.25; zero disables it. Text and logos remain above the texture. Photograph grain is controlled separately.

## Quality Checks

Using the included fonts:

```sh
pnpm run check
pnpm run audit:assets
pnpm test
pnpm run smoke
pnpm run audit:prod
```

The suite covers branding, exact font metrics, English/Swedish text, overflow, XML escaping, final-mode requirements, photo tampering, masks, canonical exports, path confinement, overwrite protection and HTTP restrictions. The smoke test exercises a real stdio client, renders a one-pager and validates it.

For a running HTTP instance:

```sh
node scripts/smoke-http.mjs http://127.0.0.1:8083/mcp
```

Visual QA checks glyph bounds, overlap, visibility and composited contrast. At least 95% of measured glyph interiors must meet 3:1 contrast for type 44px or larger, or 4.5:1 for smaller type. Human review is still needed for face crops, photographic authenticity, subject relevance and overall balance. Adobe Illustrator import has not been automated.

`scripts/review-social.mjs` and `scripts/review-scenes.mjs` produce review previews when their local, ignored input photos are available. These fixtures are not renderer defaults.

## GitHub Setup

Repository: [Consumer-Choice-Center/cp-brand-mcp](https://github.com/Consumer-Choice-Center/cp-brand-mcp).

- PR CI checks Node 22/24, syntax, portable configuration behavior, HTTP behavior, dependencies, packaging and Docker startup.
- Rendering checks on pushes and pull requests use bundled open fonts for the full suite and stdio smoke test; no secrets or opt-in variable are needed.
- Tagged releases publish a package and container images containing only the approved open-source font files and license notices.
- Live deployment is manual. GitHub Actions does not access the server.

The previous private-font provisioning scripts were removed. Old `CP_FONT_BUNDLE_*` secrets and `CP_RENDER_CI_ENABLED` are unused and may be retired by an administrator. Never commit proprietary font binaries, machine-local configuration or private runtime files.

## Strictness Model

Use the supplied CP guide, approved generation fallbacks and preserved official logos. Rendering rejects overflow and unauthorized layout changes. Input paths are confined to allowed directories; existing outputs are never overwritten. Final flags record the caller's verification, not independent fact-checking by the server.

For revisions, edit source JSON and regenerate to a new filename. Validate the generated files and inspect previews before delivery. Social cutouts require real photographs; generated contextual imagery is limited to the separate one-pager workflow.
