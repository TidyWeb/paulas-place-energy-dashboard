# Paula’s Place energy notebook

A static, responsive dashboard for comparing provisional solar, battery and air-to-water heat-pump scenarios. No build step, account, API key or publication is needed.

The entry page has a simple client-side review-password gate, matching the Paula’s Place palette and using the supplied Borth-y-Gest image as a blurred background. It is a privacy screen, not high-security authentication; the dashboard unlock lasts for the current browser session.

## Run locally

Open a terminal in this `dashboard` folder and run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [the local dashboard](http://127.0.0.1:8765/). Keep that terminal running while using it. Opening `index.html` directly is not supported because browser security blocks local JSON/module loading.

Choose Basic, Medium or Top-class, then adjust the inputs. Number inputs update when committed (Enter, Tab or click outside). Tiers set the selected roofs and battery; each retains its selected kit and entered costs. The initial all-in DIY budget is £5,000 as specified by Phil. Edit that single total to compare another outlay. Example supplier packages are not selected components. Reset to defaults restores the entire initial scenario, grant-off state and map/date/time. Reloading also resets inputs; the dashboard does not save personal data or edits.

## Files and deployment

- `index.html`, `styles.css`, `app.js`: password gate, interface and financial sensitivity calculations.
- `assets/borth-y-gest-gate.png`: supplied coastal image used by the review gate.
- `model.js`: panel fit and hourly electricity/storage dispatch.
- `map.js`: interactive map and approximate sun geometry.
- `data/solar-profile.json`: compact copy of the saved PVGIS hourly output.
- `data/its-kits.json`, `data/energian-kits.json`: retained reference data only; not used for the all-in DIY total.
- `data/grants.json`: cards derived from the dated project funding research.
- `DATA_PROVENANCE.md` and `SOURCE_RECONCILIATION.md`: methods, limitations and contradictions.
- `vendor/`: Leaflet 1.9.4 and its retained BSD licence.
- `model.test.mjs`: energy and layout regression checks; run `node model.test.mjs`.
- `QA_REPORT.md`: browser and verification record.

The repository is ready for a static host such as GitHub Pages: serve the whole folder with the same relative paths. There is no server-side code or secret configuration.

## Network and privacy

Energy calculations and funding cards use local files. The optional map requests OpenStreetMap or Esri imagery tiles, which requires internet access and exposes ordinary browser request metadata to those providers. Display fonts request Google Fonts; readable local fallbacks are provided. The map retains coordinates and overlays if tiles fail. No telemetry, login or application analytics are installed.

Before a public deployment, review [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and imagery provider terms, including attribution and expected traffic. Leaflet use follows its [official guide](https://leafletjs.com/examples/quick-start/). Keep attribution and the included licence.

## Interpretation

This is a conversation aid, not an engineering design, planning approval, grant decision or quotation. The map does not establish a legal boundary. The home working copy is the editable source; the Seagate dashboard is the duplicated delivery copy. Existing source research and datasets are retained untouched.
