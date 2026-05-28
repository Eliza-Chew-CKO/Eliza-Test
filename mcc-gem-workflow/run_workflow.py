"""
MCC Multi-Gem Workflow
Runs Gems 1-3 in parallel, then feeds all outputs into Gem 4 for synthesis.

Usage:
    python run_workflow.py --domain https://example.com --flow "Consumer pays platform..."

First run: add --headed so you can log into Google. After that, the session is saved.
"""

import asyncio
import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext

# Symbols exported for use by app.py
__all__ = [
    "run_gem",
    "run_synthesis",
    "save_raw_outputs",
    "GEMS",
    "async_playwright",
]

# Set to True via --debug flag; saves screenshots + HTML on short/suspect responses
DEBUG = False

# ---------------------------------------------------------------------------
# Gem configuration
# ---------------------------------------------------------------------------

GEMS = {
    "gem1": {
        "name": "Minimum Acceptance Criteria",
        "url": "https://gemini.google.com/gem/1lbrwjtJiPHB-Jyzq7yU03urGTl0PmL6g?usp=sharing",
    },
    "gem2": {
        "name": "Pathward",
        "url": "https://gemini.google.com/gem/1tqNlfWe8_eqOFuJYiH2-S7AsErX_6_nE?usp=sharing",
    },
    "gem3": {
        "name": "CRB",
        "url": "https://gemini.google.com/gem/1L63FscuAQvx7ah040LZVfEvqYabTyKLA?usp=sharing",
    },
    "gem4": {
        "name": "Synthesiser",
        "url": "https://gemini.google.com/gem/1D82_fFhcFlMW8FCSo48YJDb8L0z1mBLw?usp=sharing",
    },
}

# Selectors — update here if Gemini changes its UI
SELECTORS = {
    "input": 'rich-textarea div[contenteditable="true"]',
    "send_btn": 'button[aria-label="Send message"]',
    # The stop/interrupt button appears while a response is being generated
    "stop_btn": 'button[aria-label="Stop response"], button[aria-label="Stop generating"]',
    # Each model turn sits inside a <model-response> custom element
    "response_block": "model-response",
    # The human-readable text inside a response block
    "response_text": ".response-content, message-content, .markdown",
}

MCC_PATTERN = re.compile(r'\b\d{4}\b')
RESPONSE_TIMEOUT_MS = 120_000  # 2 minutes per gem


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

def initial_prompt(domain: str, flow: str) -> str:
    return (
        f"Merchant domain: {domain}\n\n"
        f"Flow of funds: {flow}\n\n"
        "Please identify the MCC code(s) for this merchant and the required documentation."
    )


FOLLOWUP_PROMPT = "What are the MCC codes for this merchant?"


def synthesis_prompt(domain: str, flow: str, outputs: dict) -> str:
    sections = []
    for key, info in [("gem1", GEMS["gem1"]), ("gem2", GEMS["gem2"]), ("gem3", GEMS["gem3"])]:
        sections.append(
            f"--- {info['name'].upper()} OUTPUT ---\n{outputs.get(key, '(no response)')}"
        )
    body = "\n\n".join(sections)
    return (
        f"Merchant domain: {domain}\n\n"
        f"Flow of funds: {flow}\n\n"
        f"{body}\n\n"
        "---\n"
        "Please synthesise the above outputs into a final recommendation including:\n"
        "1. Final MCC code(s) — include multiple if required\n"
        "2. Consensus summary — where did the gems agree or differ?\n"
        "3. Justification for the final MCC selection\n"
        "4. Consolidated required documentation checklist\n"
        "5. Any risk flags or escalation notes"
    )


# ---------------------------------------------------------------------------
# Browser helpers
# ---------------------------------------------------------------------------

def log(gem_name: str, msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{gem_name}] {msg}")


async def wait_for_response_complete(page: Page, gem_name: str) -> None:
    """Wait until Gemini stops generating (stop button disappears)."""
    log(gem_name, "Waiting for response...")
    try:
        await page.wait_for_selector(SELECTORS["stop_btn"], timeout=15_000)
        await page.wait_for_selector(
            SELECTORS["stop_btn"], state="hidden", timeout=RESPONSE_TIMEOUT_MS
        )
    except Exception:
        await asyncio.sleep(5)
    # Extra buffer — Gemini sometimes re-renders after the stop button disappears
    await asyncio.sleep(2)
    # Scroll to bottom to ensure all streamed content is rendered
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await asyncio.sleep(1)


