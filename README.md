# CP Brand MCP

Version **0.8.0**. A separate Model Context Protocol server for **Considerate Pouchers one-pagers, social posts, quotes and real-photo cutouts**. It follows the useful CCC architecture (guidelines, generation, local file materialization, validation, status), but imports no CCC code, branding, assets, typography, or policy claims.

## Authoritative inputs

- `assets/references/CP_Brand_Guidelines.pdf`: exact colors, type roles, logos and photography guidance.
- `assets/references/CP_Onepager_V3.pdf`: composition reference, not a source of default factual claims.
- `assets/logos/`: the eight original user-supplied SVG logos, preserved byte-for-byte, plus the unchanged white wide logo extracted from the supplied quote reference.
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

The locked `cp_reference_v3` composition preserves the example's overall hierarchy, page ratio, teal hero, coral evidence/transition panels, four cards, takeaway and logo. The center is a topic-specific visual, not a fixed product container. `centralVisual.frame` is always `circle`; `none` is rejected. The circle has a cream fill and coral outline. Three dashed connectors with arrowheads lead outward to the key points. Each has a separate image region above its heading and body. Reference imagery is blocked by content hash unless the corresponding `centralVisual.useReferenceImage` or `callouts[i].useReferenceImage` is explicitly true. Set that flag only when the user requests reference reuse; the existing demonstration is deliberately marked as a reference-reuse example. It is a clean reusable implementation rather than a pixel-exact clone. No reference policy text or photography is permanently baked into the template. Each callout now requires its own generated PNG/JPEG. One-pager output remains editable and outlined SVG; new social outputs also include PNG.

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


## v0.5 social and quote workflow

The local release adds five 1080 × 1350 layouts, adapted from the four supplied CP SVG references: `social_orbit`, `social_editorial`, `quote_side`, `quote_overlay`, and `photo_cutout`. English (`en`) and Swedish (`sv`) are supported, including Å/Ä/Ö. No translation is automatic. Headline, body and CTA copy remains caller-supplied. `review_spelling` offers suggestions without rewriting copy, particularly quotations.

1. Call `get_brand_guidelines`, then `list_social_templates`.
2. Fill a JSON example in `examples/`. Put request-supplied portraits or real source photographs inside `inputs/`; local paths outside that directory and escaping symlinks are rejected.
3. For quotes, supply `quote`, `personName`, `personTitle`, `imageFile`, `imageAlt`, `imageProvenance` and `visualRelevanceConfirmed`. There is no default portrait or identity. Transparent portraits are trimmed and anchored to the bottom of the frame. Opaque photos are cropped with `focalPoint: [x, y]` in normalized coordinates. Optional `cropPolygon` isolates a subject.
4. For photo cutouts, call `create_cutout_photo_brief` to prepare a contextual sourcing brief. The caller finds and inspects an actual photograph; this server neither searches the web nor generates images. Supply a pre-cut transparent PNG or trace `cropPolygon` and optional `cropHoles` in normalized original-image coordinates. Sourced photographs require `imageSourceUrl`, `imageCredit` and `imageLicense`. Record `recentVisualConcepts` to guide variety; no fixed image assortment is selected.
5. Call `qa_social_layout`, then `create_social_post`, `create_quote_post` or `create_cutout_post`. All accept `{content, outputFileName}`; the optional output name is a stem without an extension. Missing photos return `needs_real_photo` without creating an artifact.
6. Validate each returned editable SVG using `validate_social_post` and inspect its PNG. Edits belong in source JSON, followed by regeneration to a new name.

Exports include editable SVG, outlined SVG, 1080 × 1350 PNG and canonical JSON. Cutout templates default to `imageTreatment: "both"`: matched natural-color and greyscale photographs with the same crop and deterministic grain. Branding stays colored; the outline uses CP off-white. `grainAmount` defaults to 0.08 and `outlineWidth` to 7. Quotes always retain natural color and do not receive cutout grain or outlines. These user-requested social treatments are scoped exceptions to the original photography rules; legacy one-pager behavior remains intact.

Social body copy stays at least 44px, CTAs at least 42px, and quotes at least 48px. Exact font glyph bounds, including accented letters and overhangs, are measured before export. Overflow is rejected rather than clipped. Oversized background typography is intentionally cropped; logos remain whole. Validation checks source photo hashes and regenerates every companion export, rejecting edits or changed inputs. It does not prove photo authenticity, factual accuracy, subject relevance or a good face crop: the caller must inspect those. Spelling suggestions are advisory.

Final social mode requires `factsVerified: true` and source entries; quotes also require `quoteVerified: true`. Draft status is recorded in JSON and the tool result, not stamped over the social artwork. Demonstration quotations are explicitly sample copy and must not be attributed to the pictured people.

There are 18 local stdio tools. Existing connected clients must restart the CP server (or restart the client) to rediscover them. The current development changes have not been uploaded or deployed. HTTP hosting will be configured separately when preparing the server deployment.

The generic deterministic mask/grain/outline routine is adapted from the local WVA implementation; CP contains its own copy and has no runtime dependency on a sibling checkout. All CP fonts, palette, templates and logo assets are independent. No image-generation API key is needed for the social workflow.

### Visual review script

