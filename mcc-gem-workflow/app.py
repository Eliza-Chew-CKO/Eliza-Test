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
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request, Response, stream_with_context

# In-memory session store: run_id -> {domain, flow, outputs, final}
_sessions: dict = {}

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


async def select_pro_model(page, gem_name: str) -> None:
    """Best-effort attempt to switch the Gem to Gemini 2.5 Pro."""
    model_btn_selectors = [
        'ms-model-selector button',
        'bard-model-selector button',
        'button[aria-label*="model"]',
        'button[data-test-id*="model"]',
    ]
    for sel in model_btn_selectors:
        try:
            btn = await page.wait_for_selector(sel, timeout=2_000)
            if btn:
                await btn.click()
                await asyncio.sleep(0.8)
                for opt in ['div:has-text("2.5 Pro")', 'li:has-text("2.5 Pro")', 'button:has-text("2.5 Pro")', 'div:has-text("Pro")', 'li:has-text("Pro")']:
                    try:
                        el = await page.wait_for_selector(opt, timeout=1_500)
                        if el:
                            await el.click()
                            log(gem_name, "Switched to Gemini 2.5 Pro")
                            await asyncio.sleep(0.5)
                            return
                    except Exception:
                        continue
        except Exception:
            continue
    log(gem_name, "Pro model selection skipped (may already be set or unavailable)")


def is_disambiguation(text: str) -> bool:
    """Return True if Gem 4 output is an MCC disambiguation menu rather than a full report."""
    lower = text.lower()
    triggers = [
        "disambiguation",
        "please select",
        "select an mcc",
        "which mcc",
        "multiple mcc",
        "i must pause",
        "must pause",
        "before i proceed",
        "before generating",
    ]
    if any(t in lower for t in triggers):
        return True
    # Also detect: numbered list where most items contain "mcc" or a 4-digit code
    numbered = re.findall(r'^\s*(\d+)[.)]\s+(.+)$', text, re.MULTILINE)
    if len(numbered) >= 2:
        mcc_hits = sum(1 for _, item in numbered if re.search(r'\b\d{4}\b|mcc', item, re.IGNORECASE))
        if mcc_hits >= len(numbered) * 0.5:
            return True
    return False