async def get_last_response_text(page: Page) -> str:
    """
    Extract the full text of the last model response.

    Gemini renders responses inside nested custom elements and shadow DOM.
    We try a prioritised list of strategies, from most-specific to broadest,
    and return the longest non-empty result found.
    """
    # Strategy 1: walk known response container selectors via JS so we can
    # reach into shadow roots and pick up all rendered text nodes.
    js_extract = """
    () => {
        // Candidate container selectors in priority order
        const containerSelectors = [
            'model-response',
            'ms-chat-turn[role="model"]',
            '.model-response-text',
            '[data-turn-role="model"]',
            'chat-turn-model',
        ];

        // Inner text selectors to try within each container
        const innerSelectors = [
            '.markdown',
            'message-content',
            '.response-content',
            '.model-response-text',
            'p',   // last-resort: grab all paragraphs
        ];

        let best = '';

        for (const containerSel of containerSelectors) {
            const blocks = document.querySelectorAll(containerSel);
            if (!blocks.length) continue;
            const last = blocks[blocks.length - 1];

            for (const innerSel of innerSelectors) {
                const els = last.querySelectorAll(innerSel);
                if (!els.length) continue;
                const text = Array.from(els).map(e => e.innerText).join('\\n').trim();
                if (text.length > best.length) best = text;
            }

            // Also try the container itself
            const full = last.innerText ? last.innerText.trim() : '';
            if (full.length > best.length) best = full;

            if (best.length > 100) return best;  // good enough — stop searching
        }

        // Strategy 2: look for the last large block of text in the page
        // (catches cases where Gemini changes its component names)
        if (best.length < 100) {
            const allDivs = Array.from(document.querySelectorAll('div, section, article'));
            const candidates = allDivs
                .map(el => el.innerText ? el.innerText.trim() : '')
                .filter(t => t.length > 200);
            if (candidates.length) {
                const longest = candidates.reduce((a, b) => a.length > b.length ? a : b, '');
                if (longest.length > best.length) best = longest;
            }
        }

        return best;
    }
    """
    text = await page.evaluate(js_extract)
    if text and len(text.strip()) > 50:
        return clean_response(text.strip())

    # Final fallback: innerText of the whole page (noisy but complete)
    log("scraper", "JS strategies returned short text — falling back to full page innerText")
    return clean_response((await page.inner_text("body")).strip())


# Lines that are pure Gemini UI chrome — strip them from scraped responses
_UI_NOISE = re.compile(
    r"^\s*("
    r"Google Search"
    r"|Query successful"
    r"|Try again without apps"
    r"|Gemini said"
    r"|Export to Sheets"
    r"|Sources?"
    r"|Share"
    r"|Copy"
    r"|Thumbs up"
    r"|Thumbs down"
    r")\s*$",
    re.IGNORECASE,
)


def clean_response(text: str) -> str:
    """Remove Gemini UI artefacts from a scraped response."""
    lines = [ln for ln in text.splitlines() if not _UI_NOISE.match(ln)]
    # Collapse runs of 3+ blank lines down to 2
    out, blanks = [], 0
    for ln in lines:
        if ln.strip() == "":
            blanks += 1
            if blanks <= 2:
                out.append(ln)
        else:
            blanks = 0
            out.append(ln)
    return "\n".join(out).strip()


