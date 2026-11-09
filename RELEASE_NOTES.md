# CP Brand MCP 0.8.0

Adds seven Considerate Pouchers social/quote templates alongside the existing one-pager tools, plus HTTP configuration for hosting CP beside CCC and WVA.

- 18 local stdio tools; English and Swedish; editable SVG, outlined SVG, PNG and source JSON.
- Real unbranded pouch imagery, smooth outward arrows, subtle grain and paired color/greyscale treatments.
- Bounded speaker portrait placement, larger attribution text, and no logo/text backing boxes or quote/scene gradients.
- Independent rendered contrast, visibility, overlap and text-bound checks; final exports reject failed visual QA.
- Stateless read-only HTTP with seven tools and three resources, host validation, body/rate/concurrency limits and security headers.
- Separate CP Compose/Caddy configuration on port 8083 and the existing shared Docker network.
- Private font mounts and encrypted GitHub Actions font-secret provisioning; no licensed font binaries in the repository, package or image.
- Regression, portability, protocol and container checks.

HTTP provides read-only brand guidance, discovery and briefs. Full rendering remains available through local or authorized SSH stdio. Live server deployment is separate from publishing this repository.