def format_disambiguation_html(text: str) -> str:
    """Render an MCC disambiguation menu as styled clickable option cards."""
    lines = text.splitlines()
    intro_lines, options, outro_lines = [], [], []
    in_options = False

    for line in lines:
        stripped = line.strip()
        m = re.match(r'^(\d+)[.)]\s+(.+)$', stripped)
        if m:
            in_options = True
            options.append((m.group(1), m.group(2)))
        elif in_options and stripped:
            outro_lines.append(stripped)
        elif not in_options and stripped:
            intro_lines.append(stripped)

    out = []
    if intro_lines:
        intro_html = ' '.join(re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', l) for l in intro_lines)
        out.append(f'<div class="disambig-intro">{intro_html}</div>')

    out.append('<div class="disambig-menu">')
    for num, label in options:
        label_html = MCC_RE.sub(r'<span class="mcc-badge">🏷️ \1</span>', label)
        label_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', label_html)
        out.append(
            f'<button class="disambig-option" onclick="selectMCC({num}, this)">'
            f'<span class="disambig-num">{num}</span>'
            f'<span class="disambig-label">{label_html}</span>'
            f'</button>'
        )
    out.append('</div>')

    if outro_lines:
        out.append(f'<p class="disambig-outro">{" ".join(outro_lines)}</p>')

    return '\n'.join(out)


def format_html(text: str) -> str:
    """Convert Gem 4 output to structured HTML preserving BLUF/Section 1/2/3 layout."""
    lines = text.splitlines()
    out = []
    current_section = None
    in_list = False

    def close_list():
        nonlocal in_list
        if in_list:
            out.append('</ul>')
            in_list = False

    def open_list():
        nonlocal in_list
        if not in_list:
            out.append('<ul>')
            in_list = True

    for raw in lines:
        s = raw.strip()

        if not s:
            close_list()
            out.append('<div class="spacer"></div>')
            continue

        # ── BLUF header ──────────────────────────────────────────────────────
        if re.match(r'^BLUF\b', s, re.IGNORECASE):
            close_list()
            out.append(f'<div class="bluf-banner">⚡ {s}</div>')
            current_section = 'bluf'
            continue

        # ── Section headers ───────────────────────────────────────────────────
        sec_match = re.match(r'^(Section\s*(\d+)\s*:.+)', s, re.IGNORECASE)
        if sec_match:
            close_list()
            sec_num = sec_match.group(2)
            internal = 'INTERNAL' in s.upper()
            if sec_num == '1':
                icon, css = '📋', 'section-header section-1'
            elif sec_num == '2':
                icon, css = '⚠️', 'section-header section-2'
            else:
                icon, css = '📄', 'section-header section-3'
            out.append(f'<div class="{css}">{icon} {s}</div>')
            current_section = f'section{sec_num}'
            continue

        # ── BLUF key-value lines ──────────────────────────────────────────────
        if current_section == 'bluf':
            kv = re.match(r'^(Primary MCC|Risk Tier[^:]*|AFT Mandates[^:]*):\s*(.+)', s)
            if kv:
                close_list()
                key, val = kv.group(1), kv.group(2)
                val_html = MCC_RE.sub(r'<span class="mcc-badge">🏷️ \1</span>', val)
                val_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', val_html)
                out.append(f'<div class="bluf-item"><span class="bluf-key">{key}:</span> <span class="bluf-val">{val_html}</span></div>')
                continue

        # ── Rationale ─────────────────────────────────────────────────────────
        if re.match(r'^Rationale\s*:', s, re.IGNORECASE):
            close_list()
            content = s[s.index(':')+1:].strip()
            out.append(f'<div class="rationale-block"><span class="rationale-label">Rationale:</span> {content}</div>')
            continue

        # ── Merchant Framing ──────────────────────────────────────────────────
        if re.match(r'^Merchant Framing\s*:', s, re.IGNORECASE):
            close_list()
            content = s[s.index(':')+1:].strip().strip('"').strip("'")
            out.append(f'<div class="merchant-framing"><span class="mf-label">💬 Merchant Framing:</span><blockquote class="mf-quote">"{content}"</blockquote></div>')
            continue

        # ── MCC highlight ─────────────────────────────────────────────────────
        if MCC_RE.search(s) and not re.match(r'^[-*•]', s):
            close_list()
            hl = MCC_RE.sub(r'<span class="mcc-badge">🏷️ \1</span>', s)
            hl = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', hl)
            out.append(f'<p class="mcc-line">{hl}</p>')
            continue

        # ── Bullet items ──────────────────────────────────────────────────────
        if re.match(r'^[-*•]\s', s):
            open_list()
            content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s[2:].strip())
            if current_section == 'section2':
                out.append(f'<li class="red-flag-item">{content}</li>')
            else:
                out.append(f'<li>{content}</li>')
            continue

        # ── Numbered items ────────────────────────────────────────────────────
        if re.match(r'^\d+[.)]\s', s):
            close_list()
            content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
            out.append(f'<p class="numbered-item">{content}</p>')
            continue

        # ── Sub-headings (short lines ending with ':' or ALL CAPS) ───────────
        if s.endswith(':') and len(s) < 80:
            close_list()
            out.append(f'<h4 class="sub-heading">{s}</h4>')
            continue

        if s.isupper() and 3 < len(s) < 60:
            close_list()
            out.append(f'<h3 class="caps-heading">{s}</h3>')
            continue

        # ── Markdown ## headings ──────────────────────────────────────────────
        if s.startswith('## '):
            close_list()
            out.append(f'<h3 class="sub-heading">{s[3:]}</h3>')
            continue

        # ── Plain paragraph ───────────────────────────────────────────────────
        close_list()
        content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        out.append(f'<p>{content}</p>')

    close_list()
    return '\n'.join(out)