async def activate_gem(page: Page, gem_name: str) -> None:
    """
    Ensure the Gem's system prompt is active by starting a fresh conversation.

    Gem URLs can land on: a gem detail/preview page, a previous conversation,
    or (rarely) a direct chat. We normalise to a clean new-chat state so that
    the Gem's configured instructions are always applied.
    """
    # Candidates for a "new chat" / "start" button on the Gem landing page
    new_chat_selectors = [
        'button[aria-label*="New chat"]',
        'button[aria-label*="new chat"]',
        'a[aria-label*="New chat"]',
        # Gem detail page "Try" / "Start chatting" buttons
        'button:has-text("Try this gem")',
        'button:has-text("Start chatting")',
        'button:has-text("New conversation")',
        'a:has-text("New chat")',
        # Gemini sidebar "New chat" icon
        '[data-test-id="new-chat-button"]',
        'bard-sidenav-new-chat-button button',
    ]

    for sel in new_chat_selectors:
        try:
            btn = await page.wait_for_selector(sel, timeout=3_000)
            if btn:
                await btn.click()
                log(gem_name, f"Clicked new-chat button ({sel})")
                await asyncio.sleep(2)
                return
        except Exception:
            continue

    # If no button found, the page may already be a blank chat — that's fine.
    log(gem_name, "No new-chat button found — assuming blank chat is ready.")


async def send_message(page: Page, gem_name: str, text: str) -> None:
    """
    Inject text into the Gemini input and send it.

    Short prompts use keystroke typing so Angular registers the change.
    Long prompts inject text directly via JS into the contenteditable div
    and fire the necessary DOM events so Angular picks up the value.
    """
    input_el = await page.wait_for_selector(SELECTORS["input"], timeout=30_000)
    await input_el.click()

    if len(text) > 500:
        # Direct JS injection — avoids per-keystroke timeouts and clipboard
        # permission issues in headless mode
        await page.evaluate(
            """(args) => {
                const [sel, txt] = args;
                const el = document.querySelector(sel);
                if (!el) return;
                el.focus();
                // Set the text content
                el.innerText = txt;
                // Fire events Angular needs to detect the change
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                // Move caret to end
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel2 = window.getSelection();
                sel2.removeAllRanges();
                sel2.addRange(range);
            }""",
            [SELECTORS["input"], text],
        )
        await asyncio.sleep(0.5)
    else:
        await input_el.type(text, delay=5)

    await asyncio.sleep(0.5)
    send_btn = await page.wait_for_selector(SELECTORS["send_btn"], timeout=10_000)
    await send_btn.click()
    log(gem_name, "Prompt sent.")


# ---------------------------------------------------------------------------
# Single-gem runner
# ---------------------------------------------------------------------------

async def run_gem(context: BrowserContext, gem_key: str, domain: str, flow: str) -> str:
    gem = GEMS[gem_key]
    name = gem["name"]
    page = await context.new_page()
    log(name, f"Opening {gem['url']}")

    try:
        await page.goto(gem["url"], wait_until="domcontentloaded", timeout=60_000)
        await asyncio.sleep(3)  # let Angular bootstrap

        # Start a fresh Gem conversation so the system prompt is applied
        await activate_gem(page, name)

        # Send initial prompt
        prompt = initial_prompt(domain, flow)
        await send_message(page, name, prompt)
        await wait_for_response_complete(page, name)

        response = await get_last_response_text(page)
        log(name, f"Got response ({len(response)} chars)")

        if DEBUG:
            slug = name.replace(" ", "_").lower()
            ts = datetime.now().strftime("%H%M%S")
            await page.screenshot(path=f"debug_{slug}_{ts}.png", full_page=True)
            Path(f"debug_{slug}_{ts}.html").write_text(await page.content(), encoding="utf-8")
            log(name, f"Debug screenshot + HTML saved (debug_{slug}_{ts}.*)")

        # Follow-up if no MCC codes detected
        if not MCC_PATTERN.search(response):
            log(name, "No MCC found in response — sending follow-up.")
            await send_message(page, name, FOLLOWUP_PROMPT)
            await wait_for_response_complete(page, name)
            followup_response = await get_last_response_text(page)
            response = response + "\n\n[Follow-up]\n" + followup_response
            log(name, f"Follow-up response ({len(followup_response)} chars)")

        return response

    except Exception as e:
        log(name, f"ERROR: {e}")
        return f"(Error retrieving response from {name}: {e})"
    finally:
        await page.close()


