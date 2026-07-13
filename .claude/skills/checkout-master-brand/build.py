#!/usr/bin/env python3
"""
checkout-master-brand — wrap a user's content in the Checkout.com document
brand shell WITHOUT changing a word of it. A lick of paint, not a rewrite.

Usage:
    python3 build.py <input> [output.html] [--title "..."] [--footer "..."] [--no-tags] [--dark]

Input may be .md/.markdown, .html/.htm, or .txt/plain. Everything else the
caller should convert to one of those first (e.g. `markitdown x.docx > x.md`).

Design rules (non-negotiable):
  * Content is preserved verbatim. We change MARKUP/structure, never words.
  * Markdown -> faithful HTML. HTML -> keep body, swap the styling shell.
  * brand.css styles generic elements (h1, table, pre, code, a...), so most
    of the paint lands automatically. The only "smart" touch is wrapping
    table cells whose text is EXACTLY a status word (Yes/No/TBC/...) in the
    matching pill tag — same text, just painted. Disable with --no-tags.

Stdlib only. No third-party installs.
"""
import html
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Exact-match (case-insensitive) cell text -> tag class. Text is preserved.
STATUS = {
    "yes": "yes",  # "Yes" is painted brand blue, not green
    "pass": "ok", "signed off": "ok", "signed-off": "ok",
    "in review": "review",
    "tbc": "pending", "blocked": "pending",
    "fail": "fail",
    "no": "neutral", "not run": "neutral", "draft": "neutral", "n/a": "neutral",
}


# --------------------------------------------------------------------------
# Inline markdown -> HTML (order matters: code first so its contents survive)
# --------------------------------------------------------------------------
def inline(text):
    # Protect inline code spans.
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return "\x00%d\x00" % (len(codes) - 1)

    text = re.sub(r"`([^`]+)`", stash, text)
    text = html.escape(text, quote=False)
    # links [text](url)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                  lambda m: '<a href="%s">%s</a>' % (html.escape(m.group(2), quote=True), m.group(1)),
                  text)
    # bold then italic
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__([^_]+)__", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"(?<!_)_([^_]+)_(?!_)", r"<em>\1</em>", text)
    # restore code
    text = re.sub(r"\x00(\d+)\x00",
                  lambda m: "<code>%s</code>" % html.escape(codes[int(m.group(1))], quote=False),
                  text)
    return text


def status_cell(cell, use_tags):
    cell = cell.strip()
    if use_tags and cell.lower() in STATUS:
        return '<span class="tag %s">%s</span>' % (STATUS[cell.lower()], html.escape(cell, quote=False))
    return inline(cell)


def split_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


# --------------------------------------------------------------------------
# Block-level markdown -> HTML
# --------------------------------------------------------------------------
def md_to_html(src, use_tags=True):
    lines = src.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out = []
    i, n = 0, len(lines)

    def flush_para(buf):
        if buf:
            out.append("<p>" + inline(" ".join(buf).strip()) + "</p>")
            buf.clear()

    para = []
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # fenced code
        if stripped.startswith("```") or stripped.startswith("~~~"):
            flush_para(para)
            fence = stripped[:3]
            i += 1
            code = []
            while i < n and not lines[i].strip().startswith(fence):
                code.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            out.append("<pre>" + html.escape("\n".join(code), quote=False) + "</pre>")
            continue

        # blank line
        if stripped == "":
            flush_para(para)
            i += 1
            continue

        # heading
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            flush_para(para)
            level = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (level, inline(m.group(2).strip()), level))
            i += 1
            continue

        # horizontal rule
        if re.match(r"^([-*_])\1{2,}$", stripped):
            flush_para(para)
            out.append('<hr class="hairline">')
            i += 1
            continue

        # table (header row followed by |---|--- separator)
        if "|" in stripped and i + 1 < n and re.match(r"^\s*\|?[\s:*-]*-[-\s:|]*\|?\s*$", lines[i + 1]):
            flush_para(para)
            headers = split_row(stripped)
            i += 2  # skip header + separator
            rows = []
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append(split_row(lines[i]))
                i += 1
            t = ["<table>", "<thead><tr>"]
            t += ["<th>%s</th>" % inline(h) for h in headers]
            t.append("</tr></thead><tbody>")
            for r in rows:
                cells = (r + [""] * len(headers))[:len(headers)]
                t.append("<tr>" + "".join("<td>%s</td>" % status_cell(c, use_tags) for c in cells) + "</tr>")
            t.append("</tbody></table>")
            out.append("".join(t))
            continue

        # blockquote -> tinted callout (no injected words)
        if stripped.startswith(">"):
            flush_para(para)
            quote = []
            while i < n and lines[i].strip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append('<div class="callout info"><p style="margin:0">%s</p></div>' % inline(" ".join(quote).strip()))
            continue

        # lists (unordered / ordered), single level
        if re.match(r"^\s*([-*+]|\d+\.)\s+", line):
            flush_para(para)
            ordered = bool(re.match(r"^\s*\d+\.\s+", line))
            tag = "ol" if ordered else "ul"
            items = []
            while i < n and re.match(r"^\s*([-*+]|\d+\.)\s+", lines[i]):
                item = re.sub(r"^\s*([-*+]|\d+\.)\s+", "", lines[i])
                items.append("<li>%s</li>" % inline(item.strip()))
                i += 1
            out.append("<%s>%s</%s>" % (tag, "".join(items), tag))
            continue

        # paragraph text
        para.append(stripped)
        i += 1

    flush_para(para)
    return "\n".join(out)