# ---------------------------------------------------------------------------
# Async workflow with queue-based progress reporting
# ---------------------------------------------------------------------------

async def run_workflow_async(domain: str, flow: str, q: queue.Queue) -> None:
    def progress(stage: str, msg: str, kind: str = "log") -> None:
        q.put({"type": kind, "stage": stage, "msg": msg})

    run_id = str(uuid.uuid4())

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

        # Store for iteration
        _sessions[run_id] = {
            "domain": domain,
            "flow": flow,
            "outputs": outputs,
            "final": final,
        }

        # Save raw outputs
        raw_file = save_raw_outputs(domain, outputs, final)
        progress("save", f"Raw outputs saved to {raw_file}")

        # Detect disambiguation (Condition A) vs full report (Condition B)
        if is_disambiguation(final):
            q.put({"type": "disambiguation", "html": format_disambiguation_html(final), "raw": final, "run_id": run_id})
        else:
            q.put({"type": "result", "html": format_html(final), "raw": final, "run_id": run_id})
        q.put(None)  # sentinel

        await browser.close()


# ---------------------------------------------------------------------------
# Iteration helper
# ---------------------------------------------------------------------------

async def run_iteration_async(run_id: str, message: str, q: queue.Queue) -> None:
    session = _sessions.get(run_id)
    if not session:
        q.put({"type": "error", "msg": "Session expired. Please run a new Check."})
        q.put(None)
        return

    def progress(msg: str) -> None:
        q.put({"type": "log", "stage": "iterate", "msg": msg})

    iter_prompt = (
        f"Domain: {session['domain']}\n"
        f"Flow of funds: {session['flow']}\n\n"
        f"Previous synthesis:\n{session['final']}\n\n"
        f"---\n{message}\n\n"
        "Please respond maintaining the same structure: BLUF, Section 1 (Deal-Specific Requirements), "
        "Section 2 (Red Flags [INTERNAL ONLY]), Section 3 (Standard MAF Items)."
    )

    async with async_playwright() as p:
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=not HEADED,
            executable_path=chromium_path or None,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
        )

        from run_workflow import run_synthesis, GEMS
        page = await browser.new_page()
        gem = GEMS["gem4"]
        progress(f"Opening {gem['name']} for follow-up…")
        await page.goto(gem["url"], wait_until="domcontentloaded", timeout=60_000)
        await asyncio.sleep(3)

        from run_workflow import activate_gem, send_message, wait_for_response_complete, get_last_response_text, clean_response
        await activate_gem(page, gem["name"])
        await send_message(page, gem["name"], iter_prompt)
        await wait_for_response_complete(page, gem["name"])
        result = await get_last_response_text(page)
        result = clean_response(result)
        await page.close()
        await browser.close()

        # Update session with new synthesis
        _sessions[run_id]["final"] = result

        q.put({"type": "result", "html": format_html(result), "raw": result, "run_id": run_id})
        q.put(None)


# ---------------------------------------------------------------------------
# MCC selection (Condition A → Condition B)
# ---------------------------------------------------------------------------

