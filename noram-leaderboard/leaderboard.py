"""
NORAM leaderboards → Slack canvas.

Reads the four L90 leaderboards from the "summary metrics" tab of the NORAM
dashboard (published to the web as CSV) and rewrites a Slack canvas so a single
stable link always shows the latest numbers. Designed to run every morning
(see .github/workflows/noram-leaderboard.yml).

Source     : Google Sheet "summary metrics" tab, published as CSV (SHEET_CSV_URL).
             The sheet owns the numbers/methodology; this job mirrors them.
Metrics    : Explore Meetings, Moved to Propose, Moved to Trade, Moved to Handover
             (each a Rank / Name / value table, top 10).

Env:
  SHEET_CSV_URL      published-to-web CSV url for the summary-metrics tab (required)
  SLACK_TOKEN        bot/user token with `canvases:write` (+ `canvases:read`)
  SLACK_CANVAS_ID    canvas to rewrite (default below)
  SLACK_TEAM_ID      e.g. T0251H42B (used only to build the notify link)
  SLACK_DM_CHANNEL   optional: channel/user id to notify with the link
  NOTIFY             "1" to DM the link (default), "0" to refresh silently
"""

import csv
import io
import logging
import os
import sys
from collections import OrderedDict

import requests

DEFAULT_CANVAS_ID = "F0BGZUDCJ0J"
TOP_N = 10

# metric key -> (display title, emoji, keyword that marks its section in the sheet)
METRICS = OrderedDict([
    ("explore", ("Explore Meetings", ":handshake:", "explore")),
    ("propose", ("Moved to Propose", ":dart:", "propose")),
    ("trade", ("Moved to Trade", ":chart_with_upwards_trend:", "trade")),
    ("handover", ("Moved to Handover", ":package:", "handover")),
])
# Rows at/after a header containing any of these are not leaderboard data.
STOP_KEYWORDS = ("quota",)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("noram-leaderboard")


# --------------------------------------------------------------------------- #
# Read + parse the sheet
# --------------------------------------------------------------------------- #
def fetch_rows(csv_url):
    r = requests.get(csv_url, timeout=30)
    r.raise_for_status()
    if "text/csv" not in r.headers.get("content-type", "") and "<html" in r.text[:200].lower():
        sys.exit("SHEET_CSV_URL did not return CSV — is the tab published to the web as CSV?")
    return list(csv.reader(io.StringIO(r.text)))


def parse_leaderboards(rows):
    """Walk the tab top-to-bottom, bucketing Rank/Name/value rows under whichever
    metric section header was seen most recently."""
    sections = {k: [] for k in METRICS}
    current = None
    for row in rows:
        cells = [c.strip() for c in row]
        text = " ".join(cells).lower()
        if any(k in text for k in STOP_KEYWORDS):
            current = None
            continue
        # section header? (title or column-header row contains the metric keyword)
        for key, (_title, _emoji, kw) in METRICS.items():
            if kw in text:
                current = key
                break
        # data row: first non-empty cell is a rank int, plus a name and a number
        ne = [c for c in cells if c]
        if current and len(ne) >= 3 and ne[0].isdigit():
            name = ne[1]
            try:
                value = float(ne[-1].replace(",", ""))
            except ValueError:
                continue
            if len(sections[current]) < TOP_N:
                sections[current].append((int(ne[0]), name, value))
    return sections


def fmt_pts(v):
    return f"{v:g}"  # 6.0 -> "6", 6.5 -> "6.5"


# --------------------------------------------------------------------------- #
# Canvas rendering + Slack API
# --------------------------------------------------------------------------- #
def build_canvas_markdown(sections, as_of):
    out = [
        "# NORAM Stage-Movement Leaderboard — Last 90 Days",
        "",
        f"_Source: NORAM summary-metrics dashboard. Rolling last 90 days, "
        f"as of ![](slack_date:{as_of}). Ranked per metric. Auto-refreshed each morning._",
        "",
    ]
    for key, (title, emoji, _kw) in METRICS.items():
        out.append(f"## {emoji} {title}")
        out.append("")
        out.append("|Rank|Owner|Points|")
        out.append("|---|---|---|")
        for rank, name, value in sections.get(key, []):
            out.append(f"|{rank}|{name}|{fmt_pts(value)}|")
        out.append("")
    return "\n".join(out).strip()


def slack_api(method, token, payload):
    r = requests.post(
        f"https://slack.com/api/{method}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
        json=payload,
        timeout=30,
    )
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack {method} failed: {data.get('error')} ({data})")
    return data


def update_canvas(token, canvas_id, markdown):
    slack_api(
        "canvases.edit",
        token,
        {"canvas_id": canvas_id,
         "changes": [{"operation": "replace", "document_content": {"type": "markdown", "markdown": markdown}}]},
    )
    log.info("Canvas %s updated.", canvas_id)


def create_canvas(token, title, markdown):
    return slack_api(
        "canvases.create",
        token,
        {"title": title, "document_content": {"type": "markdown", "markdown": markdown}},
    ).get("canvas_id")


def notify(token, channel, text):
    slack_api("chat.postMessage", token, {"channel": channel, "text": text})


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    import datetime
    from zoneinfo import ZoneInfo

    as_of = os.getenv("AS_OF_DATE") or datetime.datetime.now(ZoneInfo("America/New_York")).date().isoformat()

    csv_url = os.getenv("SHEET_CSV_URL")
    if not csv_url:
        sys.exit("SHEET_CSV_URL not set — publish the summary-metrics tab to the web as CSV and set this.")

    sections = parse_leaderboards(fetch_rows(csv_url))
    for key, (title, *_rest) in METRICS.items():
        n = len(sections.get(key, []))
        log.info("%s: %d rows", title, n)
        if n == 0:
            log.warning("No rows parsed for '%s' — check the sheet layout / keyword.", title)

    markdown = build_canvas_markdown(sections, as_of)

    slack_token = os.getenv("SLACK_TOKEN")
    if not slack_token:
        print(markdown)
        sys.exit("SLACK_TOKEN not set — printed canvas markdown above instead of publishing.")

    canvas_id = os.getenv("SLACK_CANVAS_ID", DEFAULT_CANVAS_ID)
    try:
        update_canvas(slack_token, canvas_id, markdown)
    except RuntimeError as exc:
        log.warning("Edit failed (%s) — creating a fresh canvas.", exc)
        canvas_id = create_canvas(slack_token, "NORAM L90 Leaderboard", markdown)
        log.info("New canvas: %s", canvas_id)

    dm = os.getenv("SLACK_DM_CHANNEL")
    notify_on = os.getenv("NOTIFY", "1").strip().lower() not in ("0", "false", "no", "")
    if dm and notify_on:
        url = f"https://checkout.slack.com/docs/{os.getenv('SLACK_TEAM_ID','')}/{canvas_id}".rstrip("/")
        notify(slack_token, dm, f":trophy: NORAM L90 leaderboard refreshed for {as_of}. Canvas: {url}")


if __name__ == "__main__":
    main()
