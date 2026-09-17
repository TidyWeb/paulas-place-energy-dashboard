# Verification record — 16–17 September 2026

Model regression tests passed: 26,280 source hours; physical panel fit; overrides; household and heat-pump demand; tariffs; storage reserve/power; energy accounting; zero-PV case; grid-charging toggle; inverter/export limits.

Browser interaction suite passed 27 checks before the final capital correction. Desktop, 768 px and 390 px layouts had no page-wide overflow. Map layers, sun day/night, reset and grant opt-in were checked. Screenshots were inspected for energy, funding and phone map layout; panels use content-driven heights and consistent labels.

Final capital correction: £5,000 all-in, explicitly supplied by Phil, replaces prior unsourced capital ranges and example-kit budgets. Live in-app preview verified £5,000, no grant deduction and calculated payback 5.5–5.6 years under the current model. JavaScript syntax check passed. Previous screenshots retain earlier development states; the live dashboard is authoritative.

Review gate addition: Paula’s Place palette, supplied Borth-y-Gest background with CSS blur/saturation/contrast treatment, incorrect-password feedback, correct-password unlock, session reload persistence and keyboard focus transfer were checked over local HTTP. Gate and dashboard had no console errors or page overflow at 390, 768 or 1440 px.

Dashboard switcher addition: the protected entry screen now reveals Complex dashboard and Simple dashboard choices after the shared password is accepted. The simple view is published at `/simple/`; both views carry a link to the other. Local HTTP preview checked the password failure state, successful choice reveal, simple-route navigation, reverse navigation to the complex view, simple-view data loading and no console errors.

The combined publication bundle is prepared for GitHub Pages from the repository root. Source research files preserved. The dashboard is a provisional scenario tool, with the modelling limitations documented in DATA_PROVENANCE.md.
