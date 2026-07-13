#!/usr/bin/env python3
"""
Pour structured content into the Checkout UK letterhead, preserving its branding.

Usage:
    python3 build_doc.py content.json "output/My Doc -onbrand.docx" [template.docx]

Self-contained: standard library only (no docx / lxml needed). It opens the
letterhead .docx (a zip), keeps every part untouched (headers, footers, logo,
fonts, styles, theme) and only rewrites word/document.xml (the body) and injects
a bullet list definition into word/numbering.xml.

CONTENT MODEL (content.json)
{
  "title":    "Document title",          # optional, rendered in Title style (Roboto Mono, CAPS)
  "subtitle": "One-line subtitle",        # optional, Subtitle style (Roboto Mono, CAPS, blue)
  "blocks": [
    { "type": "heading",    "text": "Section heading" },         # Roboto Mono, CAPS
    { "type": "subheading", "text": "Sub-section / label" },      # Inter bold, brand blue
    { "type": "body",       "text": "A paragraph of body copy." },
    { "type": "body",       "runs": [ {"text":"Bold lead-in. ","bold":true,"color":"navy"},
                                       {"text":"Then normal text."} ] },
    { "type": "label",      "label":"What I delivered:", "text":" ...body after a bold lead-in" },
    { "type": "bullet",     "text": "A bullet point" },
    { "type": "bullet",     "runs": [ {"text":"Tool — ","bold":true,"color":"navy"}, {"text":"description"} ] },
    { "type": "quote",      "label":"Name:", "text":"A quoted endorsement." },  # bullet w/ bold label + italic
    { "type": "divider" },                                        # thin brand-blue rule
    { "type": "spacer" }                                          # blank line
  ]
}

RUN OPTIONS: text, bold, italic, color (navy|blue|ink|black or a 6-hex like 04142c), size (half-points), sup.

BRAND RULE: any Roboto Mono text (title / subtitle / heading) is forced to UPPERCASE.
"""
import sys, os, json, zipfile, html

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE = os.path.join(HERE, "template.docx")

# Checkout brand palette (hex, no '#')
COLORS = {"navy": "04142c", "ink": "04142c", "blue": "186aff",
          "black": "000000", "mid": "0a1141"}

BULLET_DEF = (
    '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/>'
    '<w:numFmt w:val="bullet"/><w:lvlText w:val="&#x2022;"/><w:lvlJc w:val="left"/>'
    '<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr>'
    '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:cs="Symbol" w:hint="default"/>'
    '<w:color w:val="186aff"/></w:rPr></w:lvl></w:abstractNum>'
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
)

# Single section: keep the letterhead's branded header (rId6 = logo) + footer (rId9)
# on every page; top margin pushed to 2300 so body clears the logo block.
SECTPR = (
    '<w:sectPr>'
    '<w:headerReference r:id="rId6" w:type="default"/>'
    '<w:footerReference r:id="rId9" w:type="default"/>'
    '<w:pgSz w:h="16840" w:w="11900" w:orient="portrait"/>'
    '<w:pgMar w:bottom="2932" w:top="2300" w:left="1440" w:right="832" w:header="453" w:footer="476"/>'
    '</w:sectPr>'
)


def esc(t):
    return html.escape(str(t), quote=False)


def col(c):
    return COLORS.get(c, c)


def run(text, bold=False, italic=False, color=None, size=None, sup=False):
    rpr = "<w:rPr>"
    if bold:
        rpr += '<w:b w:val="1"/><w:bCs w:val="1"/>'
    if italic:
        rpr += '<w:i w:val="1"/><w:iCs w:val="1"/>'
    if color:
        rpr += '<w:color w:val="%s"/>' % col(color)
    if size:
        rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)
    if sup:
        rpr += '<w:vertAlign w:val="superscript"/>'
    rpr += '<w:rtl w:val="0"/></w:rPr>'
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, esc(text))


def runs_xml(items):
    out = ""
    for r in items:
        if isinstance(r, str):
            out += run(r)
        else:
            out += run(r.get("text", ""), bold=r.get("bold", False),
                       italic=r.get("italic", False), color=r.get("color"),
                       size=r.get("size"), sup=r.get("sup", False))
    return out