# --------------------------------------------------------------------------
# HTML input -> keep body, drop the old styling shell
# --------------------------------------------------------------------------
def extract_html_body(src):
    m = re.search(r"<body[^>]*>(.*)</body>", src, re.I | re.S)
    body = m.group(1) if m else src
    # drop any style/script/link the source shipped — we supply the shell
    body = re.sub(r"<style[^>]*>.*?</style>", "", body, flags=re.I | re.S)
    body = re.sub(r"<script[^>]*>.*?</script>", "", body, flags=re.I | re.S)
    body = re.sub(r"<link[^>]*>", "", body, flags=re.I)
    return body.strip()


def txt_to_html(src):
    blocks = re.split(r"\n\s*\n", src.replace("\r\n", "\n").strip())
    return "\n".join("<p>%s</p>" % inline(b).replace("\n", "<br>") for b in blocks if b.strip())


# --------------------------------------------------------------------------
# Assemble the branded shell
# --------------------------------------------------------------------------
def first_heading(content_html):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", content_html, re.I | re.S)
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    return None


def build_page(content_html, title, footer_left, footer_right, bridge=False, dark=False):
    css = open(os.path.join(HERE, "design", "brand.css"), encoding="utf-8").read()
    if bridge:
        # HTML inputs keep their class names; the bridge repaints common
        # document-pattern classes with brand tokens (see design/bridge.css).
        css += "\n" + open(os.path.join(HERE, "design", "bridge.css"), encoding="utf-8").read()
    logo = open(os.path.join(HERE, "design", "logo.svg"), encoding="utf-8").read()
    # strip the leading comment from the svg for cleanliness
    logo = re.sub(r"^<!--.*?-->\s*", "", logo, flags=re.S).strip()
    doc_label = html.escape(title, quote=False).upper()
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body{body_class}>
<div class="page">
  <div class="hdr">
    {logo}
    <span class="doc">{doc_label}</span>
  </div>
  <hr class="hairline" style="margin-top:0">

{content}

  <hr class="hairline">
  <div class="ftr"><span>{footer_left}</span><span>{footer_right}</span></div>
</div>
</body>
</html>
""".format(
        title=html.escape(title, quote=False),
        css=css,
        logo=logo,
        doc_label=doc_label,
        content=content_html,
        footer_left=html.escape(footer_left, quote=False),
        footer_right=html.escape(footer_right, quote=False),
        body_class=' class="dark"' if dark else "",
    )


def main(argv):
    opts = {}          # --key value pairs
    flags = set()      # bare --flags
    positional = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--title", "--footer", "--footer-right"):
            opts[a] = argv[i + 1] if i + 1 < len(argv) else ""
            i += 2
        elif a.startswith("--"):
            flags.add(a)
            i += 1
        else:
            positional.append(a)
            i += 1

    if not positional:
        print(__doc__)
        return 2

    inp = positional[0]
    if not os.path.isfile(inp):
        print("Input not found: %s" % inp, file=sys.stderr)
        return 1

    stem = os.path.splitext(os.path.basename(inp))[0]
    out = positional[1] if len(positional) > 1 else os.path.join(HERE, "output", stem + " -branded.html")

    src = open(inp, encoding="utf-8", errors="replace").read()
    ext = os.path.splitext(inp)[1].lower()
    use_tags = "--no-tags" not in flags

    bridge = False
    if ext in (".html", ".htm"):
        content = extract_html_body(src)
        bridge = True
    elif ext in (".md", ".markdown"):
        content = md_to_html(src, use_tags)
    else:
        content = txt_to_html(src)

    title = opts.get("--title") or first_heading(content) or stem
    footer_left = opts.get("--footer") or "Checkout.com – Confidential"
    footer_right = opts.get("--footer-right") or ""

    # House typography rule: em dashes render as en dashes. This is the ONE
    # sanctioned character substitution — everything else stays verbatim.
    content = content.replace("—", "–")
    title = title.replace("—", "–")
    footer_left = footer_left.replace("—", "–")
    footer_right = footer_right.replace("—", "–")

    page = build_page(content, title, footer_left, footer_right, bridge=bridge,
                      dark="--dark" in flags)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w", encoding="utf-8").write(page)
    print("Wrote %s (%d bytes) — title: %r, tags: %s" % (out, len(page), title, "on" if use_tags else "off"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
