# Source reconciliation for Paula’s Place

This note separates the user’s current provisional property inputs from earlier resource data and modelling assumptions. It is an evidence record, not a site survey, installation design, grant decision or quotation. Original research files remain unchanged.

## Property location and roof direction

The current request names **2 Mersey Street, Borth-y-Gest**, with front anchor **A: 52.91556, −4.13733**, provisional rear point **B: 52.91570, −4.13754**, provisional front roof area **18 m²**, and tentative front aspect **138° clockwise from true north**. These current inputs take precedence for the dashboard’s property markers and editable assumptions. A and B are not measured building corners or a roof-area survey.

Earlier files use two different resource points: NASA POWER uses **52.9152, −4.1377** (village-centre/regional screening), while the saved PVGIS model uses **52.912431, −4.147339** (approximate postcode point). Neither should be presented as the surveyed position of number 2. The previous number-5 Mersey Street map tab was explicitly identified as incorrect for this project.

The existing PVGIS optimum is approximately **38° tilt and 2° PVGIS aspect**, essentially south-facing. PVGIS aspect uses south = 0°, east = −90° and west = +90°; the requested 138° compass bearing corresponds to approximately **−42° PVGIS aspect**. The saved south-facing hourly series is therefore an orientation reference, not a measured or newly queried southeast-facing front-roof series. Any adjustment made for the proposed front roof must be identified as an approximation until PVGIS is rerun for the actual roof and horizon.

Sources: current pasted request, working assumptions; `PROJECT_SUMMARY.md`, “Location and mapping” and “Solar”; `RESOURCES.md`, “Location assumption” and “First PVGIS result for the LL49 9UB area”; `borth_y_gest_data_notes.md`, “Location used”.

## Solar output and the earlier battery model

The saved PVGIS hourly series covers 2021–2023 (26,280 hours) for a 1 kWp reference system. The earlier hourly model scales it to 6/8/10 kWp and daily household demand of 5.6/8/12 kWh. The 6 kWp, 8 kWh/day result is approximately 5,450 kWh/year generated, 562 kWh/year imported and 2,882 kWh/year exported. These are historical simulation outputs, not measurements of the proposed installation.

The long-term PVGIS calculator estimate of approximately 873 kWh/kWp/year uses 2005–2023; the shorter 2021–2023 hourly simulation annualises to approximately 908 kWh/kWp/year. The different periods explain why these two reference yields should not be treated as interchangeable or exact matches.

The earlier model uses the historical PV series as a **perfect forecast**, which is optimistic relative to a real controller. Its assumptions include one **16.08 kWh nominal** battery, a 90% usable window, 95% charge and discharge efficiencies, a provisional 5 kW power limit and a 1 kWh reserve. It values surplus export but does not deliberately discharge the battery during the peak export window. Reported net energy costs exclude standing charge, capital, maintenance, degradation and gas. Any new ASHP scenario must state its heat demand and efficiency assumptions separately; the existing electrical-load scenarios are not evidence of measured ASHP demand.

Sources: `PROJECT_SUMMARY.md`, “Battery candidate” and “First battery/PV model”; `RESOURCES.md`, “First PVGIS result for the LL49 9UB area” and “First hourly model outputs”.

## Tariff snapshot versus future rates

The recorded **15 September 2026** standard Octopus Flux snapshot is for postcode LL49 9UB, region D. Import rates are **16.08p/kWh** from 02:00–05:00 local, **26.79p/kWh** normally, and **37.52p/kWh** from 16:00–19:00. Export rates for those periods are respectively **5.124p**, **10.5442p** and **30.6829p/kWh**. Standing charge is approximately **68p/day**. These are dated planning inputs, not guaranteed future prices or an account-specific offer.

Standard Flux is the recorded primary solar/battery candidate and is distinct from Intelligent Flux and EV-linked Go products. Export payment must be counted once: a second SEG revenue allowance must not be added to Flux export revenue. Overnight import-to-export comparisons must include losses, household use, power/export constraints and the retained reserve.

