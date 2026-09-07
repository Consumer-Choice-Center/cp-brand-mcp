# CP Brand MCP

Version **0.4.1**. A separate, local Model Context Protocol server for **Considerate Pouchers one-pagers only**. It follows the useful CCC architecture (guidelines, generation, local file materialization, validation, status), but imports no CCC code, branding, assets, typography, or policy claims.

## Authoritative inputs

- `assets/references/CP_Brand_Guidelines.pdf`: exact colors, type roles, logos and photography guidance.
- `assets/references/CP_Onepager_V3.pdf`: composition reference, not a source of default factual claims.
- `assets/logos/`: all eight user-supplied SVG logos, preserved byte-for-byte.
- `assets/images/`: four images extracted from the supplied one-pager. The pouch image is used explicitly in the demonstration, not imposed on every request.
- `data/brand.json`: extracted rules, with implementation conventions distinguished from the reference documents.
- `assets/manifest.json`: SHA-256 integrity checks for supplied assets.

The guide's exact palette is coral `#EA5265`, teal `#1D6379`, cream `#EFEDE0` and off-white `#F4F4F9`. White is allowed inside the unmodified official logos. Natural image pixels are exempt from the vector palette. The guide takes precedence over color-managed PDF appearances and the example's incidental Arial/italic text.

Headlines use **Futura Medium**, subheads **Proxima Nova Semibold**, and body copy **Proxima Nova Regular**. `data/fonts.example.json` documents the required font files. Copy it to the git-ignored `data/fonts.local.json` and configure your installed fonts. The server checks their PostScript identities and uses actual font metrics. There is no substitute-font fallback and no extracted PDF subset font. Font binaries are not bundled; provision licensed fonts and update this file when moving to another computer. Override its path with `CP_BRAND_FONT_CONFIG`.

## Run locally

Requires Node.js 22 or 24 and pnpm. No build step is needed. See [DEPLOYMENT.md](DEPLOYMENT.md) for font provisioning, containers and updates.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run smoke
pnpm start
```

`start` runs a stdio MCP server, not an HTTP endpoint. `smoke` starts a real MCP client, lists tools, reads guidelines, checks copy fit, creates a draft and validates it. Outputs go to `deliverables/`, or the directory specified by `CP_BRAND_OUTPUT_DIR`. Nothing is published or sent over the network at runtime.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_mcp_status` | Live identity, runtime version, paths and asset health |
| `get_brand_guidelines` | CP rules; required before generation in each server session |
| `audit_brand_assets` | Required assets, hashes and exact font availability |
| `create_generation_prompt` | A CP-specific brief and generation workflow |
| `create_central_visual_prompt` | A central-image prompt (compatibility helper) |
| `create_one_pager_visual_prompts` | Four contextual prompts: central image plus one image above each key point |
| `qa_one_pager_layout` | Measure text and reject overflow before writing |
| `create_one_pager` | Materialize editable SVG, JSON source and outlined SVG companion |
| `validate_one_pager_file` | Validate editable SVG locally against CP rules and canonical layout |

Resources: `brand://cp/guidelines` and `brand://cp/one-pager`.

## Generation workflow

1. Read `get_brand_guidelines`.
2. Prepare structured content following `examples/one-pager.json`. Required fields cover the headline, accent, strapline, three callouts, evidence panel, context, transition, four cards, takeaway and sources. Preserve the user's language; this version does not automatically rewrite spelling or facts.
3. Set `topic` to the policy subject and context. Optionally set `centralVisual.concept` to a specific visual idea. Call `create_one_pager_visual_prompts` with the structured content. Generate each of the four visuals separately: one central image and one distinct image for each of the three key points. The calling assistant then uses its connected image-generation tool, inspects the result for relevance, and saves the PNG/JPEG in `inputs/`. Set `heroImage` and `heroAlt`, plus each `callouts[i].image` and `callouts[i].imageAlt`. Optional `callouts[i].imageConcept` guides its generated subject. Other paths, symlinks escaping the allowed directories and non-raster images are rejected. The MCP itself does not run an image model or require API credentials.
4. Call `qa_one_pager_layout` with `{ "content": ... }`.
5. If any of the four images is missing, `create_one_pager` returns `status: "needs_generated_visuals"`, `missingSlots`, and four contextual prompts without creating files, even in draft mode. Generate the image and resume; never silently substitute the reference pouch. Call `create_one_pager` with `{ "content": ..., "outputFileName": "my-one-pager.svg" }`. Filenames cannot traverse directories or overwrite existing artifacts.
6. Call `validate_one_pager_file` with the returned editable `filePath`. Resolve all violations before delivery and inspect the outlined companion visually.

