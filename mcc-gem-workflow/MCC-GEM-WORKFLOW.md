# MCC Classification — Multi-Gem Workflow

A step-by-step runbook for classifying a merchant's MCC and required documentation using 4 Google Gems.

---

## Gems

| # | Name | Link | Web Browsing |
|---|------|------|--------------|
| 1 | Minimum Acceptance Criteria | [Open Gem 1](https://gemini.google.com/gem/1lbrwjtJiPHB-Jyzq7yU03urGTl0PmL6g?usp=sharing) | Yes |
| 2 | Pathward | [Open Gem 2](https://gemini.google.com/gem/1tqNlfWe8_eqOFuJYiH2-S7AsErX_6_nE?usp=sharing) | Yes |
| 3 | CRB | [Open Gem 3](https://gemini.google.com/gem/1L63FscuAQvx7ah040LZVfEvqYabTyKLA?usp=sharing) | No |
| 4 | Synthesiser | [Open Gem 4](https://gemini.google.com/gem/1D82_fFhcFlMW8FCSo48YJDb8L0z1mBLw?usp=sharing) | No |

---

## Step 0 — Gather Inputs

Before starting, collect:

- **Domain URL** — the merchant's website (e.g. `https://example.com`)
- **Flow of funds** — a plain-English description of how money moves through the business

**Example flow of funds:**
> "Consumer pays the platform at checkout. The platform settles to the merchant minus a 2.5% fee. Payouts are weekly via bank transfer."

---

## Step 1 — Open Gems 1, 2, and 3 in Parallel

Open all three gem links in **separate browser tabs** simultaneously. Send the same initial prompt to each.

### Initial Prompt (send to Gem 1, 2, and 3 — identical)

```
Merchant domain: {{DOMAIN_URL}}

Flow of funds: {{FLOW_OF_FUNDS}}

Please identify the MCC code(s) for this merchant and the required documentation.
```

Replace `{{DOMAIN_URL}}` and `{{FLOW_OF_FUNDS}}` with your actual inputs before sending.

---

## Step 2 — Follow-up Prompt (if MCCs are not shown)

If any gem's response does not explicitly state an MCC code, send this follow-up in that gem's chat:

```
What are the MCC codes for this merchant?
```

Wait for all three gems to return MCC codes before proceeding to Step 3.

---

## Step 3 — Collect Outputs

Copy the full response from each gem. You should have:

- **Gem 1 output** — MCC(s), reasoning, required docs
- **Gem 2 output** — MCC(s), reasoning, required docs
- **Gem 3 output** — MCC(s), reasoning, required docs

---

## Step 4 — Send to Gem 4 (Synthesiser)

Open [Gem 4](https://gemini.google.com/gem/1D82_fFhcFlMW8FCSo48YJDb8L0z1mBLw?usp=sharing) and send the following prompt, pasting in all three outputs:

### Synthesis Prompt

```
Merchant domain: {{DOMAIN_URL}}

Flow of funds: {{FLOW_OF_FUNDS}}

---
GEM 1 OUTPUT (Minimum Acceptance Criteria):
{{PASTE GEM 1 FULL RESPONSE HERE}}

---
GEM 2 OUTPUT (Pathward):
{{PASTE GEM 2 FULL RESPONSE HERE}}

---
GEM 3 OUTPUT (CRB):
{{PASTE GEM 3 FULL RESPONSE HERE}}

---
Please synthesise the above outputs into a final recommendation including:
1. Final MCC code(s) — include multiple if required
2. Consensus summary — where did the gems agree or differ?
3. Justification for the final MCC selection
4. Consolidated required documentation checklist
5. Any risk flags or escalation notes
```

---

## Step 5 — Final Output

Gem 4 will return the authoritative recommendation. Notes on Gem 4's behaviour:

- It is biased towards **MAC bot** guidance when resolving MCC disagreements
- It will return **multiple MCCs** if the merchant's business model spans more than one category
- Where gems diverge, Gem 4's justification will explain the deciding factor

---

## Quick Reference — Input Template

Copy and fill in before each run:

```
Merchant domain: 
Flow of funds: 
```

---

## Example Run

**Input:**
```
Merchant domain: https://acme-marketplace.com
Flow of funds: Buyers pay the marketplace. The marketplace holds funds and pays out sellers after a 7-day dispute window, minus a 15% commission. International payouts via Wise.
```

**Step 1 prompt to Gems 1, 2, 3:**
```
Merchant domain: https://acme-marketplace.com

Flow of funds: Buyers pay the marketplace. The marketplace holds funds and pays out sellers after a 7-day dispute window, minus a 15% commission. International payouts via Wise.

Please identify the MCC code(s) for this merchant and the required documentation.
```

**If no MCC in response:**
```
What are the MCC codes for this merchant?
```

Then paste all three outputs into Gem 4 using the synthesis prompt above.