Sources: `PROJECT_SUMMARY.md`, “Octopus Flux tariff” and “Three-hour peak export calculation”; `RESOURCES.md`, “Correction: the house does not need an EV to use a battery strategy”. Official references retained by the source: [Flux](https://octopus.energy/smart/flux/), [import product](https://api.octopus.energy/v1/products/FLUX-IMPORT-23-02-14/) and [export product](https://api.octopus.energy/v1/products/FLUX-EXPORT-23-02-14/).

## Hardware listing versus installed quotation

The recorded ITS Technologies price of approximately **£5,405** is a hardware-bundle listing, not a validated whole-installation quote. Its URL describes Sunsynk/16 panels/8 kW; the recorded page title describes Solis 8 kW hybrid; the recorded variant describes 18 panels/about 9 kW and Dyness 10.24 kWh or Fogstar 16.1 kWh options. The exact panel model remains unconfirmed. Installation, scaffolding, MCS certification, DNO approval and any additional electrical work must be established separately. ECO-WORTHY and Fogstar products must not be assumed to have identical internals or compatibility because their headline voltage and capacity are similar.

No installed ASHP quotation is established by these source files. User-editable capital-cost inputs are planning scenarios unless a documented quote is supplied. Do not relabel hardware-only pricing as installed cost.

Source: `PROJECT_SUMMARY.md`, “ITS Technologies kit review” and “Battery candidate”. [Recorded product link](https://www.itstechnologies.uk/products/complete-on-or-off-grid-sunsynk-8kw-kit-16-panel-8kw-solar-10-24kwh-battery-storage-with-choice-of-panels?variant=56403703726461).

## Grants: scheme existence versus household eligibility

`data/grants.json` transcribes concise cards from `GRANTS_AND_FUNDING_RESEARCH.md`, checked **16 September 2026**. Its status values describe possible household relevance or uncertainty, never a confirmed award. Source-recorded availability is retained in the support text. No card has been newly checked live for this dashboard.

No grant is deducted automatically from base capital cost. Tenure, main-residence/holiday/business use, EPC, Council Tax band, heating fuel, household eligibility and planning/listed status remain unresolved. A Green Homes Wales loan is repayable finance, VAT is tax treatment, SEG is export revenue, and Warm Home Discount is bill support. These are distinct from a capital grant. ECO4 Flex is a route into ECO4 rather than an additional award to stack. Warm Homes: Local Grant is England-only and not applicable here. The report also records GBIS closed to new applications, FIT closed to new entrants, and social-housing programmes unavailable to an ordinary private homeowner.

Source: `GRANTS_AND_FUNDING_RESEARCH.md`, “Main Wales-wide and UK-wide schemes”, “Gwynedd- and property-type-specific possibilities”, “Schemes checked but not usable as a new Wales household application” and “What must be established before modelling grant-adjusted costs”.

## Wind remains optional screening

The NASA regional 10 m series has a mean of **6.27 m/s**, median **5.71 m/s**, and 59.1% of hours at or above 5 m/s. Recorded winter monthly means are 7.25–7.88 m/s versus 4.85–5.15 m/s in summer. This suggests seasonal complementarity, but does not establish wind speed or yield at the proposed roof.

Keep wind collapsed and separate from default solar/battery/ASHP results. An optional capacity-factor calculation is arithmetic only: rated kW × 8,760 × capacity factor. A 1 kW turbine at 5%, 10% and 20% gives 438, 876 and 1,752 kWh/year respectively; none is a prediction for this property. Credible generation estimates need hub-height conditions, turbulence and a certified power curve. The local research does not support a blanket claim that VAWT is more reliable or productive than HAWT. It records that building-mounted turbines in Wales require planning, plus structural, vibration and noise assessment.

Source: `WIND_RESOURCE_RESEARCH.md`, “What the existing local data says”, “Vertical-axis versus horizontal-axis turbines”, “Welsh planning and certification constraints” and “How wind could add to the solar-and-battery system”; `borth_y_gest_data_notes.md`, “Source”. Official references retained by the research: [Welsh wind planning](https://www.gov.wales/planning-permission-wind-turbines) and [Energy Saving Trust wind guidance](https://energysavingtrust.org.uk/advice/wind-turbines/).


## DIY fitting and replacement supplier references

Phil subsequently confirmed DIY fitting and supplied different ITS/Energian product links. The active dashboard now uses sourced kit prices plus £0 DIY labour; unknown additional costs remain blank. See `SOURCED_KIT_PRICES.md`. This supersedes the historical £5,405 kit reference for current budgeting. The Energian entry price excludes panels, and its off-grid inverter is not treated as an approved Flux-export device.


Final budget correction: Phil confirmed the supplier links were examples and set approximately £5,000 all in for his self-selected, DIY-fitted system. This single editable total supersedes all earlier contractor and example-kit capital budgets. No extra capital charges are added automatically.