def para(inner, style=None, numid=None, spacing_before=None, spacing_after=None,
         border_bottom=False, ind_left=None):
    ppr = "<w:pPr>"
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    if numid:
        ppr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="%d"/></w:numPr>' % numid
    if border_bottom:
        ppr += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="186aff"/></w:pBdr>'
    sp = ""
    if spacing_before is not None:
        sp += 'w:before="%d" ' % spacing_before
    if spacing_after is not None:
        sp += 'w:after="%d" ' % spacing_after
    if sp:
        ppr += '<w:spacing %s/>' % sp.strip()
    if ind_left is not None:
        ppr += '<w:ind w:left="%d"/>' % ind_left
    ppr += "</w:pPr>"
    return "<w:p>%s%s</w:p>" % (ppr, inner)


def body_runs(b):
    if "runs" in b:
        return b["runs"]
    return [{"text": b.get("text", "")}]


def block_to_xml(b):
    t = b.get("type", "body")
    if t == "title":                       # Roboto Mono, CAPS
        return para(run(b.get("text", "").upper()), style="Title", spacing_after=80)
    if t == "subtitle":                    # Roboto Mono, CAPS, blue by default
        return para(run(b.get("text", "").upper(), color=b.get("color", "blue")),
                    style="Subtitle", spacing_after=120)
    if t in ("heading", "section"):        # Roboto Mono section header, CAPS
        return para(run(b.get("text", "").upper()), style="Subtitle",
                    spacing_before=220, spacing_after=80)
    if t == "subheading":                  # Inter bold, brand blue
        return para(run(b.get("text", "")), style="Heading2",
                    spacing_before=80, spacing_after=40)
    if t == "bullet":
        return para(runs_xml(body_runs(b)), numid=1, spacing_after=40)
    if t == "quote":
        parts = []
        if b.get("label"):
            parts.append({"text": b["label"] + " ", "bold": True, "color": "navy"})
        parts.append({"text": b.get("text", ""), "italic": True})
        return para(runs_xml(parts), numid=1, spacing_after=40)
    if t == "label":                       # bold lead-in + body, single paragraph
        parts = [{"text": b.get("label", ""), "bold": True}]
        parts += body_runs(b)
        return para(runs_xml(parts), spacing_after=80)
    if t == "divider":
        return para(run(""), border_bottom=True, spacing_before=60, spacing_after=120)
    if t in ("spacer", "blank"):
        return para(run(""))
    return para(runs_xml(body_runs(b)), spacing_after=80)   # default: body paragraph


def build_body(content):
    xml = ""
    if content.get("title"):
        xml += block_to_xml({"type": "title", "text": content["title"]})
    if content.get("subtitle"):
        xml += block_to_xml({"type": "subtitle", "text": content["subtitle"]})
    if content.get("title") or content.get("subtitle"):
        xml += block_to_xml({"type": "divider"})
    for b in content.get("blocks", []):
        xml += block_to_xml(b)
    return xml


def main():
    if len(sys.argv) < 3:
        print('usage: build_doc.py content.json "output.docx" [template.docx]')
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        content = json.load(f)
    out_path = sys.argv[2]
    tmpl = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_TEMPLATE

    with zipfile.ZipFile(tmpl, "r") as zin:
        items = {n: zin.read(n) for n in zin.namelist()}

    # 1) inject the bullet list definition into numbering.xml
    num = items["word/numbering.xml"].decode("utf-8").rstrip()
    if num.endswith("/>"):
        num = num[:-2] + ">" + BULLET_DEF + "</w:numbering>"
    elif "</w:numbering>" in num:
        num = num.replace("</w:numbering>", BULLET_DEF + "</w:numbering>")
    items["word/numbering.xml"] = num.encode("utf-8")

    # 2) keep the document head (namespaces) and replace the body
    doc = items["word/document.xml"].decode("utf-8")
    head = doc.split("<w:body>")[0]
    body = build_body(content)
    items["word/document.xml"] = (
        head + "<w:body>" + body + SECTPR + "</w:body></w:document>"
    ).encode("utf-8")

    out_dir = os.path.dirname(os.path.abspath(out_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zo:
        for n, data in items.items():
            zo.writestr(n, data)
    print("wrote %s (%d blocks)" % (out_path, len(content.get("blocks", []))))


if __name__ == "__main__":
    main()
