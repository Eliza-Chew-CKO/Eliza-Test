# make-doc-on-brand — brand & style notes

Pours any document's content into the **Checkout UK letterhead** (`template.docx`,
a copy of `…/Google Docs Creation /Input/Checkout-UK_Letterhead [Template].docx`)
while keeping the branded header (logo + UK address), footer, fonts and styles.

## Type styles (from the template)
| Block type | Word style | Font | Notes |
|---|---|---|---|
| `title` | Title | **Roboto Mono** Bold 24pt | **ALWAYS CAPS** (auto) |
| `subtitle` | Subtitle | **Roboto Mono** Bold 12pt | **ALWAYS CAPS** (auto), brand blue |
| `heading` / `section` | Subtitle | **Roboto Mono** Bold 12pt | **ALWAYS CAPS** (auto) — section headers |
| `subheading` | Heading2 | Inter Bold | brand blue `#186AFF` |
| `body` / `label` | Normal | Inter | default body copy |
| `bullet` / `quote` | Normal + bullet | Inter | bullet glyph in brand blue |

> **Rule:** anything set in **Roboto Mono is always UPPERCASE.** The renderer forces this
> for `title`, `subtitle`, `heading`/`section`, so you never have to upper-case text yourself.

## Palette
- `navy` / `ink` = `#04142C` · `blue` = `#186AFF` · `mid` = `#0A1141` · `black` = `#000000`
- Run `color` accepts a name above or any 6-digit hex.

## Layout
- A4 portrait, top margin raised to clear the letterhead logo block.
- Branded header (`header1` = logo + address) and footer (`footer3`) appear on **every** page.

## How it works
`build_doc.py` opens the template `.docx` as a zip, leaves every part untouched
(headers, footers, `media/`, `styles.xml`, theme, fonts), injects a bullet list
definition into `numbering.xml`, and rewrites only the `<w:body>` of `document.xml`
from your `content.json`. Stdlib only — no `docx`/`pandoc` needed to render.

See `example-content.json` for the content model.
