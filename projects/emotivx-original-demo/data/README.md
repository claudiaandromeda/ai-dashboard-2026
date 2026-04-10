# Data Sources

This folder stores local development data files for ingestion testing.

## StatsBomb Open Data (current)
- Source: https://github.com/statsbomb/open-data
- License: See the StatsBomb Open Data repository for attribution requirements.
- If we render the data in a public UI, we must credit StatsBomb and display their logo per their terms.

## Local ingestion (secure)
Set credentials as environment variables only (do not commit keys):

PowerShell:
```
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

## Folder structure
- `data/statsbomb/competitions.json`
- `data/statsbomb/matches/{competition_id}/{season_id}.json`
- `data/statsbomb/events/{match_id}.json`
- `data/statsbomb/lineups/{match_id}.json`
- `data/statsbomb/three-sixty/{match_id}.json`
- `data/normalized/statsbomb/{match_id}.json`
- `data/moments/statsbomb/{match_id}.json`