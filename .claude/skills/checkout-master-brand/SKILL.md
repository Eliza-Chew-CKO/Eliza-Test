---
name: checkout-master-brand
description: Apply the Checkout.com document brand as a styling layer on top of a user's existing content — a "lick of paint", not a rewrite. Take Markdown, HTML, or plain text and render a standalone, on-brand Checkout HTML document with ZERO changes to the words. Use when someone wants their notes, spec, SDD, or report to "look like Checkout", "be on brand", or "branded as HTML" without editing the content itself.
---

# Checkout master brand (HTML)

Wrap **any** content someone wrote — Markdown, HTML, or plain text — in the
Checkout.com document brand and emit a single standalone `.html` file. This is a
**brand layer, not a repour**: the words, order, tables, and facts come through
**verbatim**. We change markup and styling, never content.

Contrast with `make-doc-on-brand` (which *repours* content into a Word letterhead
and may re-map structure). This skill is deliberately hands-off: content in,
same content out — just painted.

Let `SKILL_DIR` be the folder this `SKILL.md` lives in. `build.py` finds
`design/` next to itself, so it works from **any** cwd — no `cd` needed. Output
paths are relative to your cwd: write the result **next to the user's input
file** unless they ask for somewhere else.

## The one rule
**Do not edit the user's content.** No rewording, no reordering, no summarising,
no "improving". The only transformation is structural (Markdown → HTML) plus the
brand shell. If the input is already HTML, keep its body and only swap the
styling shell.

*Single sanctioned exception (house typography):* em dashes (`—`) render as en
dashes (`–`). The builder does this automatically; it's the only character it
will ever change.

## Pipeline

1. **Resolve the input.** Use the path the user gave; else the most recent file
   in `SKILL_DIR/input/` that isn't already `-branded`. Native formats:
   `.md`/`.markdown`, `.html`/`.htm`, `.txt`/plain.
   - **Other formats** (`.docx`, `.pdf`, Google Doc export, `.rtf`): convert to
     Markdown FIRST with `markitdown "<INPUT>" > "<stem>.md"`, then feed
     that `.md` to the builder. Read the `.md` to confirm nothing was lost, but
     **do not edit it** — fix only broken conversion artefacts, and say so.

2. **Render the branded HTML** (output next to the input file):
   ```
   python3 "SKILL_DIR/build.py" "<INPUT>" "<input dir>/<stem> -branded.html" \
     --title "Doc title for the header" \
     --footer "Checkout.com — <Client> — Confidential" \
     --footer-right "Page 1"
   ```
   - `--title` sets the header doc-label (auto-UPPERCASED) and `<title>`. If
     omitted, it uses the first H1, then the filename.
   - `--footer` / `--footer-right` set the two footer slots. Both optional.
   - `--no-tags` disables the auto status-pill styling (see below).
   - `--dark` renders the dark colourway (bg `#181818`, white text, boxes
     `#22242A` — values from the 1-pager editor platform).
   Stdlib only — no installs for this step.

3. **What the builder does (all content-preserving):**
   - **Markdown** → faithful HTML: headings, paragraphs, **bold**/*italic*,
     `inline code`, links, fenced code blocks (dark, brand-coloured), lists,
     GFM pipe tables, blockquotes → tinted `info` callouts, `---` → hairlines.
   - **HTML** → keeps `<body>` verbatim, strips the source's own
     `<style>/<script>/<link>`, wraps it in the brand shell so the generic
     elements (`h1`, `table`, `pre`, `code`, `a`…) inherit the brand. It also
     appends `design/bridge.css`, which repaints common document-pattern
     classes (`panel`, `grid`, `meta-grid`, `metric-row`, `bar-track`, `pill`,
     `take`, `step`, `eyebrow`…) with brand tokens so class-based layouts
     don't collapse when the source stylesheet is removed. Unknown classes
     simply flow as clean unstyled blocks — if the output looks flat in
     places, check the source's class names against `bridge.css` and extend
     it with brand tokens only (never edit the content).
   - **Status pills**: table cells whose text is *exactly* a controlled word —
     Yes / Pass / Signed off / In review / TBC / Blocked / Fail / No / Not run /
     Draft / N/A — are wrapped in the matching coloured pill. Same text, just
     painted. Any other cell text is left untouched.

4. **Verify & report.** Confirm it wrote, then tell the user the output path and
   how to view it (open in a browser; **Print → Save as PDF** for a PDF). Note
   that Roboto Mono / Inter load from Google Fonts (needs a connection; falls
   back to system mono/sans offline). If you converted from another format via
   markitdown, say so and flag anything the conversion may have dropped — no
   silent loss.

## Brand (see `design/`)
- `design/brand.css` — the whole design system as CSS custom properties
  (palette, status vocabulary, type scale, cards, tables, callouts, code,
  diagram nodes). Inlined into every output so the file is standalone.
- `design/logo.svg` — official web lockup, recolourable via `--cko-module`
  (rounded square), `--cko-symbol` (inner mark), `--cko-word` (wordmark).
- `design/design-system.md` — human-readable spec and colour/type/status
  reference. Read this if you need to hand-author or extend the brand.

Reads sources read-only; never edits the source, the template, or `design/`.
