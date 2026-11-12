# CP Brand MCP 0.9.0

Newly generated text now uses the owner-approved open-source fallbacks: Jost Medium for headlines and Montserrat Regular/SemiBold for body text and subheads. Supplied finished artwork retains its original Futura/Proxima Nova appearance.

- Bundle three static TTFs, OFL notices and source links; no Adobe activation or commercial font files are needed at runtime.
- Preserve original logo files and references. Render fixed vector logo copies, retaining original Futura lettering without font substitution.
- Use bundled fonts by default, ignoring legacy automatic fonts.local.json loading. Explicit overrides must identify the approved open faces.
- Apply the same generation faces to layout measurement, editable SVG, outlines, PNG export and visual QA.
- Include open fonts in packages and containers. Remove private font mounts and secret-based CI provisioning.
- Document font policy, migration steps and download links. Restart clients after upgrading; remove old CP_BRAND_FONT_CONFIG overrides.

Public HTTP remains read-only. Full rendering stays in local/authorized SSH stdio. Publishing this update does not deploy a live server.
