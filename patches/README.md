# React-Bits FX + magazine-cover patches

Drop these into your `kgozay/Iran-conflict-tracker` repo to land the **FX1, FX2, FX3, FX5, FX8** effects plus the light V4 magazine-cover typography treatment **across all three pages** (Overview, Macro Transmission, Sector Drilldown). No new npm dependencies.

## What's in here

```
patches/
├── README.md                              ← this file
└── src/
    ├── index.css.append                   ← APPEND to src/index.css
    ├── App.jsx                            ← REPLACE · auto-hide sidebar state
    ├── widgets/
    │   ├── Effects.jsx                    ← NEW · ports of the 5 react-bits effects
    │   ├── Card.jsx                       ← REPLACE · wraps body in SpotlightCard
    │   ├── KpiGrid.jsx                    ← REPLACE · Overview KPI cards
    │   └── RegimeBanner.jsx               ← REPLACE · Overview CIS card
    ├── components/
    │   ├── Sidebar.jsx                    ← REPLACE · pin button + hover-reveal
    │   └── TopBar.jsx                     ← REPLACE · global topbar (all pages)
    └── pages/
        ├── MacroTransmission.jsx          ← REPLACE · MacroStrip + ChannelCard FX
        └── SectorDrilldown.jsx            ← REPLACE · KPI strip + Sector read FX
```

## How to apply

1. **Copy the new component file**
   ```
   patches/src/widgets/Effects.jsx → src/widgets/Effects.jsx
   ```

2. **Append the CSS block** at the end of `src/index.css`
   ```bash
   cat patches/src/index.css.append >> src/index.css
   ```
   This adds the `rb-shine`, `rb-spot`, `rb-star` runtime CSS plus the
   `mag-*` magazine helpers. It's purely additive — your existing tokens
   and `.glass`, `aura-float`, etc. are untouched.

3. **Replace these eight files** (each is a near-drop-in of your current
   version with the patches called out in a `PATCH SUMMARY` comment at the
   top):
   - `src/App.jsx` ← adds `sidebarPinned` state, edge trigger, content margin transition
   - `src/widgets/Card.jsx` ← wraps body in SpotlightCard (FX5 across all pages)
   - `src/widgets/KpiGrid.jsx`
   - `src/widgets/RegimeBanner.jsx`
   - `src/components/Sidebar.jsx` ← pin/unpin button, visible/pinned/hover props
   - `src/components/TopBar.jsx`
   - `src/pages/MacroTransmission.jsx`
   - `src/pages/SectorDrilldown.jsx`

4. `npm run dev` — no install step required.

## Auto-hide sidebar

By default after these patches, the sidebar is **unpinned** — it's hidden
off-screen and the main content uses the full viewport width. Hover the
left **14px edge** to reveal it; move away and it slides back. Click the
**pin icon** in the sidebar header to lock it open in the original 240px
slot (content reflows). The pinned/unpinned preference persists in
localStorage under `jse_sidebar_pinned`.

Mobile (`< lg`) behaviour is unchanged — hamburger button opens the drawer.

If you want the sidebar pinned by default for new users, change the
initial state in `App.jsx`:

```js
const [sidebarPinned, setSidebarPinned] = useState(
  () => localStorage.getItem('jse_sidebar_pinned') !== 'false'  // ← was === 'true'
);
```

## Coverage map — what lands on which page

| FX / treatment | Overview | Macro Transmission | Sector Drilldown | Lives in |
|---|:-:|:-:|:-:|---|
| **FX1** CountUp | ✅ KPI hero, secondary strip, CIS score, composition cells | ✅ MacroStrip 6-up | ✅ KPI strip (Avg/Total/Adv/Dec), Sector read aggregate | `KpiGrid` · `RegimeBanner` · `MacroTransmission` · `SectorDrilldown` |
| **FX2** ShinyText | ✅ Topbar title | ✅ Topbar title | ✅ Topbar title | `TopBar` (global) |
| **FX3** DecryptedText | ✅ Regime label | n/a — no regime label | n/a — no regime label | `RegimeBanner` |
| **FX5** SpotlightCard | ✅ Hero KPI cards | ✅ MacroStrip + ChannelCards + Card panels | ✅ KPI strip + Sector read Card + Stock cards (via Card) | `KpiGrid` · `Card` · `MacroTransmission` · `SectorDrilldown` |
| **FX8** StarBorder | ✅ Refresh button | ✅ Refresh button | ✅ Refresh button | `TopBar` (global) |
| `mag-eyebrow` italic kicker | ✅ | ✅ | ✅ | `TopBar` (global) |
| `mag-kpi-name` italic serif | ✅ KPI names | (Macro strip labels stay mono on purpose) | (KPI kickers stay mono on purpose) | `KpiGrid` |
| `mag-dropcap` | ✅ Regime interpretation | n/a | ✅ Sector read paragraph | `RegimeBanner` · `SectorDrilldown` |

