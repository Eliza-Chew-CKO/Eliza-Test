# NORAM L90 Leaderboard → Slack canvas

Recomputes the NORAM Last-90-day stage-movement leaderboard and rewrites a Slack
canvas so a single, stable link always shows the latest numbers. Runs every
morning at **9am America/New_York** via GitHub Actions
(`.github/workflows/noram-leaderboard.yml`).

## What it measures

| Metric | Source field | Counts an opp when… |
|---|---|---|
| Explore Meetings | `Disco_Call_Date__c` ("First Explore Meeting Date") | date is in the last 90 days |
| Moved to Propose | `DateSettoP1__c` | date is in the last 90 days |
| Moved to Trade | `DateSettoT1__c` | date is in the last 90 days |
| Moved to Handover | `OpportunityFieldHistory` stage change → `Handover` | transition happened in the last 90 days (deduped per opp) |

- **Scope:** `Opp_Owner_Region__c = 'NORAM' OR Sales_Ops_Second_Opp_Owner_Sales_Region__c = 'NORAM'`
  (opportunities where the **first or second** owner's region is NORAM)
- **Scoring:** sole opp owner = **1 pt**; if a 2nd owner exists, **0.5 pt each**
  (`Owner` = first, `Second_Opportunity_Owner__c` = second).
- Each table shows the **top 10**, ranked per metric (ties broken alphabetically).

## Required GitHub secrets

Salesforce (either the token pair **or** the username set):

| Secret | Notes |
|---|---|
| `SF_ACCESS_TOKEN` | OAuth/session token — recommended for the SSO org |
| `SF_INSTANCE_URL` | e.g. `https://checkout.lightning.force.com` |
| `SF_USERNAME` / `SF_PASSWORD` / `SF_SECURITY_TOKEN` | only if not using a token |
| `SF_CLIENT_ID` / `SF_CLIENT_SECRET` | optional (Connected App) |

> For a truly unattended job, use a **Connected App** (OAuth) rather than a
> browser session token, which expires in ~2 hours. See
> `../automation test/sf_auth.py` for how to mint one.

Slack:

| Secret | Notes |
|---|---|
| `SLACK_TOKEN` | bot/user token with `canvases:write` (and `canvases:read`) |
| `SLACK_CANVAS_ID` | canvas to rewrite (defaults to `F0BH3FS6THS` if unset) |
| `SLACK_TEAM_ID` | e.g. `T0251H42B` — only used to build the notify link |
| `SLACK_DM_CHANNEL` | optional — user/channel id to ping with the link (e.g. `U0AGKMJTZ43`) |

## Run locally

```bash
pip install -r requirements.txt
export SF_ACCESS_TOKEN=... SF_INSTANCE_URL=... SLACK_TOKEN=... SLACK_CANVAS_ID=F0BH3FS6THS
python leaderboard.py
```

Without `SLACK_TOKEN` the script prints the canvas markdown to stdout instead of
publishing — handy for a dry run.

## Notes

- If `canvases.edit` can't modify the existing canvas (e.g. ownership), the
  script creates a fresh canvas and logs the new id — set `SLACK_CANVAS_ID` to
  that value so subsequent runs stay on one link.
- The workflow fires at 13:00 and 14:00 UTC and self-gates to whichever is 9am
  in New York, so it stays correct across daylight-saving changes.
