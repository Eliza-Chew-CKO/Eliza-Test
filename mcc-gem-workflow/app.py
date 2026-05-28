"""
Check Me — Web interface for the MCC Multi-Gem Workflow.

Run:
    python app.py
    python app.py --headed   # first run, to log into Google
"""

import asyncio
import argparse
import json
import logging
import os
import queue
import re
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request, Response, stream_with_context

# Start a virtual X11 display if no real display is available.
# Required on Linux servers/containers/Codespaces without a display server.
if not os.environ.get("DISPLAY"):
    try:
        from pyvirtualdisplay import Display
        _vdisplay = Display(visible=False, size=(1920, 1080))
        _vdisplay.start()
    except Exception as _e:
        print(f"[warn] Could not start virtual display: {_e}. Trying headless anyway.")

# Import core workflow functions from run_workflow.py
from run_workflow import (
    run_gem,
    run_synthesis,
    save_raw_outputs,
    GEMS,
    async_playwright,
)

# Log to stdout so CloudWatch / container log drivers pick it up
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configurable via env vars so the container doesn't need CLI flags
PROFILE_DIR = os.environ.get("BROWSER_PROFILE_DIR", "./browser-profile")
HEADED = os.environ.get("HEADED", "false").lower() == "true"


# ---------------------------------------------------------------------------
# HTML output formatter (browser-safe, no ANSI codes)
# ---------------------------------------------------------------------------

MCC_RE = re.compile(r'\b(\d{4})\b')


def format_html(text: str) -> str:
    """Convert plain-text gem output to styled HTML."""
    lines = text.splitlines()
    html_parts = []
    i = 0
    while i < len(lines):
        raw = lines[i].rstrip()
        s = raw.strip()

        if not s:
            html_parts.append('<div class="spacer"></div>')
            i += 1
            continue

        # MCC highlight — any line containing a 4-digit code
        if MCC_RE.search(s):
            highlighted = MCC_RE.sub(
                r'<span class="mcc-badge">🏷️ \1</span>', s
            )
            html_parts.append(f'<p class="mcc-line"><strong>{highlighted}</strong></p>')
            i += 1
            continue

        # Section headings ending with ':'
        if s.endswith(':') and len(s) < 90:
            html_parts.append(f'<h3 class="section-heading">{s}</h3>')
            i += 1
            continue

        # BLUF / ALL-CAPS headings
        if s.isupper() and 3 < len(s) < 80:
            html_parts.append(f'<h2 class="caps-heading">{s}</h2>')
            i += 1
            continue

        # Numbered list items
        if re.match(r'^\d+[.)]\s', s):
            html_parts.append(f'<p class="numbered-item">{s}</p>')
            i += 1
            continue

        # Bullet list items
        if re.match(r'^[-*•]\s', s):
            content = s[2:].strip()
            html_parts.append(f'<li>{content}</li>')
            i += 1
            continue

        # Markdown-style bold **text**
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)

        # Markdown ## headings
        if s.startswith('## '):
            html_parts.append(f'<h3 class="section-heading">{s[3:]}</h3>')
            i += 1
            continue
        if s.startswith('# '):
            html_parts.append(f'<h2 class="caps-heading">{s[2:]}</h2>')
            i += 1
            continue

        html_parts.append(f'<p>{s}</p>')
        i += 1

    return '\n'.join(html_parts)


# ---------------------------------------------------------------------------
# Async workflow with queue-based progress reporting
# ---------------------------------------------------------------------------

async def run_workflow_async(domain: str, flow: str, q: queue.Queue) -> None:
    def progress(stage: str, msg: str, kind: str = "log") -> None:
        q.put({"type": kind, "stage": stage, "msg": msg})

    async with async_playwright() as p:
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        chromium_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ]
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=not HEADED,
            executable_path=chromium_path or None,
            args=chromium_args,
        )

        # Warm up — ensure login
        page = await browser.new_page()
        await page.goto("https://gemini.google.com", wait_until="domcontentloaded", timeout=30_000)
        await page.close()

        # Stage 1 — parallel gem queries
        progress("stage1", "Querying Gems 1, 2 & 3 in parallel…", "stage")

        async def gem_with_progress(key: str) -> tuple[str, str]:
            name = GEMS[key]["name"]
            progress("stage1", f"⏳ Opening {name}…")
            result = await run_gem(browser, key, domain, flow)
            progress("stage1", f"✅ {name} responded ({len(result)} chars)")
            return key, result

        results = await asyncio.gather(
            gem_with_progress("gem1"),
            gem_with_progress("gem2"),
            gem_with_progress("gem3"),
        )
        outputs = dict(results)

        progress("stage1", "All 3 gems responded.", "stage_done")

        # Stage 2 — synthesis
        progress("stage2", "Synthesising via Gem 4…", "stage")
        final = await run_synthesis(browser, domain, flow, outputs)
        progress("stage2", "Synthesis complete.", "stage_done")

        # Save raw outputs
        raw_file = save_raw_outputs(domain, outputs, final)
        progress("save", f"Raw outputs saved to {raw_file}")

        # Send final result
        q.put({"type": "result", "html": format_html(final), "raw": final})
        q.put(None)  # sentinel

        await browser.close()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/run", methods=["POST"])
def run():
    domain = request.form.get("domain", "").strip()
    flow = request.form.get("flow", "").strip()

    if not domain or not flow:
        return {"error": "Domain and flow of funds are required."}, 400

    q: queue.Queue = queue.Queue()

    def start_workflow():
        try:
            asyncio.run(run_workflow_async(domain, flow, q))
        except Exception as e:
            q.put({"type": "error", "msg": str(e)})
            q.put(None)

    threading.Thread(target=start_workflow, daemon=True).start()

    def stream():
        while True:
            item = q.get()
            if item is None:
                yield "data: {\"type\": \"done\"}\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(stream_with_context(stream()), mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check Me — MCC workflow web UI")
    parser.add_argument("--headed", action="store_true", help="Show browser (needed for first login)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 3000)))
    parser.add_argument("--profile", default=PROFILE_DIR)
    args = parser.parse_args()

    if args.headed:
        HEADED = True
    PROFILE_DIR = args.profile

    logger.info(f"💎 Check Me starting on http://0.0.0.0:{args.port}")
    # Bind to 0.0.0.0 so the ALB health check and external traffic can reach it
    app.run(host="0.0.0.0", port=args.port, debug=False, threaded=True)