## What each FX does

| FX | Component | Where it lands |
|----|-----------|----------------|
| **FX1** `CountUp` | `Effects.jsx` | All numeric values: KPI prices, CIS hero number, composition cells, MacroStrip tile %s, Sector drilldown KPI strip, sector aggregate numbers. |
| **FX2** `ShinyText` | `Effects.jsx` | Topbar title — applies on every page (Overview, Macro, Drilldown) automatically. Different shine colours for the white and the gold half. |
| **FX3** `DecryptedText` | `Effects.jsx` | The regime label under the CIS score ("mild bearish", "neutral", …). **One-shot by default** — runs once on mount, and re-runs only when the `text` prop changes (e.g. the regime actually switches). Pass `loop={true}` if you'd rather the demo behaviour. |
| **FX5** `SpotlightCard` | `Effects.jsx` | Every hero KPI card, every MacroStrip tile, every ChannelCard, every KPI strip tile on Drilldown, and — via the patched `Card.jsx` — every Card panel across the app (Historical analogues stays opted out via `spotlight={false}` because of the table hover). Spotlight colour is tinted to match the directional tone where applicable. |
| **FX8** `StarBorder` | `Effects.jsx` | The "Refresh data" button (global via TopBar). Falls back to your plain disabled button when `status === 'loading'` so the spinner stays clean. |

## Magazine-cover touches (the "slightly more V4" pass)

These are *additive only* — no layout was moved, no card was restructured. They are picked up via three CSS helpers added in `index.css.append`:

| Class | Where applied | Effect |
|-------|---------------|--------|
| `.mag-eyebrow` | TopBar kicker | Italic Instrument Serif "— today · mon 26 may" replaces the small-cap mono kicker. The em-dash + lowercase is the V4 cover-band move. |
| `.mag-kpi-name` | KPI card headers (name) | KPI name renders in italic Instrument Serif at 22px instead of 12.5px Inter. Pulled straight from `v4-side-name`. |
| `.mag-dropcap` | Regime interpretation paragraph | First letter of the interp text becomes a 52px italic gold drop cap. Pulled from `v4-dropcap`. |

I deliberately did **not** apply:
- the double hairline rule between sections (would force restructuring `Overview.jsx` — pass `mag-rule-double` on a `<div>` between sections yourself if you want it)
- column-rule / two-column body text on `MorningNote` (would change its semantics — drop me a note if you want that too)
- the giant 56px masthead title (your 32px title is the right size for an app shell — V4's 56px is a single static cover)

## Reverting

The patches are isolated. To roll back any single FX without losing the others:

- **Drop FX1** — replace `<CountUp to={x} … />` with `{x.toLocaleString(…)}` in `KpiGrid.jsx` / `RegimeBanner.jsx`.
- **Drop FX2** — replace the two `<ShinyText>` calls in `TopBar.jsx` with plain `{meta.pre}` / `{meta.italic}`.
- **Drop FX3** — replace `<DecryptedText text={cis.regime.toLowerCase()} />` with `{cis.regime.toLowerCase()}` in `RegimeBanner.jsx`.
- **Drop FX5** — in `KpiGrid.jsx`, change `<SpotlightCard …>` back to `<div className="glass rounded-[16px] …">` and remove its closing tag.
- **Drop FX8** — in `TopBar.jsx`, replace the `<StarBorder>` wrap with the original `<button className="bg-paper …">Refresh data</button>`.

## Preview

The full visual is in `Overview Magazine FX Preview.html` at the project root — open that to see exactly what your app will look like after the patches land.
