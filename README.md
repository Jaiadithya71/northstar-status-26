# Current / next

A public read-only dashboard with a PIN-protected My Day editor. Vercel serves static files and `api/day.js`. Data is stored in GitHub `data.json` and never in ephemeral function storage. Anyone with the URL can read the dashboard and archive. Do not put secrets in this repository.

## Updates

Agent planning updates edit `data.json`, preserving `today.items` status and user-added items when rebuilding the same date. When advancing the date, append the old `today` to `archive` first and start the new day with fresh agent items plus any explicitly carried-forward user tasks. The API re-reads GitHub on every request and writes with the file SHA to detect conflicts. The page fetches live API state before rendering, so it does not need to wait for a Vercel redeploy after check-offs.

Production Vercel secret environment variables: `GITHUB_DATA_TOKEN` is a fine-grained PAT with Contents read/write for only this repo; `DAY_EDIT_PIN` is the editor PIN. The token expires October 25, 2026 and must be renewed before then. Do not expose either in browser code or source. The in-memory attempt counter is best-effort only; for a short PIN, add an edge rate limiter or stronger authentication for meaningful brute-force resistance. The PIN is prompted only on edits and retained in memory until the tab closes.