Drafts are visibly marked. Final mode requires four distinct images, descriptions for the three callout images, source entries and `factsVerified: true` supplied **only after the caller verifies the claims**. The server verifies required fields and layout, not the truth of claims or accessibility of cited URLs. It does not browse or fabricate evidence.

The main SVG preserves editable text using the exact CP font names, embedded PNG/JPEG imagery and the supplied inline official SVG logo. The `.outlined.svg` companion turns text into vector paths with those fonts, preserving appearance when fonts are unavailable; its text is no longer editable. The JSON sidecar is the source for revisions. Change that content and regenerate to a new filename. Arbitrary SVG edits fail canonical validation, preventing unreviewed styling, geometry or logo changes.

The locked `cp_reference_v3` composition preserves the example's overall hierarchy, page ratio, teal hero, coral evidence/transition panels, four cards, takeaway and logo. The center is a topic-specific visual, not a fixed product container. `centralVisual.frame` is always `circle`; `none` is rejected. The circle has a cream fill and coral outline. Three dashed connectors with arrowheads lead outward to the key points. Each has a separate image region above its heading and body. Reference imagery is blocked by content hash unless the corresponding `centralVisual.useReferenceImage` or `callouts[i].useReferenceImage` is explicitly true. Set that flag only when the user requests reference reuse; the existing demonstration is deliberately marked as a reference-reuse example. It is a clean reusable implementation rather than a pixel-exact clone. No reference policy text or photography is permanently baked into the template. Each callout now requires its own generated PNG/JPEG. Automatic PDF/PNG export is not included in v0.3.0.

## Connect a client

Use `examples/client-config.json`, replacing the absolute path for your machine. Register `cp-brand` independently of `ccc-brand` in your MCP client, then restart the client to discover the tools. Until that happens, the included smoke client can exercise the full server locally.

## Tests

The suite checks CP-only type and palette, XML escaping, tampered SVGs, overflow, required final fields, path confinement, overwrite protection, editable/outlined output and local file validation. The smoke test covers a real stdio MCP round trip. Adobe Illustrator itself has not been automated for compatibility testing.

This is a public, standalone Consumer Choice Center repository. Font binaries, local font configuration, generated working files and machine-specific paths are excluded. See [deployment instructions](DEPLOYMENT.md) and [rights notice](LICENSE).

## Contextual central visuals

The full topic, headline, callouts, cards and takeaway inform the generation prompt. The caller or image model chooses an appropriate object, setting or composite: for example a retail verification scene for age checks, or receipts and coins for taxation. There is no fixed keyword-to-image mapping. A pouch may be appropriate for some topics, but is never a fallback. The image remains natural in color, has no embedded text or logos, and fits the central square without cropping. The surrounding page continues to use CP branding.

If no connected image generator is available, the workflow remains at `needs_generated_visuals`; report that missing capability instead of producing a placeholder artifact. Validation checks the file and layout, not semantic relevance or whether an image was actually AI-generated. The calling assistant must inspect the image and describe its provenance accurately.

## v0.3 migration

For older content, change `centralVisual.frame` from `none` to `circle` (or omit it), and add `image`, `imageAlt`, and optionally `imageConcept` to each of the three callouts. Generate missing images through the connected image tool. Prior deliverables are preserved; regenerate to a new filename to use the updated composition. The reference demonstration and smoke test use explicitly marked reference assets for layout testing, not newly generated artwork.

## v0.4 layout update

Key-point image slots are about 15% larger in each dimension: 194 x 113 on the right and 236 x 115 on the left. Their image regions are repositioned above the existing headings while text remains in its protected slots.

A required oversized CP pouch-symbol watermark runs across the hero and lower-page background, cropped at the right edge like the supplied PDF. It uses the exact symbol path from `CP_Logo_Wide_1.svg`, 7% opacity, cream over teal and teal over off-white, behind all foreground content. This user-requested watermark treatment does not alter the foreground official logo. Canonical validation rejects changes to the watermark or image-slot geometry. Existing content JSON works without new fields; regenerate to a new filename.