async def run_mcc_selection_async(run_id: str, choice: str, q: queue.Queue) -> None:
    session = _sessions.get(run_id)
    if not session:
        q.put({"type": "error", "msg": "Session expired. Please run a new Check."})
        q.put(None)
        return

    def progress(msg: str) -> None:
        q.put({"type": "log", "stage": "select", "msg": msg})

    select_prompt = (
        f"Domain: {session['domain']}\n"
        f"Flow of funds: {session['flow']}\n\n"
        f"The user has reviewed the disambiguation menu and selected option: {choice}\n\n"
        "Please now generate the FULL underwriting report for the selected MCC, structured as:\n"
        "BLUF — bottom line up front with Primary MCC, Risk Tier, and AFT Mandates\n"
        "Section 1: Deal-Specific Supplemental Requirements\n"
        "Section 2: Sales Rep Red Flags & Hard Requirements [INTERNAL ONLY]\n"
        "Section 3: Standard MAF Items\n\n"
        "Include Rationale and Merchant Framing where applicable."
    )

    async with async_playwright() as p:
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=not HEADED,
            executable_path=chromium_path or None,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
        )

        from run_workflow import GEMS, activate_gem, send_message, wait_for_response_complete, get_last_response_text, clean_response
        page = await browser.new_page()
        gem = GEMS["gem4"]
        progress(f"Opening {gem['name']} for MCC selection…")
        await page.goto(gem["url"], wait_until="domcontentloaded", timeout=60_000)
        await asyncio.sleep(3)
        await activate_gem(page, gem["name"])
        await send_message(page, gem["name"], select_prompt)
        await wait_for_response_complete(page, gem["name"])
        result = await get_last_response_text(page)
        result = clean_response(result)
        await page.close()
        await browser.close()

        _sessions[run_id]["final"] = result

        q.put({"type": "result", "html": format_html(result), "raw": result, "run_id": run_id})
        q.put(None)


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
            try:
                # Short timeout so we can send keepalives while waiting
                item = q.get(timeout=15)
            except queue.Empty:
                # Send an SSE comment as a heartbeat — keeps the connection
                # alive through proxies and browser timeouts during long gem waits
                yield ": keepalive\n\n"
                continue

            if item is None:
                yield "data: {\"type\": \"done\"}\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx/proxy buffering
        },
    )


@app.route("/select_mcc", methods=["POST"])
def select_mcc():
    run_id = request.form.get("run_id", "").strip()
    choice = request.form.get("choice", "").strip()  # e.g. "2" or full option text

    if not run_id or not choice:
        return {"error": "run_id and choice are required."}, 400

    q: queue.Queue = queue.Queue()

    def start():
        try:
            asyncio.run(run_mcc_selection_async(run_id, choice, q))
        except Exception as e:
            q.put({"type": "error", "msg": str(e)})
            q.put(None)

    threading.Thread(target=start, daemon=True).start()

    def stream():
        while True:
            try:
                item = q.get(timeout=15)
            except queue.Empty:
                yield ": keepalive\n\n"
                continue
            if item is None:
                yield 'data: {"type": "done"}\n\n'
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/iterate", methods=["POST"])
def iterate():
    run_id = request.form.get("run_id", "").strip()
    message = request.form.get("message", "").strip()

    if not run_id or not message:
        return {"error": "run_id and message are required."}, 400

    q: queue.Queue = queue.Queue()

    def start_iteration():
        try:
            asyncio.run(run_iteration_async(run_id, message, q))
        except Exception as e:
            q.put({"type": "error", "msg": str(e)})
            q.put(None)

    threading.Thread(target=start_iteration, daemon=True).start()

    def stream():
        while True:
            try:
                item = q.get(timeout=15)
            except queue.Empty:
                yield ": keepalive\n\n"
                continue
            if item is None:
                yield 'data: {"type": "done"}\n\n'
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
    # Use gunicorn with gevent worker for reliable long-lived SSE streams.
    # Falls back to Flask dev server if gunicorn is not installed.
    try:
        from gunicorn.app.base import BaseApplication

        class StandaloneApp(BaseApplication):
            def __init__(self, application, options=None):
                self.options = options or {}
                self.application = application
                super().__init__()
            def load_config(self):
                for k, v in self.options.items():
                    self.cfg.set(k.lower(), v)
            def load(self):
                return self.application

        options = {
            "bind": f"0.0.0.0:{args.port}",
            "worker_class": "gevent",
            "workers": 1,
            "timeout": 600,        # 10 min — gems can take a while
            "keepalive": 65,
            "loglevel": "info",
        }
        StandaloneApp(app, options).run()
    except ImportError:
        logger.warning("gunicorn not found — falling back to Flask dev server")
        app.run(host="0.0.0.0", port=args.port, debug=False, threaded=True)
