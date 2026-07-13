# Checkout.com — Master Brand · Document Design System

Built by Billy Newton & Andrey Klochkov. This is the canonical spec for the
`/checkout-master-brand` look: a clean, technical, mono-accented document
style for solution-design docs, specs, and structured reports.

Companion files in this folder:
- `brand.css` — drop-in stylesheet, all tokens as CSS custom properties
- `bridge.css` — repaints common document-pattern classes (panels, meta grids,
  metric bars, pills, takeaway cards…) with brand tokens; appended by
  `build.py` for HTML inputs whose own stylesheet gets stripped
- `logo.svg` — official web lockup, recolourable via three CSS channels

---

## 1. Foundations

**Fonts** (Google Fonts):
- **Roboto Mono** (400 / 700) — headings, titles, tags, table captions/category rows, code, metadata labels. Always **UPPERCASE** with `letter-spacing: .02–.08em`.
- **Inter** (400 / 500 / 600 / 700) — body copy, H3 (Medium 500), subtitles, captions. Sentence case.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**Page**: `--off-white` (#F4F2F2) background, `--off-black` (#272932) text,
content column `max-width: 840px`, base type `14px / 1.55`.

**Shape**: cards `border-radius: 12px`; tags fully rounded (999px); default `--radius: 8px` for callouts/code/nodes.

---

## 2. Colour

| Token | Hex | Role |
|---|---|---|
| Blue 1 | `#186AFF` | Primary brand blue, links, section numbers, arrows, "In review" text. *(Source brand ships #006CFF; this system uses #186AFF.)* |
| Blue 2 | `#4098FF` | — |
| Blue 3 | `#70B2FF` | Code-block keys |
| Blue 4 | `#A0CCFF` | — |
| Blue 5 | `#CFE5FF` | Info callout bg, "In review" bg |
| White | `#FFFFFF` | Cards |
| Off White | `#F4F2F2` | Page bg, category rows, inline-code bg |
| Off Black | `#272932` | Text, dark logo bg, code-block bg, `.node.cko` |
| Deep Black | `#181818` | — |
| Grey 1 | `#E8E6E6` | Hairlines, borders, neutral tag bg |
| Grey 3 | `#D7D3D3` | Node / outline borders |
| Grey 6 | `#777478` | Captions, muted labels |
| Grey 7 | `#5C5B61` | Neutral tag text |
| Grey 8 | `#424249` | Cover subtitle |

---

## 3. Status vocabulary (tags)

Pill tags in mono caps. Controlled vocabularies map to fixed colour pairs:

| Class | bg / text | Words |
|---|---|---|
| `.tag.yes` | `#CFE5FF` / `#186AFF` | **Yes** — affirmative is brand blue |
| `.tag.ok` | `#EEFFCC` / `#224D00` | **Pass · Signed off** |
| `.tag.review` | `#CFE5FF` / `#186AFF` | **In review** |
| `.tag.pending` | `#FFC8B2` / `#661D00` | **TBC · Blocked** |
| `.tag.fail` | `#FFCCF5` / `#830269` | **Fail** |
| `.tag.neutral` | `#E8E6E6` / `#5C5B61` | **No · Not run · Draft** |
| `.tag.solid` | Blue 1 / white | emphasis |
| `.tag.dark` | Off Black / white | emphasis |
| `.tag.outline` | white / Grey 3 border | quiet |

Principle from the source: render every row every time — the **No / neutral rows are the negative space** that make the doc trustworthy.

---

## 4. Type scale

| Style | Font | Size / weight | Case |
|---|---|---|---|
| Title | Roboto Mono | 700 / 24–28px / lh 1.08 | UPPER |
| H1 (section) | Roboto Mono | 700 / 21.9px / lh 1.1 | UPPER, blue `01` number prefix |
| H2 | Roboto Mono | 700 / 16px | UPPER |
| H3 | Inter | 500 (Medium) / 14.5px | Sentence |
| Body | Inter | 400 / 14px | Sentence |
| Caption / footer | Inter | 11px, Grey 6 | Sentence |
| Code | Roboto Mono | 12px | — |

---

## 5. Components

- **Header** (`.hdr`): logo left (40px tall), doc title right in mono caps Grey 6, `.hairline` under.
- **Cover** (`.cover`): off-white panel, logo ~42% width, status tag, mono-caps title, Inter subtitle, `.meta` grid of label/value pairs (Version / Status / Date).
- **Logo colourways** (`.lg.light|dark|blue|mono`): recolour the SVG's `--cko-module / --cko-symbol / --cko-word` channels per background.
- **Cards** (`.card`): white, 12px radius — the default content container.
- **Tables**: mono-caps caption above; `1.5px` off-black rule under header row; `.5px` grey row rules; **zero left padding** on cells so text sits tight to the left edge; `tr.cat` = off-white mono-caps category/pillar row spanning all columns.
- **Callouts** (`.callout.info` / `.callout.warn`): tinted block, mono-caps label ("Note" / "Attention").
- **Code block** (`pre`): off-black bg, off-white text; token spans `.k` keys (Blue 3), `.s` strings (#D4FF80), `.p` punctuation (#C6C1C1).
- **Diagram nodes** (`.flow` / `.node` / `.arrow`): white bordered nodes, `.node.cko` off-black, blue `-->` mono arrows.
- **Footer** (`.ftr`): grey 11px, left doc/confidentiality line, right page number.

---

## 6. House typography rules

- **Em dashes render as en dashes** (`—` → `–`) — applied automatically by the
  builder; the only character substitution allowed.
- Title and H1 leading is 10% tighter than default (1.08 / 1.1) so multi-line
  headings sit snug.
- Subtitle leading is 5% tighter than body (1.47 vs 1.55).
- Stat numbers (`.signal-big` 39px, `.meta-value` 20px/1.15 in the bridge
  layer) run larger than the original extraction for presence; meta labels sit
  tight (1px) above their stat.

## 7. Dark colourway

Values taken from the 1-pager editor platform (`tailwind.config` in
`1-pager-editor-Platform-test.html`). Activate with `class="dark"` on `<body>`
(builder flag `--dark`):

| Token | Hex | Role |
|---|---|---|
| `--dark-bg` | `#181818` | Page background (`chkDark`) |
| `--dark-text` | `#FFFFFF` | Text |
| `--dark-box` | `#22242A` | Image placeholder / cards (`chkDarkBox`) |

Cards, covers, panels, and placeholders take `--dark-box`; the logo wordmark
flips white; muted text (captions/footer) uses `#9CA3AF` (`chkGrayText`, same
source) for legibility.

## 8. Logo recolouring

The lockup is one SVG with three named paths driven by CSS vars:

| Channel | Default | Notes |
|---|---|---|
| `--cko-module` | `#186AFF` | the rounded square |
| `--cko-symbol` | `#FFFFFF` | inner mark (knockout) |
| `--cko-word` | `#272932` | "checkout" wordmark |

Placement recipes:
- **On light**: defaults.
- **On dark**: `--cko-word:#FFFFFF`.
- **On blue**: `--cko-module:#FFFFFF; --cko-symbol:#186AFF; --cko-word:#FFFFFF`.
- **Mono**: `--cko-module:#272932`.
