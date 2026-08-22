# Dark mode with green identity

Captured 2026-08-22

## Executive conclusion

The current T3Code treatment is not failing because it needs a brighter green. It is failing because the palette does not behave as a system.

A credible dark green analytics product needs two coordinated layers:

- Green-tinted structural neutrals for canvas, panels, borders, hover states, and subdued text
- A compact branded green ramp for primary actions, selected state, focus, and a small number of high-value marks

The interface should feel green before the bright accent appears. Bright green should then have a clear job. Replacing yellow with lime while leaving the rest of the interface close to neutral black creates a highlighter effect instead of a brand.

The best direction for T3Code is a blend of MongoDB LeafyGreen and Radix or Primer. MongoDB supplies the deep blue-green surface model. Radix supplies the scale anatomy and green-tinted neutral logic. Primer supplies discipline for dense analytics and chart accessibility.

## Evidence portfolio

| System | Dark mode strategy | Green strategy | What to borrow | What to avoid |
| --- | --- | --- | --- | --- |
| MongoDB LeafyGreen | Deep blue-green canvas with a visibly lighter secondary surface | Green is interactive and branded, but not the only semantic color | Tinted surfaces, calm contrast, clear text ladder | Copying the exact MongoDB identity |
| Radix Colors | Twelve-step dark scales with specific roles for surfaces, borders, solids, and text | Jade, green, grass, and mint can be paired with sage neutrals | Full ramps and role-based tokens | Using one green value for every role |
| GitHub Primer | Neutral technical dark UI with restrained semantic color | Green is strong when meaningful and quiet elsewhere | Dense product ergonomics, chart rules, semantic tokens | Making every positive value green |
| Spotify Encore | Near-black field with one unmistakable branded green | Bright green is reserved for key controls and uses black foreground | High-impact primary action treatment | Applying music-app energy to every dashboard surface |
| Wise Design | Forest green and bright green appear as separate themes and large editorial blocks | Green creates branded moments through scale and typography | Forest canvas, selective bright-green feature regions | Turning a dense analytics page into a campaign page |
| Cash App | Pure black and electric green form a deliberately extreme identity | Green is a signature accent with black or white support | Radical restraint if a very loud brand is wanted | Full electric-green application chrome |

## Official guidance and observed rules

### MongoDB LeafyGreen

MongoDB publishes one of the clearest dark green product palettes. Its dark mode reference uses:

| Role | Official value |
| --- | --- |
| Primary background | `#001E2B` |
| Secondary background | `#112733` |
| Border | `#3D4F58` |
| Primary text | `#E8EDEB` |
| Secondary text | `#C1C7C6` |
| Disabled text | `#889397` |
| Link | `#0498EC` |

The important move is not the brand green. It is the use of cool green-blue blacks for the entire surface ladder. This makes the product feel branded even when no saturated green is visible.

MongoDB also separates green, blue, yellow, and red by meaning. Green can represent primary interaction and success. Blue remains available for links and information. Yellow remains a warning color. Red remains critical. This prevents brand color from erasing semantic meaning.