`scripts/review-social.mjs` exercises the actual MCP and validates seven preview exports. It uses local, git-ignored inputs: portraits extracted from the supplied CP quote references and a real megaphone review fixture with source metadata. These are review-only assets, never renderer defaults. The script emits a browsable `index.html` and `contact-sheet.png` under `deliverables/`. It is not part of the portable test suite.


## Additional photo-scene references

Two supplied social screenshots are preserved under `assets/references/social/`: `CP_PhotoScene_TopStrips.jpg` and `CP_PhotoScene_OverlayStrips.jpg`. Their interpretation is available through `get_brand_guidelines` → `social.photoSceneDirection`. They establish a scene-based collage direction: retain the people, activity and relevant setting of a supplied real photo; selectively replace the background with CP teal, layer coral graphic shapes behind subjects, and position unboxed text according to the image. Provide matching natural-color and greyscale treatments, with restrained grain and CP graphics remaining colored.

The upper-text and overlaid-text compositions are implemented as `scene_top_strips` and `scene_overlay_strips`. Screenshots, platform UI, existing claims and photographed events must not become default assets or copy. Original source photographs are supplied per post. The library now contains seven renderer layouts.


### Photo-scene creation (v0.6)

Call `create_photo_scene_post` with `{content, outputFileName}`, or use `create_social_post`. Use `template: "scene_top_strips"` for upper headline text and a large foreground scene, or `"scene_overlay_strips"` for lower overlay text and an upper logo. Both export color and greyscale pairs by default at 1080 × 1350.

Supply `headline` (up to 240 characters, optional explicit line breaks), optional `cta`, and the usual photograph/provenance fields. `body` is intentionally not used: the copy belongs in headline text. The renderer measures each line, keeps the type at least 64px, places text directly on the artwork without backing shapes, and rejects overflow.

`scene.backgroundMode` defaults to `replace`: supply a normalized foreground `cropPolygon`, optional `cropHoles`, or a transparent PNG. Trace the whole scene you want to retain, including people, buildings and ground. The renderer preserves the source coordinate system, applies subtle grain, and places coral shapes behind the retained photograph. It does not infer a mask or generate new subjects. Use `keep` to retain the source background.

Use `focalPoint`, `scene.scale`, and `scene.offsetX`/`offsetY` to fit the photograph. Use `scene.textY` to move text away from important subjects. `scene.accent` selects `burst`, `diagonal`, or `none`. Human inspection remains required to avoid covering faces. The example JSON files contain no default photos. Validate each returned SVG and inspect its PNG before delivery.


### v0.7.0 edge and overlay refinement

Polygon masks now use bounded curved contours and light alpha-edge feathering (`maskSmoothing: 0.65`, `edgeFeather: 0.65` by default). Both are adjustable, including zero for a hard architectural edge. Photograph RGB detail is not blurred, and professionally supplied transparent alpha remains untouched. The same mask is applied to both color treatments. Scene review masks are also traced more closely around hair, shoulders and sleeves.

Scene and quote posts have no gradient overlays. CP logos are placed directly on the artwork with no backing rectangles. All social and quote text, including names and roles, appears directly on the artwork without backing boxes; portraits remain fully visible to the bottom of the frame.

Social imagery prioritizes real, unbranded pouches and plain containers, varied by topic. Final crops must show no commercial logos, brand names or branded packaging. The orbit layout connects the central image to each callout with a curved outward arrow, measured against the actual text bounds.

Pouch appearance follows the supplied Subject 35 and Subject 36 references: a natural rectangular, softly filled fabric sachet with visible sealed end seams and realistic surface texture. Avoid stretched, tapered or cigar-shaped crops. Preserve supplied cutout proportions and alpha; do not synthesize the subject.

Apply subtle deterministic monochrome grain to social-template backgrounds and scene graphic shapes. Keep text and official logos above the texture and crisp. backgroundGrain defaults to 0.04 for cream editorial posts and 0.065 for other templates, accepts 0–0.25, and 0 disables background grain. Existing photograph grain is controlled separately by grainAmount.

## Visual validation and portrait controls (0.7.0)

Social validation independently checks final text geometry for overlaps and frame bounds, then compares rendered glyph pixels with the background underneath. At least 95% of measured glyph interiors must meet 3:1 contrast for type 44px or larger, or 4.5:1 for smaller type. Hidden text is rejected. Draft creation returns the visual report so problematic layouts can be inspected; final creation blocks failed visual QA. This does not identify faces, verify claims or prove photographic authenticity.

Transparent quote portraits fit wholly within their designated area and default to the bottom edge. `portrait.scale` (0.5–1) and `portrait.position` ([horizontal, vertical], each 0–1) control sizing and placement. Opaque photographs use the same bounded placement, with `focalPoint` controlling their crop. Missing quote photos return `needs_portrait` and a quote-specific workflow. Speaker roles use 44–46px text.

Scene logos occupy the upper clear space; top-scene headlines begin below the logo. The cutout layout centers its image vertically, caps enlargement and reports excessive source scaling. Use high-resolution source photography for publication.

## HTTP and private fonts

Run `pnpm run start:http` for the stateless read-only MCP at `http://127.0.0.1:8083/mcp` (seven tools and three resources). Full rendering remains in the 18-tool stdio server. Public HTTP exposes no server filesystem paths or file creation. See [deployment instructions](DEPLOYMENT.md) and [the shared-server setup](deploy/README.md) for the separate CP Compose service, Caddy entry, private font mounts and encrypted CI font secrets. No font binaries are included in public packages or images.