async def run_synthesis(context: BrowserContext, domain: str, flow: str, outputs: dict) -> str:
    gem = GEMS["gem4"]
    name = gem["name"]
    page = await context.new_page()
    log(name, f"Opening {gem['url']}")

    try:
        await page.goto(gem["url"], wait_until="domcontentloaded", timeout=60_000)
        await asyncio.sleep(3)

        # Start a fresh Gem conversation so the system prompt is applied
        await activate_gem(page, name)

        prompt = synthesis_prompt(domain, flow, outputs)
        await send_message(page, name, prompt)
        await wait_for_response_complete(page, name)

        response = await get_last_response_text(page)
        log(name, f"Synthesis complete ({len(response)} chars)")

        if DEBUG:
            ts = datetime.now().strftime("%H%M%S")
            await page.screenshot(path=f"debug_synthesiser_{ts}.png", full_page=True)
            Path(f"debug_synthesiser_{ts}.html").write_text(await page.content(), encoding="utf-8")
            log(name, f"Debug screenshot + HTML saved (debug_synthesiser_{ts}.*)")

        return response

    except Exception as e:
        log(name, f"ERROR: {e}")
        return f"(Error retrieving synthesis: {e})"
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# Pretty-print helpers
# ---------------------------------------------------------------------------

WIDTH = 72

# ANSI colour codes (gracefully ignored if terminal doesn't support them)
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
PURPLE = "\033[95m"
WHITE  = "\033[97m"


def c(text: str, *codes: str) -> str:
    return "".join(codes) + text + RESET


def banner(title: str, emoji: str = "", colour: str = CYAN) -> None:
    bar = "─" * WIDTH
    print(f"\n{c(bar, colour)}")
    label = f"  {emoji}  {title}  " if emoji else f"  {title}  "
    print(c(f"{label}", colour, BOLD))
    print(c(bar, colour))


def section(title: str, emoji: str = "") -> None:
    label = f"{emoji} {title}" if emoji else title
    print(f"\n{c(label, YELLOW, BOLD)}")
    print(c("  " + "·" * (WIDTH - 2), DIM))


def format_response(text: str) -> str:
    """
    Lightly reformat plain-text Gem output for terminal readability:
    - Indent every line slightly
    - Prefix lines that look like list items with a bullet
    - Highlight lines that contain a 4-digit MCC code
    - Add a blank line after section headings (ALL CAPS or ending with ':')
    """
    lines = text.splitlines()
    out = []
    for raw in lines:
        line = raw.rstrip()

        # Blank line passthrough
        if not line.strip():
            out.append("")
            continue

        stripped = line.strip()

        # Detect MCC lines — highlight them
        if MCC_PATTERN.search(stripped):
            out.append(c(f"  🏷️  {stripped}", GREEN, BOLD))
            continue

        # Detect existing list markers and normalise to bullet
        if re.match(r'^[-*•]\s', stripped):
            out.append(c(f"  • {stripped[2:].strip()}", WHITE))
            continue

        # Numbered list items
        if re.match(r'^\d+[.)]\s', stripped):
            out.append(c(f"  {stripped}", WHITE))
            continue

        # Section headings: ALL CAPS lines or lines ending with ':'
        if stripped.isupper() and len(stripped) > 3:
            out.append(f"\n{c('  ' + stripped, BLUE, BOLD)}")
            continue
        if stripped.endswith(":") and len(stripped) < 80 and "\n" not in stripped:
            out.append(f"\n{c('  ' + stripped, PURPLE, BOLD)}")
            continue

        # Plain text — indent
        out.append(f"  {stripped}")

    return "\n".join(out)


