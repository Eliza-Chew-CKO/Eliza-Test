# NORAM L90 Leaderboard → Slack canvas

Reads the four Last-90-day leaderboards from the NORAM **summary-metrics** tab
(the sheet owns the numbers/methodology) and rewrites a Slack canvas so a single
stable link always shows the latest figures. Runs every morning at **9am
America/New_York** via GitHub Actions (`.github/workflows/noram-leaderboard.yml`)
and DMs the link.

## Data flow

```
Google Sheet "summary metrics" tab  ──(published CSV)──▶  leaderboard.py  ──▶  Slack canvas
```

The script parses four Rank / Name / value tables — **Explore Meetings**,
**Moved to Propose**, **Moved to Trade**, **Moved to Handover** (top 10 each) —
and ignores everything else on the tab (e.g. the Quota table). The "as of" date
is today in America/New_York; the numbers are whatever the sheet currently
holds, so as the sheet refreshes, the canvas follows.

## Setup

### 1. Publish the summary-metrics tab as CSV
In the sheet: **File → Share → Publish to web** → choose the **summary metrics**
tab → **Comma-separated values (.csv)** → Publish. Copy the generated URL (looks
like `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=...&single=true&output=csv`).

> This makes that tab's contents reachable by anyone with the link. Publish only
> the summary-metrics tab, not the whole workbook.

### 2. Add GitHub Actions secrets
Repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SHEET_CSV_URL` | the published CSV url from step 1 |
| `SLACK_TOKEN` | Slack bot/user token with `canvases:write` |
| `SLACK_CANVAS_ID` | `F0BGZUDCJ0J` (the canvas to rewrite) |
| `SLACK_TEAM_ID` | `T0251H42B` (only used to build the notify link) |
| `SLACK_DM_CHANNEL` | optional — user/channel id to DM (e.g. `U0AGKMJTZ43`) |

## Run locally

```bash
pip install -r requirements.txt
export SHEET_CSV_URL='https://docs.google.com/.../pub?...&output=csv'
export SLACK_TOKEN=... SLACK_CANVAS_ID=F0BGZUDCJ0J
python leaderboard.py
```

Without `SLACK_TOKEN` the script prints the canvas markdown to stdout (dry run).

## Notes

- Parsing keys off the section headers on the tab (rows containing "explore",
  "propose", "trade", "handover"). If those labels change, update `METRICS` in
  `leaderboard.py`. The job logs a warning if a metric parses zero rows.
- If `canvases.edit` can't modify the target canvas, the script creates a fresh
  one and logs the new id — set `SLACK_CANVAS_ID` to that value afterwards.
- The workflow fires at 13:00 and 14:00 UTC and self-gates to 9am New York, so
  it stays correct across daylight-saving changes.
