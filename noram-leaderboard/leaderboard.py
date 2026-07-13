"""
NORAM stage-movement leaderboard → Slack canvas.

Recomputes the Last-90-day NORAM leaderboard across four metrics and rewrites a
Slack canvas so the same link always shows the latest numbers. Designed to run
unattended (see .github/workflows/noram-leaderboard.yml).

Scope     : Opp_Owner_Region__c = 'NORAM'
             OR Sales_Ops_Second_Opp_Owner_Sales_Region__c = 'NORAM'
Window     : last 90 days
Metrics    : Explore meetings   (Disco_Call_Date__c)
             Moved to Propose    (DateSettoP1__c)
             Moved to Trade      (DateSettoT1__c)
             Moved to Handover   (stage-change into 'Handover', from field history)
Scoring    : sole opp owner = 1 point; if a 2nd owner exists, 0.5 each.

Auth follows the same env contract as `automation test/sf_auth.py`:
  SF_ACCESS_TOKEN + SF_INSTANCE_URL         (session token — SSO orgs)
  or SF_USERNAME + SF_PASSWORD + SF_SECURITY_TOKEN + SF_INSTANCE_URL
Slack:
  SLACK_TOKEN        bot/user token with `canvases:write` (+ `canvases:read`)
  SLACK_CANVAS_ID    canvas to rewrite (default below)
  SLACK_DM_CHANNEL   optional: channel/user id to notify with the link
"""

import logging
import os
import sys
from collections import defaultdict
from urllib.parse import urlparse

import requests

REGION = "NORAM"
DEFAULT_CANVAS_ID = "F0BH3FS6THS"
TOP_N = 10

# Scope: opportunities where the first OR second owner's region is NORAM.
# (Opp_Owner_Region__c is the first owner's region; Sales_Ops_Second_Opp_Owner_Sales_Region__c
# is the maintained region for the second owner.)
SCOPE_OPP = (
    f"(Opp_Owner_Region__c = '{REGION}' "
    f"OR Sales_Ops_Second_Opp_Owner_Sales_Region__c = '{REGION}')"
)
SCOPE_HISTORY = (
    f"(Opportunity.Opp_Owner_Region__c = '{REGION}' "
    f"OR Opportunity.Sales_Ops_Second_Opp_Owner_Sales_Region__c = '{REGION}')"
)

# metric key -> (display title, emoji, date field on Opportunity)
DATE_METRICS = [
    ("explore", "Explore Meetings", ":handshake:", "Disco_Call_Date__c"),
    ("propose", "Moved to Propose", ":dart:", "DateSettoP1__c"),
    ("trade", "Moved to Trade", ":chart_with_upwards_trend:", "DateSettoT1__c"),
]
HANDOVER = ("handover", "Moved to Handover", ":package:")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("noram-leaderboard")


# --------------------------------------------------------------------------- #
# Salesforce
# --------------------------------------------------------------------------- #
def get_salesforce_client():
    from simple_salesforce import Salesforce

    raw = os.getenv("SF_INSTANCE_URL", "")
    parsed = urlparse(raw)
    instance_url = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else raw
    token = os.getenv("SF_ACCESS_TOKEN", "")
    version = os.getenv("SF_API_VERSION", "59.0")

    if token:
        if not instance_url:
            sys.exit("SF_ACCESS_TOKEN set but SF_INSTANCE_URL missing.")
        sf = Salesforce(instance_url=instance_url, session_id=token, version=version)
        sf.query("SELECT Id FROM User LIMIT 1")  # probe
        log.info("Salesforce: session-token auth OK (%s)", instance_url)
        return sf

    username, password = os.getenv("SF_USERNAME", ""), os.getenv("SF_PASSWORD", "")
    if not (username and password and instance_url):
        sys.exit("No SF_ACCESS_TOKEN and username/password auth incomplete.")
    domain = "test" if ("test.salesforce" in instance_url.lower() or "sandbox" in instance_url.lower()) else "login"
    sf = Salesforce(
        username=username,
        password=password,
        security_token=os.getenv("SF_SECURITY_TOKEN", ""),
        consumer_key=os.getenv("SF_CLIENT_ID") or None,
        consumer_secret=os.getenv("SF_CLIENT_SECRET") or None,
        domain=domain,
        version=version,
    )
    log.info("Salesforce: username/password auth OK (%s)", instance_url)
    return sf


def _pair(rec):
    """(first_owner_name, second_owner_name|None) from an Opportunity record."""
    owner = (rec.get("Owner") or {}).get("Name")
    second_ref = rec.get("Second_Opportunity_Owner__r")
    second = second_ref.get("Name") if second_ref else None
    return owner, second