def save_raw_outputs(domain: str, outputs: dict, final: str) -> str:
    """Save all gem outputs to a timestamped file. Returns the file path."""
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    slug = re.sub(r"[^\w.-]", "_", domain.replace("https://", "").replace("http://", ""))
    filename = f"raw_outputs_{slug}_{ts}.txt"

    gem_meta = [
        ("gem1", "GEM 1 — Minimum Acceptance Criteria"),
        ("gem2", "GEM 2 — Pathward"),
        ("gem3", "GEM 3 — CRB"),
    ]
    sep = "=" * 72
    lines = [
        sep,
        f"  RAW GEM OUTPUTS",
        f"  Domain : {domain}",
        f"  Saved  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        sep,
    ]
    for key, label in gem_meta:
        lines += ["", f"{'─' * 72}", f"  {label}", f"{'─' * 72}", "", outputs.get(key, "(no response)")]
    lines += ["", sep, "  GEM 4 — SYNTHESISER (full raw response)", sep, "", final]

    Path(filename).write_text("\n".join(lines), encoding="utf-8")
    return filename


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(domain: str, flow: str, headed: bool, profile_dir: str) -> None:
    started = datetime.now()
    banner("MCC MULTI-GEM WORKFLOW", "💎", CYAN)
    print(c(f"  🌐  Domain  : ", DIM) + c(domain, WHITE, BOLD))
    print(c(f"  💸  Flow    : ", DIM) + c(flow, WHITE))
    print(c(f"  🕐  Started : ", DIM) + c(started.strftime("%Y-%m-%d %H:%M:%S"), WHITE))

    async with async_playwright() as p:
        # When running in a container, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH points
        # to the system Chromium installed via apt. --no-sandbox is required when
        # the process runs as root (default in Docker/ECS).
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        launch_args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        if not headed:
            launch_args.append("--headless=new")
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=not headed,
            executable_path=chromium_path or None,
            args=launch_args,
        )

        # Check login — navigate to Gemini home first
        page = await browser.new_page()
        await page.goto("https://gemini.google.com", wait_until="domcontentloaded", timeout=30_000)

        if headed:
            print(c("\n  ℹ️  Browser is open. Log into your Google account if prompted.", YELLOW))
            print(c("  ⏎  Press ENTER here once you can see the Gemini home page.\n", YELLOW))
            await asyncio.get_event_loop().run_in_executor(None, input)

        await page.close()

        # --- Stage 1: Run Gems 1, 2, 3 in parallel ---
        section("Stage 1 — Querying Gems 1, 2 & 3 in parallel", "🚀")
        gem1_task = asyncio.create_task(run_gem(browser, "gem1", domain, flow))
        gem2_task = asyncio.create_task(run_gem(browser, "gem2", domain, flow))
        gem3_task = asyncio.create_task(run_gem(browser, "gem3", domain, flow))

        gem1_out, gem2_out, gem3_out = await asyncio.gather(gem1_task, gem2_task, gem3_task)
        outputs = {"gem1": gem1_out, "gem2": gem2_out, "gem3": gem3_out}
        print(c(f"\n  ✅  All 3 gems responded.", GREEN, BOLD))

        # --- Stage 2: Synthesis via Gem 4 ---
        section("Stage 2 — Synthesising via Gem 4", "🧠")
        final = await run_synthesis(browser, domain, flow, outputs)

        # Save raw outputs to file (keep terminal clean)
        raw_file = save_raw_outputs(domain, outputs, final)
        print(c(f"\n  📄  Raw gem outputs saved to: {raw_file}", DIM))

        # Terminal: show only the final recommendation
        banner("✅  FINAL RECOMMENDATION", "", GREEN)
        formatted = format_response(final)
        if formatted.strip():
            print(formatted)
        else:
            # format_response stripped everything — print raw so output is never blank
            print(f"  {final}")

        # Footer
        elapsed = (datetime.now() - started).seconds
        bar = "─" * WIDTH
        print(f"\n{c(bar, DIM)}")
        print(c(f"  ✔  Workflow complete  •  {elapsed}s  •  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", DIM))
        print(c(bar, DIM) + "\n")

        await browser.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MCC classification pipeline using Google Gemini Gems"
    )
    parser.add_argument("--domain", required=True, help="Merchant domain URL")
    parser.add_argument(
        "--flow", required=True, help="High-level flow of funds description"
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        default=False,
        help="Run with a visible browser window (required for first-time Google login)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        default=False,
        help="Save a screenshot + HTML after each gem response (helps diagnose scraping issues)",
    )
    parser.add_argument(
        "--profile",
        default="./browser-profile",
        help="Path to persistent browser profile directory (default: ./browser-profile)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.debug:
        DEBUG = True
    asyncio.run(main(args.domain, args.flow, args.headed, args.profile))