Source: [MongoDB LeafyGreen palette](https://www.mongodb.design/foundations/palette)

### Radix Colors

Radix treats color as a scale rather than a swatch. Its twelve steps are assigned to recurring jobs:

- Steps 1 and 2 for app and panel backgrounds
- Steps 3 through 5 for component backgrounds and interactive states
- Steps 6 through 8 for borders and focus treatment
- Steps 9 and 10 for solid fills and hover states
- Steps 11 and 12 for lower and higher contrast text

Radix explicitly recommends pairing a green accent with a nearby tinted neutral such as sage. That subtle saturation across the gray ramp creates harmony. It also warns that highly saturated gray ramps can clash when the interface already contains many colorful badges.

For T3Code, the relevant family is sage plus jade or green. Jade is cooler and more technical. Grass is more organic. Lime is designed for dark foreground text and reads more like a campaign accent than a dense product color.

Sources: [Radix palette composition](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette), [Radix scale anatomy](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale), [Radix color system](https://www.radix-ui.com/colors)

### GitHub Primer

Primer shows how green can survive inside a dense technical interface without becoming visual noise. Its dark technical values include green at `#4AC26B`, bright green at `#6FDD8B`, muted gray at `#8C959F`, and error at `#FF8182`.

The more important guidance is semantic. Primer separates base values, functional tokens, and component tokens. This lets one primitive green support selected state, success, chart marks, and focus without forcing those concepts to share the same final value.

Primer also has unusually actionable chart guidance:

- Chart text must reach `4.5:1` against its background
- Meaningful marks must reach `3:1` against the background
- Multiple lines should differ by stroke style and marker as well as color
- Muted mark colors need an outline
- A line chart should usually stay under five series
- A comparative bar chart should usually stay under ten bars

Sources: [Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/), [Primer theme reference](https://primer.style/product/getting-started/react/theme-reference/), [Primer data visualization](https://primer.style/product/ui-patterns/data-visualization/)

### Spotify Encore

Spotify is evidence for a different strategy: neutral dark surfaces plus one iconic green. Spotify found that darkening its green enough for white text weakened the brand. It instead placed black text and icons on the original bright green, reaching a reported `10.9:1` contrast ratio. Against the gray UI background, the green itself reached a reported `9.7:1`.

This is excellent guidance for a primary button. It is poor guidance for filling cards, navigation, trends, badges, and health states with the same green. The power comes from scarcity.

Spotify also moved from raw color tokens to semantic tokens after finding that a single green token had spread across thousands of unknown contexts. That is directly relevant to T3Code.

Sources: [Spotify Better in Black](https://spotify.design/article/better-in-black-rethinking-our-most-important-buttons), [Spotify Encore design system](https://spotify.design/article/reimagining-design-systems-at-spotify), [Spotify semantic token lessons](https://spotify.design/article/can-i-get-an-encore-spotifys-design-system-three-years-on)

### Wise Design

Wise separates Light, Bright Green, and Forest Green into distinct themes. It uses the louder green as a deliberate branded field, while forest green can carry long-form or information-heavy content. Its Text Fact pattern also separates Forest Green, Dark Charcoal, and Dark Gold instead of collapsing everything into one accent.

The lesson for T3Code is compositional. Bright green should define one dominant moment such as a selected signal, a primary action, or a small hero region. It should not tint every analytical component.

Sources: [Wise Design overview](https://wise.design/design-at-wise/get-started), [Wise Hero Simple themes](https://wise.design/patterns/hero-simple), [Wise Text Fact themes](https://wise.design/patterns/text-fact)

### Cash App

Cash App is the loudest end of the portfolio. Its official asset library provides green-on-dark identity assets and both black-green and green-black button treatments. The system is useful as a boundary example: electric green works when the rest of the composition is radically simple.

That strategy conflicts with a dense drilldown dashboard. A page with filters, provenance, status, charts, and multiple interaction levels cannot give every element the visual weight of a payment action.

Sources: [Cash App Pay assets](https://developers.cash.app/cash-app-pay-partner-api/guides/resources/cash-app-pay-assets), [Cash App logo variants](https://design.cash.app/logo-variant-selector)

## Why the current pass feels wrong

The current revision increased measurable contrast but did not improve visual coherence.

- The canvas remains nearly neutral black instead of belonging to a green-tinted surface family
- The bright green acts as a replacement highlighter rather than one step in a ramp
- Green is asked to carry brand, navigation, selected state, positive status, chart emphasis, and decoration
- Borders jump in brightness instead of creating a calm elevation ladder
- Cream text and yellow-green accents pull in different temperature directions
- Large green regions compete with the analytical hierarchy
- Success and brand become visually indistinguishable

This is why passing contrast ratios did not make the interface feel better. Accessibility contrast is a floor. It does not create hierarchy, harmony, or restraint by itself.

## Direction portfolio for T3Code

These palettes are derived candidates, not copies of the cited brands.

### Option A · Deep forest technical

Recommended

| Role | Candidate value |
| --- | --- |
| Canvas | `#06130F` |
| Shell | `#0A1B15` |
| Panel | `#10241B` |
| Raised panel | `#162D22` |
| Border | `#2B4A39` |
| Primary text | `#EAF2ED` |
| Secondary text | `#B4C5BA` |
| Muted text | `#84978B` |
| Brand | `#4ADE80` |
| Brand hover | `#6EE7A0` |
| Brand soft | `#173D29` |
| Focus | `#75E7A3` |

Character: quiet, technical, confident, and visibly green without neon glare.

Reference blend: MongoDB surfaces, Radix sage and jade anatomy, Primer density.

### Option B · Carbon and emerald

| Role | Candidate value |
| --- | --- |
| Canvas | `#090B0A` |
| Shell | `#0F1210` |
| Panel | `#151917` |
| Raised panel | `#1C211E` |
| Border | `#343B36` |
| Primary text | `#F0F4F1` |
| Secondary text | `#B5BDB8` |
| Brand | `#22C55E` |
| Brand hover | `#4ADE80` |
| Brand soft | `#12351F` |

Character: sharp, familiar, and highly legible. Green appears mostly in actions and selected state.

Reference blend: Primer with Spotify restraint.

### Option C · Forest editorial

| Role | Candidate value |
| --- | --- |
| Canvas | `#071F19` |
| Shell | `#0B2A22` |
| Panel | `#10372C` |
| Raised panel | `#174537` |
| Border | `#326452` |
| Primary text | `#F1F6F3` |
| Secondary text | `#C0D2C8` |
| Brand | `#9FE870` |
| Brand hover | `#B5F28D` |
| Brand soft | `#294D2E` |

Character: distinctive, warm, editorial, and more branded. Best if the atlas entry page is intentionally sparse.

Reference blend: Wise forest and bright green themes.

### Option D · Black and electric green

| Role | Candidate value |
| --- | --- |
| Canvas | `#000000` |
| Shell | `#080A08` |
| Panel | `#101310` |
| Raised panel | `#171B17` |
| Border | `#343A34` |
| Primary text | `#FFFFFF` |
| Secondary text | `#A8B0AA` |
| Brand | `#00E013` |
| Brand hover | `#25EE37` |
| Brand soft | `#07350B` |

Character: loud and iconic. It demands severe reduction in interface density and is therefore the weakest fit for the drilldown product.

Reference blend: Cash App and Spotify.

## Recommended path

Use Option A as the product foundation.

Apply these rules before changing component styling:

1. Create independent token families for surfaces, text, borders, brand interaction, analytical series, and semantic state.
2. Use brand green only for primary action, selected state, focus, and one lead data series.
3. Keep success on a related but distinct green value and always pair it with a label or icon.
4. Preserve blue for information and navigation where green would create ambiguity.
5. Use amber only for genuine warning and red or clay only for failure.
6. Make panels differ through a small luminance ladder, not glowing borders or shadows.
7. Use one bright green region at most in the entry atlas. Dense drilldown pages should use green mostly as a line, label, marker, or control state.
8. Test the system on a chart-heavy domain page and an evidence table before evaluating the prettier entry page.

The next visual step should be a side-by-side static comparison of Options A, B, and C using the same real dashboard content. Nothing should be deployed until one direction is selected.
