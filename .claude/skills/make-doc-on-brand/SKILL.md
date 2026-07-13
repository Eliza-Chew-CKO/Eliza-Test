---
name: make-doc-on-brand
description: Rebuild any document (Google Doc, Word, PDF, TextEdit, txt, md, html, pptx, xlsx…) as an on-brand Checkout UK letterhead .docx by pouring its content into the template. Use when someone hands you a document in any format and wants it re-rendered on the Checkout letterhead. Handles one or many source files.
---

# Make a doc on-brand (Docs / Word)

Take **any** document someone made — a Google Doc, Word `.docx`, PDF, TextEdit/RTF,
plain text, Markdown, even an HTML export — and rebuild it as a genuinely on-brand
**Checkout UK letterhead** document. **Default behaviour = REPOUR**: convert the source
to Markdown, fit that text into the clean letterhead template, and render a fresh `.docx`.

**The flow is identical for every input format.** Whatever comes in, Step 2 normalises it
to Markdown, and *everything downstream is the same*. This guarantees the output obeys the
template — Checkout letterhead (logo + UK address header, footer), correct fonts, palette,
and house type rules. Multiple inputs? Run the pipeline once per file.

**Skill root** = the directory this `SKILL.md` lives in. `cd` into it first:
```
cd "<SKILL_ROOT>"        # the folder containing this SKILL.md
```

## House rule (non-negotiable)
**Roboto Mono text is ALWAYS UPPERCASE.** That means the title, subtitle and every section
heading. The renderer enforces this automatically — don't fight it, and don't put
sentence-case text into `title` / `subtitle` / `heading` expecting it to stay lower-case.

## Pipeline (default = REPOUR)

1. **Resolve the input.** Use the path the user gave if it points at a real file; else the
   most recent file in `input/` that isn't already `-onbrand`. Supported: `.docx`, `.pdf`,
   `.rtf`/`.doc`, `.txt`, `.md`, `.html`, `.pptx`, `.xlsx`. For several files, repeat the
   pipeline for each.
   **Google Docs:** there's no API here — ask the user to **File → Download → Word (.docx)
   or PDF** and pass that. (A `docs.google.com` URL on its own can't be read.)

2. **Convert to Markdown — the universal front door.** Normalise first so the rest is identical:
   ```
   markitdown "<INPUT>" > "output/<stem>.md"
   ```
   Read `output/<stem>.md` — this is the **single source of truth** for the fit (Step 3).
   *Fallbacks:* `.txt`/`.md` → read directly; `.doc`/`.rtf` that markitdown chokes on →
   `textutil -convert txt -stdout "<INPUT>"`. For a `.pdf` whose text is image-only, render a
   page with `qlmanage -t -s 1600 -o /tmp "<INPUT>"` and read the numbers/headings off the PNG
   so nothing baked into an image is silently lost.

3. **Fit to the letterhead (you do this).** Write a `content.json` (see
   `example-content.json` and `BRAND-NOTES.md` for the full model). Map the source Markdown
   to blocks, in reading order:
   - Document title / first H1 → `title`. A standfirst/date line → `subtitle`.
   - `#`/`##` headings → `heading` (Roboto Mono, auto-CAPS). Smaller `###` or bold labels
     introducing a group → `subheading` (Inter bold, blue).
   - Paragraphs → `body`. A paragraph that starts with a bold lead-in → `body` with a `runs`
     array, or use `label` (`{"label":"What I delivered:", "text":" …"}`).
   - List items → `bullet` (use `runs` for a bold lead-in like `"Tool — "`).
   - Block quotes / testimonials → `quote` with `label` = attribution.
   - Use `divider` between major sections and `spacer` for breathing room — sparingly.
   ```json
   { "title": "…", "subtitle": "…",
     "blocks": [ { "type": "heading", "text": "…" }, { "type": "body", "text": "…" }, … ] }
   ```
   Rules:
   - **Cover the whole source.** Map every meaningful section/paragraph. Don't silently drop
     content — if you cut anything (e.g. a redundant repeated heading), say so in the report.
   - Don't invent facts, numbers, or quotes. Pour, don't embellish.
   - Keep Roboto Mono blocks (title/subtitle/heading) short — they're headers, not sentences.
   - For inline emphasis use `runs` with `"bold": true` and `"color": "navy"` / `"blue"`.

4. **Render into the letterhead:**
   ```
   python3 build_doc.py content.json "output/<stem> -onbrand.docx"
   ```
   (Defaults to `template.docx` in this folder — the Checkout UK letterhead. Pass a third arg
   to override the template.) Stdlib only; no extra installs.

5. **Verify & report.** Confirm it wrote and is valid:
   ```
   python3 -c "import zipfile,xml.dom.minidom as M; z=zipfile.ZipFile('output/<stem> -onbrand.docx'); M.parseString(z.read('word/document.xml')); print('OK', 'logo:', 'word/media/image1.png' in z.namelist())"
   ```
   Tell the user the output path, list which source sections mapped to which block types, and
   note anything you dropped or couldn't read (be honest — no silent drops). Mention the file
   opens in Word or Google Docs; Roboto Mono / Inter render best with those fonts installed.

## Template & brand
- Template: `template.docx` (the Checkout UK letterhead). Branded header (logo + UK address)
  and footer are preserved on every page.
- Type rules & palette: `BRAND-NOTES.md`. Content model & example: `example-content.json`.
- Needs `markitdown` for the convert step (see INSTALL.txt). Reads sources read-only; never
  edits the source or the template.
