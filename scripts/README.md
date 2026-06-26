# extract_data script

Usage:

From the project root run:

```bash
python scripts/extract_data.py
```

Options:

- `--no-upload` : do not write updates back to Google Sheets
- `--sheet-key KEY` : override the sheet key (otherwise taken from `api_keys.json`)
- `--verbose` : enable debug logging

Notes:

- Place `api_keys.json` in the project root with the Google service account key and an `openrouteservice` key if used.
- Caches are written to `./geocode_cache.json` and `./geocode_cache_routes.json`.
- Outputs are written to `docs/resources/data/` and `docs/resources/geojson/`.
