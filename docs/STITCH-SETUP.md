# Connect Google Stitch → auto-generate MindKshetra designs

Cursor talks to [Google Stitch](https://stitch.withgoogle.com/) through an MCP bridge. Once connected, the agent can `create_project` + `generate_screen` for every prompt in `docs/stitch-prompts/`.

## Active project (generated)

| Field | Value |
|-------|-------|
| Stitch project | **MindKshetra App** |
| Project ID | `18106149955974460214` |
| P0 screens | onboarding, home, sloka, mood-grid, madhav, astrology-hub, chart-detail |
| Local output | `docs/stitch-output/` |
| Generator | `scripts/generate-stitch-screens.mjs` |

```bash
# Regenerate P0 (skips existing) or run all remaining screens:
STITCH_API_KEY=… node scripts/generate-stitch-screens.mjs p0
STITCH_API_KEY=… node scripts/generate-stitch-screens.mjs all
```

Open the project in the Stitch web UI: [stitch.withgoogle.com](https://stitch.withgoogle.com/) → **MindKshetra App**.

## Why not the official remote URL?

Cursor’s remote MCP client often fails on `https://stitch.googleapis.com/mcp` (OAuth discovery / “Invalid URL protocol”). Use a **local stdio bridge** instead.

## 1. Get a Stitch API key

1. Open [https://stitch.withgoogle.com/](https://stitch.withgoogle.com/) and sign in with Google.
2. Open **Settings / API** (or MCP setup docs) and create an API key.
3. Copy the key (looks like `AIza…`).

Official MCP setup: [stitch.withgoogle.com/docs/mcp/setup](https://stitch.withgoogle.com/docs/mcp/setup/)

## 2. Add MCP to Cursor

`~/.cursor/mcp.json` is already prepared with `stitch-mcp-stdio` (API key, no gcloud). Replace the placeholder:

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "/opt/homebrew/bin/gitnexus",
      "args": ["mcp"]
    },
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-stdio"],
      "env": {
        "STITCH_API_KEY": "PASTE_YOUR_KEY_HERE"
      }
    }
  }
}
```

Key path in Stitch UI: **Profile → Settings → API Key**.

**Do not commit the API key** to the git repo. Keep it only in `~/.cursor/mcp.json`.

## 3. Reload MCP

1. Cursor → **Settings → MCP**
2. Confirm `stitch` shows connected (green)
3. Tools should include: `create_project`, `generate_screen`, `list_screens`, `get_screen_image`, …

If tools = 0, restart Cursor once. Prefer `stitch-mcp-stdio` (API key) over the remote URL — Cursor often breaks on `stitch.googleapis.com/mcp` directly.

## 4. Auto-generate (ask the agent)

After the green dot is on, say in chat:

> Connect to Stitch and generate all P0 MindKshetra screens from `docs/stitch-prompts/` into one project named MindKshetra App. Device MOBILE. Use master style from `00-master-style.md` prepended to each prompt. Save HTML + screenshots under `MindKshetra/docs/stitch-output/`.

Recommended P0 order:

1. `01-onboarding`
2. `02-home`
3. `05-sloka`
4. `06-mood-grid`
5. `08-madhav`
6. `09-astrology-hub`
7. `11-chart-detail`

Then P1/P2 from the rest of `stitch-prompts/`.

## 5. What the agent will do

```
create_project("MindKshetra App")
→ for each prompt file:
    generate_screen(projectId, prompt, deviceType=MOBILE)
    get_screen_image / get_screen_html
    write files to docs/stitch-output/<screen>/
```

You can also open the same project in the Stitch web UI to tweak and export to Figma.

## Alternative: gcloud OAuth (no API key)

If you prefer Google Cloud ADC instead of an API key:

```bash
brew install --cask google-cloud-sdk
gcloud auth application-default login
gcloud beta services mcp enable stitch.googleapis.com --project=YOUR_PROJECT_ID
```

Then use `@keeponfirst/kof-stitch-mcp` or `@_davideast/stitch-mcp proxy` with `GOOGLE_CLOUD_PROJECT`. API key + `stitch-bridge` is simpler for Cursor.
