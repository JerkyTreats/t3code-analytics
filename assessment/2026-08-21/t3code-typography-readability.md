# T3Code Analytics Typography Readability Audit

Date: 2026-08-21

## Outcome

The dashboard had a strong visual identity but used display typography as if most of the page were decorative metadata. The revised system preserves the editorial industrial character while making the analytical reading layer calmer, larger, and more consistent.

## Observed Failure Pattern

Live computed styles showed that most functional text was between 8 and 11 pixels:

| Role | Prior size | Prior treatment | Readability cost |
| --- | ---: | --- | --- |
| table headers | 8 pixels | uppercase monospace | difficult column scanning |
| signals | 8 pixels | uppercase monospace | poor status recognition |
| chart labels | 9 pixels | uppercase monospace | weak chart interpretation |
| secondary explanations | 9 to 10 pixels | dim monospace | hard sustained reading |
| table values | 11 pixels | monospace | visual noise across wide rows |
| display heading | 54 pixels on mobile | 0.79 line height | compressed word shapes |

Monospace appeared across almost every analytical role. That made metadata, explanations, categories, controls, and values look equally mechanical. Secondary text also used a quiet color with insufficient contrast for small type.

## Research Basis

Adobe Spectrum uses a 14 pixel medium body size on desktop, a 1.5 line-height multiplier for Latin body text, and a larger mobile type scale. Spectrum separates body, detail, heading, and code roles instead of treating monospace as a general interface face.

W3C guidance emphasizes readable line spacing, adaptable text spacing, limited line length, and reflow under enlargement. Its text-spacing test requires content to survive user overrides up to 1.5 line height, 0.12 em letter spacing, and 0.16 em word spacing without lost content or functionality.

Atkinson Hyperlegible informed the body stack because its letterforms deliberately distinguish ambiguous characters through open counters, clear uprights, and differentiated pairs. The dashboard requests Atkinson Hyperlegible Next and Mono when locally available, then uses Noto and platform fallbacks. It makes no external font request.

Evidence:

- [Adobe Spectrum body typography](https://spectrum.adobe.com/page/body/)
- [Adobe Spectrum typography tokens](https://opensource.adobe.com/spectrum-design-data/tokens/typography/)
- [Adobe Spectrum platform scale](https://spectrum.adobe.com/page/platform-scale/)
- [W3C text spacing guidance](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- [W3C visual presentation guidance](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)
- [Braille Institute Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/)

## Revised Type Contract

- 16 pixel body base with 1.5 line height
- 12 pixel minimum for persistent analytical labels
- 13 to 14 pixels for values, explanations, chart labels, and table cells
- 15 pixels for project links
- sans serif for every functional reading role
- monospace reserved for the T3 brand mark
- serif retained for display headings and large metrics
- display line height widened from 0.79 to 0.93, with 0.98 at the narrow viewport
- negative heading tracking reduced
- body copy capped near 48 characters where the layout permits
- secondary text contrast raised without flattening the visual hierarchy
- mobile body copy increased instead of reduced

## Verification

- desktop portfolio visually inspected at 1440 by 1100
- desktop project drilldown visually inspected at 1440 by 1100
- mobile portfolio visually inspected at 390 by 844
- body, labels, cells, signals, and explanatory copy verified through browser computed styles
- body line height resolves to 24 pixels at the 16 pixel base
- functional text resolves to the readable sans-serif stack
- simulated W3C spacing overrides produced no document overflow and no clipped text nodes
- `paper` on `panel` contrast is 15.27 to 1
- `muted` on `panel` contrast is 8.68 to 1
- `quiet` on `panel` contrast is 5.32 to 1
- `acid` on `ink` contrast is 17.12 to 1

## Deliberate Limits

This slice does not vendor font binaries. The stack uses locally available Atkinson when present and deterministic open or platform fallbacks otherwise. A later self-hosted font package is worthwhile only if cross-device visual consistency proves more important than the added artifact and licensing maintenance.
