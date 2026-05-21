# Security Notes

This public repo is intentionally source-only and demo-safe.

## Not Included

- Private credentials.
- Real Plan Assist access files.
- Production hotel/client data.
- Private pilot files.
- Local caches.
- Build outputs.
- Installer packages.
- `.env` files.
- `.vercel` metadata.
- `node_modules`.
- Tauri `target` directories.
- Logs.

## Plan Assist

The included `Vyntax_Plan_Assist_Access.example.json` is a blank example template. A real `Vyntax_Plan_Assist_Access.json` file must never be committed.

The `.gitignore` blocks real access files and environment files.

## Data

Screenshots and demo workflows should use sample data only. Any future integration with accounting, hotel, labor, or business intelligence systems should use approved service credentials and written authorization from the data owner.

## Before Publishing

Review `git status` and confirm no ignored/private files were force-added. Search for credential terms such as `token`, `secret`, `password`, `api key`, and `.env` before pushing.
