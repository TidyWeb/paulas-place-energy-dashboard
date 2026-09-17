# Paula's Place — simple dashboard

A big-block version of the energy dashboard. Tap the tiles; the bill, savings, sun share, payback and monthly chart update straight away.

## Run

```sh
cd "/home/Phil/Codex-Projects/Paula's Place/Claude_dashboard"
python3 -m http.server 8766 --bind 127.0.0.1
```

Then open http://127.0.0.1:8766/

## Files

- `index.html`, `styles.css`, `app.js` — the interface.
- `model.js` — copy of `../dashboard/model.js` plus one addition: `peakExport` (default `false`). When it's on, the battery sells to the grid in the Flux 16:00–19:00 window, keeping enough charge (perfect forecast) to run the house until 02:00. Overnight grid charging then fills the battery, leaving room for the next day's forecast solar surplus. New outputs are `peakExportKwh` and `peakExportRevenue`. With `peakExport` off, results are identical to the original, and `../dashboard/model.test.mjs` passes against this copy.
- `data/solar-profile.json` — copy of `../dashboard/data/solar-profile.json`.
- `assets/borth-y-gest-gate.png` — the supplied coastal image used by the review gate.

Don't copy `../dashboard/model.js` over this one: that would remove peak export. Port any engine changes by hand.

## How tiles map to the model

- Panels: 0–40, via tiles (6/10/16/20) or −/+. The first 6 go on the front roof (its provisional fit). The rest go on the "rear" surface, resized to 500 m² so the count is never capped, at its 138° / 20° orientation. Panel size (450/500 W) is in Fine-tune.
- Sell at peak: `peakExport`.
- Export limit: 3.68 kW or 8 kW.
- Battery: 0 / 16.08 / 32.16 kWh nominal.
- Usage: 5.6 / 8 / 12 kWh a day.
- Heat pump: adds the fine-tune kWh (default 3,000/year), winter-weighted.
- Night charging: Flux 02:00–05:00 grid charging, perfect-forecast.
- All other settings use `model.js` defaults.

"Bill" includes the standing charge. "Save" = the same house on Flux with no panels, minus the new bill. Payback = budget ÷ yearly saving.

The hosted version places this dashboard at `/simple/` beside the complex dashboard. Both routes use the same simple client-side review-password gate and link to each other. The gate is a privacy screen, not high-security authentication.
