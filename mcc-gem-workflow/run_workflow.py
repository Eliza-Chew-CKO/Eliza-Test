"""
MCC Multi-Gem Workflow
Runs Gems 1-3 in parallel, then feeds all outputs into Gem 4 for synthesis.

Usage:
    python run_workflow.py --domain https://example.com --flow "Consumer pays platform..."

First run: add --headed so you can log into Google. After that, the session is saved.
"""

import asyncio
import argparse
import re
import sys
from datetime import datetime
from playwright.async_api import async_playwright, Page, BrowserContext

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
        return text.strip()

    # Final fallback: innerText of the whole page (noisy but complete)
    log("scraper", "JS strategies returned short text — falling back to full page innerText")
    return (await page.inner_text("body")).strip()


async def send_message(page: Page, gem_name: str, text: str) -> None:
    """Type a message into the Gemini input and send it."""
    input_el = await page.wait_for_selector(SELECTORS["input"], timeout=30_000)
    await input_el.click()
    await input_el.fill(text)
    await asyncio.sleep(0.3)
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
        await asyncio.sleep(2)  # let Angular bootstrap

        # Send initial prompt
        prompt = initial_prompt(domain, flow)
        await send_message(page, name, prompt)
        await wait_for_response_complete(page, name)

        response = await get_last_response_text(page)
        log(name, f"Got response ({len(response)} chars)")

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
        await asyncio.sleep(2)

        prompt = synthesis_prompt(domain, flow, outputs)
        await send_message(page, name, prompt)
        await wait_for_response_complete(page, name)

        response = await get_last_response_text(page)
        log(name, f"Synthesis complete ({len(response)} chars)")
        return response

    except Exception as e:
        log(name, f"ERROR: {e}")
        return f"(Error retrieving synthesis: {e})"
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def print_separator(title: str = "") -> None:
    width = 70
    if title:
        pad = (width - len(title) - 2) // 2
        print("\n" + "=" * pad + f" {title} " + "=" * pad)
    else:
        print("\n" + "=" * width)


async def main(domain: str, flow: str, headed: bool, profile_dir: str) -> None:
    print_separator("MCC MULTI-GEM WORKFLOW")
    print(f"Domain     : {domain}")
    print(f"Flow       : {flow}")
    print(f"Started    : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_separator()

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=not headed,
            args=["--disable-blink-features=AutomationControlled"],
        )

        # Check login — navigate to Gemini home first
        page = await browser.new_page()
        await page.goto("https://gemini.google.com", wait_until="domcontentloaded", timeout=30_000)

        if headed:
            print("\nBrowser is open. Log into your Google account if prompted.")
            print("Press ENTER here once you are logged in and can see the Gemini home page.")
            await asyncio.get_event_loop().run_in_executor(None, input)

        await page.close()

        # --- Stage 1: Run Gems 1, 2, 3 in parallel ---
        print_separator("STAGE 1 — Running Gems 1, 2, 3 in parallel")
        gem1_task = asyncio.create_task(run_gem(browser, "gem1", domain, flow))
        gem2_task = asyncio.create_task(run_gem(browser, "gem2", domain, flow))
        gem3_task = asyncio.create_task(run_gem(browser, "gem3", domain, flow))

        gem1_out, gem2_out, gem3_out = await asyncio.gather(gem1_task, gem2_task, gem3_task)

        outputs = {"gem1": gem1_out, "gem2": gem2_out, "gem3": gem3_out}

        # Print intermediate outputs
        for key, label in [("gem1", "GEM 1 — Minimum Acceptance Criteria"),
                            ("gem2", "GEM 2 — Pathward"),
                            ("gem3", "GEM 3 — CRB")]:
            print_separator(label)
            print(outputs[key])

        # --- Stage 2: Synthesis via Gem 4 ---
        print_separator("STAGE 2 — Synthesiser (Gem 4)")
        final = await run_synthesis(browser, domain, flow, outputs)

        print_separator("FINAL RECOMMENDATION")
        print(final)
        print_separator()

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
        "--profile",
        default="./browser-profile",
        help="Path to persistent browser profile directory (default: ./browser-profile)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(main(args.domain, args.flow, args.headed, args.profile))
