# Data provenance and assumptions

Prepared 16 September 2026. Read alongside `SOURCE_RECONCILIATION.md`.

## Evidence labels

- **Measured/derived:** calculated outputs and geometric calculations. No on-site measurement is claimed.
- **Imported from project data:** previously saved source datasets, model assumptions, tariff snapshot and funding research. Imported does not mean measured at the property.
- **Assumed:** model strategy, demand shape, heat-pump seasonal allocation and tier choices.
- **User-editable placeholder:** cost allowances and unverified scenario values.
- **Requires installer/site survey:** roof rectangles, setbacks, structural suitability, shading, equipment integration, grant evidence and DNO limits.

Result-panel labels apply to every figure within the panel. Mixed-evidence components carry more specific notes. All output precision is for calculation and comparison, not a claim of accuracy.

## Solar source

Primary file: `pvgis_borth_y_gest_optimal_1kwp_2021_2023.json`, cross-checked against its `.csv`. The compact dashboard profile retains 26,280 hourly output values in Wh for a 1 kWp reference array, covering 2021–2023. Mean annual reference yield is about 908.34 kWh/kWp; the separate long-term calculator figure of about 873 is a different period/result.

The reference is PVGIS 5.3 / SARAH-3 at the old postcode point 52.912431, −4.147339, with 38° tilt and 2° PVGIS aspect (182° clockwise from north), free-standing mounting and 14% system loss. That loss is already present; it is not deducted again. See the saved JSON metadata and `RESOURCES.md`.

Current working anchors are A 52.91556, −4.13733 and B 52.91570, −4.13754. The saved profile is not a new simulation at either anchor. Front roof azimuth is tentatively 138° clockwise from north. Rear azimuth 138°/tilt 20° and ground azimuth 180°/tilt 35° are editable assumptions.

Per-surface screening multiplier:

```
aspect penalty = 0.42 × (1 − cos(aspect − reference aspect)) × sin(tilt)
tilt penalty = 0.30 × sin(abs(tilt − reference tilt))
multiplier = clamp((1 − aspect penalty) × (1 − tilt penalty), 0.15, 1)
```

These coefficients are explicitly assumed sensitivity factors, not a validated irradiance transposition model. Every surface retains the same hourly timing; an east/west roof's shifted daily production is not captured. Thus hourly tariff, storage and export estimates also inherit this uncertainty. Obtain roof-specific PVGIS profiles and a horizon/shading survey before financial decisions. No extra claimed shading correction is applied.

Monthly outputs average each calendar month across the three source years. Annual ranges use the minimum and maximum of those three simulated years. They are weather sensitivity only, not prediction intervals; they omit many larger site and cost uncertainties.

The NASA POWER clean/solar 2021–2025 files are regional resource evidence only. Their Wh/m² values describe irradiation, not household electrical generation. They are not blended into the PVGIS electricity series.

## Panel fit

Default front area cap 18 m² with a provisional 6 × 3 m rectangle; rear 12 m² with a 4 × 3 m rectangle; ground 0 m². Ground dimensions are initially zero. Adding a positive ground area proposes a 5 m-wide rectangle, clearly editable. Default usable percentage 85%, module dimensions 1.762 × 1.134 m, power 450 W (500 W scenario available), inter-module gap 0.02 m.

Area-only count is floor(area cap × usable percentage / module area). Layout count evaluates full portrait and landscape row/column grids with gaps, then caps count by the smaller of the area cap and rectangle area, with usable percentage applied. Manual overrides can reduce count; requested counts exceeding layout are visibly capped. Layout illustrations may show a partly filled last row after the usable-area cap. This simple uniform layout does not optimise mixed rotations or map obstacle locations, access, edge zones, wind loads, racking or shading between ground-array rows.

Default Basic enables front only and one 16.08 kWh battery; Medium front and rear with one battery; Top-class front and rear with two batteries (32.16 kWh). Top-class therefore increases storage, not solar area. All tiers retain the same module choice. Ground is an independent optional addition.

## Demand and storage

Daily household scenarios 5.6 / 8 / 12 kWh come from the existing Python model. Its evening-heavy 24-hour shape is retained and normalised per calendar month. These are assumed loads, not meter readings. Air-to-water heat pump defaults to off; its editable 3,000 kWh/year is extra electricity input. When enabled, monthly fractions are 16, 14, 12, 8, 5, 2.5, 2.5, 3, 5.5, 8, 10.5, 13 percent. Heat-pump use is flat within each month. This is a winter-heavy scenario, not a heat-loss, COP or hot-water design.

Nominal battery options: 16.08 / 32.16 / 40 kWh. Default usable window 90%, reserve 1 kWh within that window, charge/discharge efficiencies 95% each and battery power limit 5 kW. Default inverter 8 kW, export cap 3.68 kW, both unconfirmed. The model starts at its protected reserve and tracks residual stored energy continuously across years. Reserve is capped by usable capacity when inputs conflict; the interface warns. No free usable starting energy is supplied.

