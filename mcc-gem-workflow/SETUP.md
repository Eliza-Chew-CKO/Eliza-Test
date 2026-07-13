# Setup & Usage

## 1. Install dependencies

```bash
cd mcc-gem-workflow
pip install -r requirements.txt
playwright install chromium
```

## 2. First run — log in to Google

Start the web app with `--headed` so a browser window opens. Log into your Google account, then come back to the terminal and press ENTER.

```bash
python app.py --headed
```

Your session is saved to `./browser-profile/`. You won't need `--headed` again unless you're logged out.

## 3. Subsequent runs — open the web UI

```bash
python app.py
```

Then open **http://localhost:5000** in your browser.

Enter the merchant domain and flow of funds, click **Run Check**, and the results will appear on the page.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--headed` | off | Show the browser window (needed for first login) |
| `--port` | `5000` | Port to serve the web UI on |
| `--profile` | `./browser-profile` | Path to save the browser session |

## CLI (optional)

The original terminal script still works if preferred:

```bash
python run_workflow.py \
  --domain https://example.com \
  --flow "Consumer pays platform. Platform pays seller minus 10% fee. Weekly payouts."
```

## What it does

1. Opens Gems 1, 2, and 3 **in parallel** — each in its own browser tab
2. Sends the initial prompt to all three
3. If a gem's response contains no 4-digit MCC code, automatically sends: *"What are the MCC codes for this merchant?"*
4. Collects all three responses
5. Opens Gem 4 and sends a consolidated synthesis prompt
6. Prints the final recommendation to the terminal

## Troubleshooting

**"No input found" / prompt not sending**
The Gemini UI may have changed its HTML structure. Update the selectors in the `SELECTORS` dict near the top of `run_workflow.py`.

**Responses timing out**
Increase `RESPONSE_TIMEOUT_MS` in `run_workflow.py` (default is 2 minutes per gem).

**Logged out between runs**
Re-run with `--headed` to log back in. The session is saved so this should be rare.