def date_metric_pairs(sf, date_field):
    q = (
        f"SELECT Id, Owner.Name, Second_Opportunity_Owner__r.Name "
        f"FROM Opportunity "
        f"WHERE {SCOPE_OPP} "
        f"AND {date_field} = LAST_N_DAYS:90"
    )
    return [_pair(r) for r in sf.query_all(q)["records"]]


def handover_pairs(sf):
    """Distinct opps that transitioned into 'Handover' in the window (deduped)."""
    q = (
        "SELECT OpportunityId, NewValue, Opportunity.Owner.Name, "
        "Opportunity.Second_Opportunity_Owner__r.Name "
        "FROM OpportunityFieldHistory "
        "WHERE Field = 'StageName' AND CreatedDate = LAST_N_DAYS:90 "
        f"AND {SCOPE_HISTORY}"
    )
    by_opp = {}
    for r in sf.query_all(q)["records"]:
        if r.get("NewValue") == "Handover":
            by_opp[r["OpportunityId"]] = _pair(r.get("Opportunity") or {})
    return list(by_opp.values())


# --------------------------------------------------------------------------- #
# Scoring
# --------------------------------------------------------------------------- #
def score(pairs):
    """sole owner = 1; if a 2nd owner exists, 0.5 each."""
    pts = defaultdict(float)
    for first, second in pairs:
        if second:
            if first:
                pts[first] += 0.5
            pts[second] += 0.5
        elif first:
            pts[first] += 1.0
    return pts


def top(pts, n=TOP_N):
    # rank by points desc, then name asc for stable tie-breaks
    return sorted(pts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]


def fmt_pts(v):
    return f"{v:g}"  # 6 -> "6", 6.5 -> "6.5"


# --------------------------------------------------------------------------- #
# Canvas rendering + Slack API
# --------------------------------------------------------------------------- #
def build_canvas_markdown(sections, as_of):
    out = [
        "# NORAM Stage-Movement Leaderboard — Last 90 Days",
        "",
        f"_Scope: opps where **Opp Owner Region = {REGION} OR Second Opp Owner Region = {REGION}**. "
        f"Window: last 90 days (as of ![](slack_date:{as_of})). "
        "Scoring: sole opp owner = **1 pt**; if a 2nd owner exists, **0.5 pt each**. "
        "Ranked per metric._",
        "",
    ]
    for title, emoji, rows in sections:
        out.append(f"## {emoji} {title}")
        out.append("")
        out.append("|Rank|Owner|Points|")
        out.append("|---|---|---|")
        for i, (name, pts) in enumerate(rows, 1):
            out.append(f"|{i}|{name}|{fmt_pts(pts)}|")
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
    """Replace the whole canvas so the link stays stable."""
    slack_api(
        "canvases.edit",
        token,
        {
            "canvas_id": canvas_id,
            "changes": [
                {"operation": "replace", "document_content": {"type": "markdown", "markdown": markdown}}
            ],
        },
    )
    log.info("Canvas %s updated.", canvas_id)


def create_canvas(token, title, markdown):
    data = slack_api(
        "canvases.create",
        token,
        {"title": title, "document_content": {"type": "markdown", "markdown": markdown}},
    )
    return data.get("canvas_id")


def notify(token, channel, text):
    slack_api("chat.postMessage", token, {"channel": channel, "text": text})


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    as_of = os.getenv("AS_OF_DATE") or __import__("datetime").date.today().isoformat()

    sf = get_salesforce_client()
    sections = []
    for _key, title, emoji, field in DATE_METRICS:
        rows = top(score(date_metric_pairs(sf, field)))
        sections.append((title, emoji, rows))
        log.info("%s: %d ranked", title, len(rows))
    rows = top(score(handover_pairs(sf)))
    sections.append((HANDOVER[1], HANDOVER[2], rows))
    log.info("%s: %d ranked", HANDOVER[1], len(rows))

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
        canvas_id = create_canvas(slack_token, f"NORAM L90 Leaderboard — updated {as_of}", markdown)
        log.info("New canvas: %s", canvas_id)

    dm = os.getenv("SLACK_DM_CHANNEL")
    if dm:
        url = f"https://checkout.slack.com/docs/{os.getenv('SLACK_TEAM_ID','')}/{canvas_id}".rstrip("/")
        notify(slack_token, dm, f":trophy: NORAM L90 leaderboard refreshed for {as_of}. Canvas: {url}")


if __name__ == "__main__":
    main()