Dispatch serves the household with PV, charges storage from solar, and exports remaining solar up to the export cap. Available battery energy serves remaining load subject to power, efficiency and shared inverter constraints. Grid import serves unmet demand. The model separates tracked solar-derived and grid-derived stored energy. Conversion loss, clipping and export curtailment are included; standby consumption, degradation, temperature effects and equipment-specific hybrid/DC topology are not.

Cheap grid charging is on by default to retain the earlier project's planning strategy. It calculates a target from perfect knowledge of historical next-day net demand and PV, within capacity and charging limits. This is optimistic. It buys cheap household electricity directly in the cheap window and does not simultaneously discharge. Solar-only charging is available by switching this off. There is no deliberate peak export of battery energy. The original model's reserve was not enforced; the dashboard fixes this, so its outputs are not exact reproductions of the old summary CSVs.

Generation output is potential AC-equivalent solar before the additional user-set inverter and export constraints. Curtailed/clipped output is reported separately. Energy balance includes battery losses and the difference between initial and final stored energy. Battery charge is AC input; discharge is AC delivered. Solar self-consumption = (direct solar + solar battery input) / solar generation, including solar-storage losses. Demand coverage counts only solar delivered to the household, excluding stored grid energy.

## Tariff and financial sensitivity

Imported from the 15 September 2026 standard Octopus Flux snapshot: cheap/normal/peak import 16.08 / 26.79 / 37.52 p/kWh, export 5.124 / 10.5442 / 30.6829 p/kWh, standing 68 p/day. Cheap window 02:00–05:00 and peak 16:00–19:00 are UK local time with historical BST. PV timestamps remain UTC. The sun-map time control is separately labelled UTC.

These are dated planning inputs, not guaranteed prices. Net energy cost = import cost − export revenue. Total bill adds standing. Annual savings compare the same electrical demand on the same Flux tariff without PV or storage. This is not a claim that Flux is the cheapest available no-solar tariff.

Phil explicitly set the all-in DIY capital estimate to approximately £5,000. This is the dashboard default and remains editable as one total. Phil will select and assemble the components himself. Supplier links were illustrative examples, not selected systems. No supplier kit price, contractor labour, scaffolding, administration or contingency amount is added to the £5,000. The same total is used for the three tier comparisons as a sensitivity assumption, not a quoted cost for each specification. Any optional heat-pump capital expenditure requires the user to adjust this all-in amount accordingly. The earlier invented ranges and later example-kit pricing are superseded; backups remain retained.

No grant is deducted by default. When explicitly enabled, the entered possible grant is deducted from the total and remains labelled unconfirmed.

Approximate payback bounds use lower capital / maximum annual saving and upper capital / minimum annual saving across the three historical years. No-positive-savings cases show no payback; mixed cases are uncertain. It excludes replacements, maintenance, inflation, financing, degradation, tariff changes and opportunity cost. With ASHP enabled, capital includes its installation but baseline electricity already includes its load: the result is not heating-system payback, and avoided fossil-fuel bills are absent.

The earlier approximately £5,405 kit is a hardware-only historical reference for a different link with inconsistent URL/title/variant information; it is not a complete installed quote or a guaranteed match for dashboard components. That older figure is superseded by the exact new linked-variant prices; kit quantity is not scaled down to fitted-panel quantity.

## Funding, map and omissions

`data/grants.json` is a concise extraction from `GRANTS_AND_FUNDING_RESEARCH.md`, checked there on 16 September 2026. Each card includes scheme, area, possible support, household eligibility status, date, official URL and caveat. None is a confirmed household grant. No grant is subtracted until explicitly enabled in the interface; it then remains labelled possible, not confirmed. Loan proceeds are not grant savings. SEG is not added on top of Flux export, and VAT relief is not added as a cash grant.

Map A/B and LiDAR elevations about 9.56 / 7.28 m come from the current brief. The ~21 m northwest line is not a boundary, surveyed cross-section or roof height. G is an illustrative optional point, not evidence of available land. Street maps and satellite imagery need internet access; neither establishes a boundary or exact roof surface.

Sun geometry follows [NOAA general solar position equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF), using a fractional-year approximation and explicit UTC input. Outputs are geometric elevation and clockwise-from-north azimuth; no refraction, terrain horizon, shading, cloud or irradiance is implied. It does not change annual solar estimates.

Wind remains a collapsed screening note from `WIND_RESOURCE_RESEARCH.md` and is excluded from totals. No carbon-saving output is given because the project has not supplied an agreed emissions factor and displacement baseline. Obtain roof measurements, installer quotations, heat-loss work and DNO/grant decisions before treating a scenario as actionable design.
