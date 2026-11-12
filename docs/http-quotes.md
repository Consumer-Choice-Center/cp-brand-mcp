# HTTP quote rendering

`create_quote_post` is available on the HTTP connector. Read the brand guidelines, prepare approved wording (or use draft mode), then call the tool with the flat arguments below. The response contains a native MCP PNG image preview, four resource links and JSON metadata with download URLs, hashes and an expiry time. Present the preview and links to the user; do not paste base64 or recreate the template manually.

```json
{
  "quote": "This is sample wording for reviewing a layout.",
  "mode": "draft",
  "template": "quote_side",
  "language": "en",
  "personName": "Example speaker",
  "personTitle": "Example role",
  "portraitUrl": "https://your-public-site.example/portrait.png",
  "imageAlt": "Portrait supplied for this quotation",
  "imageProvenance": "provided_photo",
  "visualRelevanceConfirmed": true
}
```

Replace the example portrait URL with a real, accessible PNG/JPEG supplied or approved for the request. Alternatively provide `portraitData` as a `data:image/png;base64,...` or `data:image/jpeg;base64,...` URI. Supply exactly one. Do not invent base64; if the client cannot access an attachment's bytes, use a public image URL or an assistant-side file transfer capability. Local attachment paths and authenticated web pages are not usable server inputs.

Portraits are limited to 4 MiB, 4096 pixels per side and 12 megapixels. URL downloads require HTTPS on port 443, public IPv4 DNS results, bounded redirects and time/size limits. Each redirect is checked; the connection is pinned to the checked address. Private, loopback and metadata addresses are rejected. Portrait URLs and bytes are not retained in the artifact store; generated SVGs/PNGs contain the photograph as part of the artwork.

CP accepts `quote_side` and `quote_overlay`, speaker name/title, image description/provenance and confirmed relevance. For sourced photos, include `imageSourceUrl`, `imageCredit` and `imageLicense`. Final mode requires `quoteVerified`, `factsVerified` and attribution sources. English and Swedish are supported. Local stdio retains its existing `{content, outputFileName}` shape and `imageFile` workflow.

## Delivery and retention

- `quote.png`: full-size 1080 × 1350 image; the inline preview is 540 × 675.
- `quote.svg`: editable text master with embedded portrait and official logo.
- `quote.outlined.svg`: text converted to paths for appearance-preserving delivery.
- `quote.json`: source content for regeneration (CP requires the original portrait again).

Links use unguessable 192-bit tokens and grant access to anyone holding the complete URL. Treat them as private bearer links. They expire after one hour and are lost on restart. Download/save outputs immediately; this is not a permanent gallery. No directory listing is exposed. Download responses disable caching and force attachment delivery with a restrictive content policy.

The unauthenticated HTTP service permits one quote render at a time. Rendering runs in a worker with a 25-second timeout and a bounded JS heap. Up to 64 artifacts batches totaling 64 MiB are retained in process memory; when full, requests fail without evicting unexpired links. Request limits also apply to downloads. The service never writes submitted portraits or generated artifacts to the server filesystem. It does not fetch images for WVA, run an image model or add arbitrary filesystem access.

## Deploy and verify

Set `CP_MCP_PUBLIC_BASE_URL` to the external HTTPS origin, with no path/query/credentials. The Compose file configures this from the public hostname. Reverse-proxy both `/mcp` and `/artifacts/`; the supplied Caddy site proxies the whole host. Local loopback requests derive their base URL automatically.

Rebuild/restart the service, run `node scripts/smoke-http.mjs https://YOUR-HOST/mcp`, and reconnect/refresh the Claude connector so it discovers the new tool. The smoke script renders a draft and fetches its PNG. No Claude session was directly tested by the automated suite; protocol tests use the official MCP client.

GitHub publishing alone does not update a live server. Local `pnpm start` still provides the full stdio tools. Do not expose general filesystem tools through the public endpoint.
