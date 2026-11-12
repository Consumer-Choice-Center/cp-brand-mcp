# CP generation fallback fonts

These static TrueType files are the approved defaults for newly generated text. They are intentionally separate from Futura/Proxima Nova lettering preserved in finished brand assets.

| Role | Bundled file | Official TTF download |
| --- | --- | --- |
| Headline | [Jost-Medium.ttf](Jost-Medium.ttf) | [Jost 500 Medium](https://raw.githubusercontent.com/indestructible-type/Jost/master/fonts/ttf/Jost-500-Medium.ttf) |
| Body | [Montserrat-Regular.ttf](Montserrat-Regular.ttf) | [Montserrat Regular](https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Regular.ttf) |
| Subhead | [Montserrat-SemiBold.ttf](Montserrat-SemiBold.ttf) | [Montserrat SemiBold](https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-SemiBold.ttf) |

Downloaded from the designers' official repositories on November 12, 2026. The Jost source filename was shortened; the font binary and internal names are unmodified. Runtime PostScript names are `Jost-Medium`, `Montserrat-Regular` and `Montserrat-SemiBold`. No proprietary fonts are bundled.

Sources: [Jost by Owen Earl / indestructible type](https://github.com/indestructible-type/Jost), [Montserrat by the Montserrat Project](https://github.com/JulietaUla/Montserrat). These files are licensed under SIL OFL 1.1: [Jost notice](Jost-OFL.txt), [Montserrat notice](Montserrat-OFL.txt). Keep these notices with redistributed copies. Do not sell the font files by themselves; comply with reserved-name rules when modifying fonts. These conditions do not require generated artwork to use the OFL.

Asset SHA-256 hashes are recorded in `assets/manifest.json`. Downloads are not made at runtime, so upstream updates cannot silently change layout.

Jost uses standard glyphs (no forced alternate-a substitution). Edit generated SVG text using these installed TTFs, or use the outlined companion for portable display. Existing finished logos/reference materials are not retyped using these fonts.
