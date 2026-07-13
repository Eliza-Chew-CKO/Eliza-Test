# NORAM L90 Leaderboard → Slack canvas

Recomputes the NORAM Last-90-day stage-movement leaderboard and rewrites a Slack
canvas so a single, stable link always shows the latest numbers. Runs **hourly
during weekday business hours (9am–6pm America/New_York)** via GitHub Actions
(`.github/workflows/noram-leaderboard.yml`); the **9am** run also DMs the link,
intraday runs refresh the canvas silently.

The 90-day window is always relative to the run (SOQL `LAST_N_DAYS:90`) and the
"as of" date is today in America/New_York — so it's a continuously rolling
last-90-days, never pinned to a fixed date.

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

Salesforce — pick **one** of three modes (checked in this order):

| Mode | Secrets | Notes |
|---|---|---|
| **Client credentials** (recommended) | `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_INSTANCE_URL` | Connected App Consumer Key/Secret. Mints a fresh token every run — nothing expires. Works with SSO. |
| Static token | `SF_ACCESS_TOKEN`, `SF_INSTANCE_URL` | Simplest, but a session token expires in ~2h — not for unattended use. |
| Username/password | `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN`, `SF_INSTANCE_URL` | Blocked on SSO orgs. |

`SF_INSTANCE_URL` = your My Domain, e.g. `https://checkout.my.salesforce.com`.
Optional `SF_TOKEN_URL` overrides the token endpoint (defaults to
`<SF_INSTANCE_URL>/services/oauth2/token`).

### Setting up the Connected App (client credentials)

1. **Setup → App Manager → New Connected App** (or *New Connected App* under
   *App Manager* in Lightning). Name it e.g. `NORAM Leaderboard Bot`.
2. **Enable OAuth Settings.** Callback URL can be `https://login.salesforce.com`
   (unused by this flow). Selected OAuth scopes: **Manage user data via APIs
   (`api`)**. Save.
3. Open the app → **Manage → Edit Policies**:
   - Under **OAuth Policies**, set **Permitted Users** as needed and enable
     **Client Credentials Flow**.
   - Set **Run As** to an integration user that can read the NORAM
     Opportunities + field history (this user's data access defines what the
     job sees).
4. **Manage Consumer Details** → copy **Consumer Key** → `SF_CLIENT_ID` and
   **Consumer Secret** → `SF_CLIENT_SECRET`.
5. Add those plus `SF_INSTANCE_URL` as GitHub Actions secrets. Done — the job
   exchanges them for a short-lived access token on each run.

> Token endpoint used: `POST <SF_INSTANCE_URL>/services/oauth2/token` with
> `grant_type=client_credentials`. Test locally with:
> `curl -X POST "$SF_INSTANCE_URL/services/oauth2/token" -d grant_type=client_credentials -d client_id=... -d client_secret=...`

Slack:

| Secret | Notes |
|---|---|
| `SLACK_TOKEN` | bot/user token with `canvases:write` (and `canvases:read`) |
| `SLACK_CANVAS_ID` | canvas to rewrite (defaults to `F0BGZUDCJ0J` if unset) |
| `SLACK_TEAM_ID` | e.g. `T0251H42B` — only used to build the notify link |
| `SLACK_DM_CHANNEL` | optional — user/channel id to ping with the link (e.g. `U0AGKMJTZ43`) |

`NOTIFY` (env, set by the workflow) controls the DM: `1` sends it, `0` refreshes
the canvas silently. Defaults to on for local/manual runs.

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
