# Anonymous funnel collector

`collector.gs` appends one row per event to the first tab of the Google Sheet the script is bound to.

Columns, in order: `received_at`, `event`, `source`, `day`, `date`, `device_id`.

The script writes a header row only when that tab is empty. It does not read IP addresses or request headers.

## Deploy

1. Open the Google Sheet that should hold the rows.
2. Extensions > Apps Script. Paste `collector.gs`. Save.
3. Deploy as a Web app that runs as me and that anyone can access. (Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.)
4. Put the web app URL in the `VITE_COLLECTOR_ENDPOINT` repository variable or secret used by the Pages build. The Pages workflow passes that value at build time when it is present. Leave it unset and the app sends nothing.
