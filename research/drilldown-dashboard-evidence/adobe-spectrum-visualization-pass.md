# Adobe Spectrum analytics visualization pass

Captured 2026-08-22

## Conclusion

The dashboard should lead with the visual encoding that answers the analytical question. Values, comparisons, definitions, and tables should support that signal instead of preceding it as ceremonial page furniture.

For T3Code this means:

- Time questions open on a line or column chart
- Distribution questions open on ranked bars
- Composition questions open on a proportional bar
- Exact records remain in quiet tables below the visual explanation
- Accent color identifies selection, focus, and the primary series instead of filling large interface regions

## Spectrum evidence

### Visualizations have one primary job

Spectrum divides visualization intent into exploration, monitoring, and explanation. A dashboard view should optimize for one of these jobs instead of treating the graph as decoration beneath a title and metric wall.

T3Code domain pages are primarily monitoring views. The chart therefore becomes the page lead. Drilldown, comparison, and evidence provide explanation after the signal is visible.

Source: [Spectrum data visualization fundamentals](https://spectrum.adobe.com/page/data-visualization-fundamentals/)

### Background layers create hierarchy

Spectrum uses background base, layer one, and layer two for application framing. Large regions should be separated through those layers rather than through saturated component backgrounds.

The T3Code pass keeps the olive-dark identity but removes lime from active navigation, briefing cards, and metric panels. Those surfaces now use the existing neutral layer ladder. Lime remains a small focus and brand marker.

Source: [Spectrum using color](https://spectrum.adobe.com/page/using-color/)

### Color must match the data relationship

Spectrum distinguishes categorical, sequential, and diverging color. It recommends fewer than six categorical colors and consistent meaning across charts. It also warns against coloring every category when position can already separate the values.

The T3Code pass uses:

- Olive for the primary observed series
- Seafoam for a secondary comparison
- Green for positive terminal state
- Clay for negative state
- Amber for interrupted or notice state
- Neutral layers for framing and current-window emphasis

Source: [Spectrum color for data visualization](https://spectrum.adobe.com/page/color-for-data-visualization/)

### Line charts answer time questions

Spectrum recommends line charts for chronological change. It keeps actual observations angular rather than smoothing them, supports compact values beside sparklines, and offers small multiples when too many series would compete.

The T3Code request-flow chart keeps its exact angular trace, gains a visible zero baseline, scale labels, a current-window band, a final-value marker, and point hover targets. The accessible table remains available below it.

Source: [Spectrum line chart](https://spectrum.adobe.com/page/line-chart/)

### Area charts need a zero baseline

Spectrum requires a zero baseline for area charts because area height communicates magnitude. It also says time belongs on the horizontal axis and warns against overlapping areas when individual values matter.

The T3Code line trace retains a restrained area fill for magnitude while anchoring it to zero. The fill is subordinate to the observed line and is no longer fluorescent.

Source: [Spectrum area chart](https://spectrum.adobe.com/page/area-chart/)

### Tables should be quiet support

Spectrum treats tables as the right tool for scanning and comparing exact values. Numeric columns should be right aligned, missing values should use an en dash, zebra stripes should be avoided, and column dividers should be used sparingly.

T3Code already follows most of this guidance. The pass keeps project and evidence tables below the lead visualization and leaves them visually quiet.

Source: [Spectrum table](https://spectrum.adobe.com/page/table/)

## Implemented hierarchy

### Atlas

The forty-two-day request trace now appears before the four summary readings. The summary cells are shorter and none use a full lime background.

### Portfolio

The page opens on ranked requested turns by project. Active project count, concentration, and active threads sit in the chart header. Movement facts and the project table follow.

### Flow

The page opens directly on the forty-two-day requested-turn chart. Current volume, change, and active threads sit beside the chart title. Equal-window comparison and exact reading facts follow.

### Reliability

The page opens on daily error and interruption counts. Completion, exception count, and nonterminal count sit beside the chart title. Terminal composition and denominator detail follow.

### Activity

The page opens on normalized agent-operation rates. Raw counts are supporting context below.

### Evidence

The page opens on attribution composition. Projection lag and freshness sit beside the signal. Contract detail and claim-level tables follow.

## Guardrails

- Do not restore full accent-colored panels
- Do not add a chart merely to make a page feel analytical
- Keep every chart tied to a time, comparison, composition, or distribution question
- Keep exact values and accessible tables available
- Keep semantic state colors distinct from brand color
- Do not smooth observed lines
- Do not infer qualitative thresholds where the contract defines none
