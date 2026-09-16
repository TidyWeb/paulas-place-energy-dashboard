/** Transparent hourly comparison model; see DATA_PROVENANCE.md for limitations.
 * Inputs use metres, kWh, kW and tariff pence/kWh. Outputs use kWh and pounds.
 * PVGIS output already includes 14% system loss: do not apply it a second time.
 */
export const tiers = {
  basic: { label: 'Basic', batteryKwh: 16.08, enabledSurfaces: ['front'] },
  medium: { label: 'Medium', batteryKwh: 16.08, enabledSurfaces: ['front', 'rear'] },
  top: { label: 'Top-class', batteryKwh: 32.16, enabledSurfaces: ['front', 'rear'] },
};
export const defaults = {
  tier: 'medium', panelWattage: 450, panelLengthM: 1.762, panelWidthM: 1.134, panelGapM: 0.02,
  surfaces: [
    { id: 'front', name: 'Front roof', enabled: true, areaM2: 18, widthM: 6, slopeM: 3, usablePct: 85, azimuthDeg: 138, tiltDeg: 38, overridePanels: null },
    { id: 'rear', name: 'Rear outbuildings', enabled: true, areaM2: 12, widthM: 4, slopeM: 3, usablePct: 85, azimuthDeg: 138, tiltDeg: 20, overridePanels: null },
    { id: 'ground', name: 'Ground array', enabled: false, areaM2: 0, widthM: 0, slopeM: 0, usablePct: 85, azimuthDeg: 180, tiltDeg: 35, overridePanels: null },
  ],
  baseDailyKwh: 8, ashpEnabled: false, ashpAnnualKwh: 3000,
  batteryKwh: 16.08, batteryUsablePct: 90, reserveKwh: 1, batteryPowerKw: 5,
  chargeEfficiency: 0.95, dischargeEfficiency: 0.95, inverterKw: 8, exportLimitKw: 3.68, gridCharge: true,
  tariff: { cheapImport: 16.08, normalImport: 26.79, peakImport: 37.52, cheapExport: 5.124, normalExport: 10.5442, peakExport: 30.6829, standingPence: 68 },
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = value => Math.max(0, number(value));
const degrees = value => value * Math.PI / 180;
/** Whole uniform portrait and landscape grids, capped by usable area.
 * Usable-area percentage is an area allowance, not a mapped setback survey.
 * A manual override may reduce the modeled count but cannot exceed fit.
 */
export function panelLayout(surface, state = defaults) {
  const width = positive(surface.widthM), slope = positive(surface.slopeM);
  const length = Math.max(0.1, number(state.panelLengthM, 1.762));
  const breadth = Math.max(0.1, number(state.panelWidthM, 1.134));
  const gap = positive(state.panelGapM ?? 0.02), moduleAreaM2 = length * breadth;
  const area = positive(surface.areaM2);
  const usableAreaM2 = Math.min(area, width * slope) * clamp(number(surface.usablePct, 85), 0, 100) / 100;
  const theoreticalCount = Math.floor((area * clamp(number(surface.usablePct, 85), 0, 100) / 100 + 1e-9) / moduleAreaM2);
  const areaCount = Math.floor((usableAreaM2 + 1e-9) / moduleAreaM2);
  const options = [
    { rotation: 'portrait', cols: Math.floor((width + gap) / (breadth + gap)), rows: Math.floor((slope + gap) / (length + gap)) },
    { rotation: 'landscape', cols: Math.floor((width + gap) / (length + gap)), rows: Math.floor((slope + gap) / (breadth + gap)) },
  ].map(o => ({ ...o, count: Math.min(o.rows * o.cols, areaCount) }));
  options.sort((a, b) => b.count - a.count);
  const best = options[0], layoutCount = best.count;
  const manual = surface.overridePanels === null || surface.overridePanels === undefined || surface.overridePanels === '' ? null : Math.floor(positive(surface.overridePanels));
  const selectedCount = surface.enabled === false ? 0 : Math.min(layoutCount, manual ?? layoutCount);
  const warnings = [];
  if (Math.abs(width * slope - area) > 0.1) warnings.push('Area and rectangle differ; the smaller area limits the layout.');
  if (manual !== null && manual > layoutCount) warnings.push('Requested panel count exceeds the provisional fit and has been capped.');
  if (theoreticalCount > layoutCount) warnings.push('Panel dimensions and row spacing reduce the area-only panel estimate.');
  return { rows: best.rows, cols: best.cols, rotation: best.rotation, theoreticalCount, layoutCount, selectedCount, moduleAreaM2, usableAreaM2, capacityKwp: selectedCount * positive(state.panelWattage) / 1000, warnings };
}
/** Deliberately approximate annual orientation/tilt multiplier, NOT irradiance transposition.
 * Retains the reference hourly shape; it does not shift sunrise or east/west timing.
 * Compass bearings: north=0, east=90, south=180, west=270.
 */
export function surfaceYieldFactor(surface, profile) {
  const tilt = clamp(number(surface.tiltDeg, 38), 0, 90);
  const aspect = number(surface.azimuthDeg, 180);
  const refTilt = number(profile.referenceTiltDeg, 38);
  const refAspect = number(profile.referenceAzimuthDeg, 182);
  const aspectPenalty = 0.42 * (1 - Math.cos(degrees(aspect - refAspect))) * Math.sin(degrees(tilt));
  const tiltPenalty = 0.30 * Math.sin(degrees(Math.abs(tilt - refTilt)));
  return clamp((1 - aspectPenalty) * (1 - tiltPenalty), 0.15, 1);
}
const baseShape = [0.1,0.1,0.1,0.1,0.1,0.1,0.25,0.25,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.25,0.25,0.5,0.5,0.5,0.5,0.5,0.3];
const shapeSum = baseShape.reduce((a,b) => a+b, 0);
// Assumed space/water-heating demand allocation, summing to 1. Winter-heavy,
// not a heat-loss calculation or a COP prediction. Summer includes hot water.
export const heatPumpMonthlyWeights = [0.16,0.14,0.12,0.08,0.05,0.025,0.025,0.03,0.055,0.08,0.105,0.13];
function ukHour(timestamp) {
  const date = new Date(timestamp), year = date.getUTCFullYear();
  const lastSunday = month => { const d = new Date(Date.UTC(year, month + 1, 0, 1)); return d.getTime() - d.getUTCDay()*86400000; };
  const summer = timestamp >= lastSunday(2) && timestamp < lastSunday(9);
  return (date.getUTCHours() + (summer ? 1 : 0)) % 24;
}
export function tariffPeriod(hour) { return hour >= 2 && hour < 5 ? 'cheap' : hour >= 16 && hour < 19 ? 'peak' : 'normal'; }
const energyKeys = ['pvKwh','loadKwh','importKwh','exportKwh','directKwh','chargeKwh','gridChargeKwh','batteryKwh','batterySolarKwh','lossKwh','curtailKwh','importCost','exportRevenue','standingCost','baselineCost','ashpKwh'];
const blank = () => Object.fromEntries(energyKeys.map(k => [k, 0]));
function finish(values) {
  const v = { ...values };
  v.netCost = v.importCost - v.exportRevenue;
  v.totalCost = v.netCost + v.standingCost;
  v.saving = v.baselineCost - v.netCost;
  v.coveragePct = v.loadKwh ? (v.directKwh + v.batterySolarKwh) / v.loadKwh * 100 : 0;
  v.selfConsumptionPct = v.pvKwh ? (v.directKwh + v.chargeKwh) / v.pvKwh * 100 : 0;
  return v;
}
/** simulate(state,profile)
 * annual: mean annual result; years: individual year results; monthly: 12 means.
 * ranges: {metric:{min,max}} across source years; monthly[].ranges analogous.
 * Grid import includes grid charging. PV charge is AC input, battery output AC.
 * Coverage counts renewable energy delivered to load; self consumption includes
 * solar storage losses. netCost excludes standing; totalCost includes it.
 */
export function simulate(input, profile) {
  if (!Array.isArray(profile?.values) || !profile.values.length) throw new Error('Solar profile has no hourly values.');
  const state = { ...defaults, ...input, tariff: { ...defaults.tariff, ...input?.tariff } };
  if (profile.stepHours !== 1) throw new Error('This dispatch model requires one-hour profile intervals.');
  const surfaces = state.surfaces.map(surface => ({ ...surface, ...panelLayout(surface, state), yieldFactor: surfaceYieldFactor(surface, profile) }));
  const pvKwp = surfaces.reduce((sum, s) => sum + s.capacityKwp, 0);
  const weightedKwp = surfaces.reduce((sum, s) => sum + s.capacityKwp * s.yieldFactor, 0);
  const panelCount = surfaces.reduce((sum, s) => sum + s.selectedCount, 0);
  const n = profile.values.length, start = Date.parse(profile.startUtc);
  if (!Number.isFinite(start)) throw new Error('Solar profile start time is invalid.');
  const load = new Float64Array(n), solar = new Float64Array(n);
  const meta = [], monthlyHours = new Map(), monthlyShape = new Map();
  for (let i=0;i<n;i++) {
    const time = start + i*3600000, date = new Date(time), hour = ukHour(time);
    // Group by UTC weather year/month for complete source periods; use UK local
    // hour for household shape and tariff windows, including BST transitions.
    const year = date.getUTCFullYear(), month = date.getUTCMonth(), key = `${year}-${month}`;
    meta.push({ year, month, hour, key, period: tariffPeriod(hour) });
    monthlyHours.set(key, (monthlyHours.get(key) || 0) + 1);
    monthlyShape.set(key, (monthlyShape.get(key) || 0) + baseShape[hour]);
  }
  for (let i=0;i<n;i++) {
    const m = meta[i], days = monthlyHours.get(m.key)/24;
    const heat = state.ashpEnabled ? positive(state.ashpAnnualKwh) * heatPumpMonthlyWeights[m.month] / monthlyHours.get(m.key) : 0;
    // Normalize each month for BST so stated daily household demand is exact.
    load[i] = positive(state.baseDailyKwh) * days * baseShape[m.hour] / monthlyShape.get(m.key) + heat;
    solar[i] = positive(profile.values[i]) / 1000 * weightedKwp;
  }
  const capacity = positive(state.batteryKwh) * clamp(number(state.batteryUsablePct), 0, 100)/100;
  const reserve = Math.min(capacity, positive(state.reserveKwh));
  const chargeEfficiency = clamp(number(state.chargeEfficiency, .95), .01, 1);
  const dischargeEfficiency = clamp(number(state.dischargeEfficiency, .95), .01, 1);
  const power = positive(state.batteryPowerKw), inverter = positive(state.inverterKw);
  const yearTotals = new Map(), monthTotals = new Map();
  let soc = reserve, solarSoc = 0, initialSoc = soc;
  let minimumSoc = soc, maximumSoc = soc, maximumCharge = 0, maximumDischarge = 0;
  for (let i=0;i<n;i++) {
    const m = meta[i], pv = solar[i], availablePv = Math.min(pv, inverter);
    const direct = Math.min(availablePv, load[i]);
    let remaining = load[i] - direct, surplus = availablePv - direct;
    const solarCharge = Math.min(surplus, power, Math.max(0,(capacity-soc)/chargeEfficiency));
    soc += solarCharge*chargeEfficiency; solarSoc += solarCharge*chargeEfficiency; surplus -= solarCharge;
    let gridCharge = 0;
    if (state.gridCharge && m.period === 'cheap' && power > 0) {
      let forecastNet = 0;
      // Perfect-forecast benchmark adapted from the original project controller.
      // No deliberate export from storage and no charge beyond the next window.
      for(let j=i+1;j<Math.min(i+26,n);j++) {
        if(meta[j].hour===2 && meta[j-1].hour!==2) break;
        if(meta[j].period!=='cheap') forecastNet += Math.max(0,load[j]-Math.min(solar[j],inverter));
      }
      const target = Math.min(capacity, reserve + forecastNet/dischargeEfficiency);
      gridCharge = Math.min(Math.max(0,power-solarCharge), Math.max(0,inverter-availablePv), Math.max(0,(target-soc)/chargeEfficiency));
      soc += gridCharge*chargeEfficiency;
    }
    // During cheap grid charging, the household buys cheap power directly.
    const discharge = state.gridCharge && m.period==='cheap' ? 0 : Math.min(remaining,power,Math.max(0,inverter-availablePv),Math.max(0,soc-reserve)*dischargeEfficiency);
    const solarShare = soc > reserve ? clamp(solarSoc/(soc-reserve),0,1) : 0;
    const solarDischarge = discharge*solarShare;
    solarSoc = Math.max(0,solarSoc-solarDischarge/dischargeEfficiency);
    soc -= discharge/dischargeEfficiency; remaining -= discharge;
    const exportKwh = Math.min(surplus,positive(state.exportLimitKw));
    const imported = remaining+gridCharge;
    const price = number(state.tariff[`${m.period}Import`])/100;
    const exportPrice = number(state.tariff[`${m.period}Export`])/100;
    const metrics = {
      pvKwh:pv,loadKwh:load[i],importKwh:imported,exportKwh,directKwh:direct,
      chargeKwh:solarCharge,gridChargeKwh:gridCharge,batteryKwh:discharge,batterySolarKwh:solarDischarge,
      lossKwh:(solarCharge+gridCharge)*(1-chargeEfficiency)+discharge*(1/dischargeEfficiency-1),
      curtailKwh:pv-availablePv+surplus-exportKwh,importCost:imported*price,exportRevenue:exportKwh*exportPrice,
      standingCost:number(state.tariff.standingPence)/100/24,baselineCost:load[i]*price,
      ashpKwh:state.ashpEnabled ? positive(state.ashpAnnualKwh)*heatPumpMonthlyWeights[m.month]/monthlyHours.get(m.key) : 0,
    };
    if(!yearTotals.has(m.year))yearTotals.set(m.year,blank());
    if(!monthTotals.has(m.key))monthTotals.set(m.key,blank());
    for(const k of energyKeys) { yearTotals.get(m.year)[k]+=metrics[k];monthTotals.get(m.key)[k]+=metrics[k]; }
    minimumSoc=Math.min(minimumSoc,soc);maximumSoc=Math.max(maximumSoc,soc);
    maximumCharge=Math.max(maximumCharge,solarCharge+gridCharge);maximumDischarge=Math.max(maximumDischarge,discharge);
  }
  const years = [...yearTotals.entries()].map(([year,values]) => ({year,...finish(values)}));
  const mean = records => finish(Object.fromEntries(energyKeys.map(k => [k,records.reduce((s,r)=>s+r[k],0)/records.length])));
  const spread = records => Object.fromEntries(Object.keys(finish(blank())).map(k => [k,{min:Math.min(...records.map(r=>r[k])),max:Math.max(...records.map(r=>r[k]))}]));
  const annual = mean(years), ranges = spread(years);
  const monthly = Array.from({length:12},(_,month) => {
    const rows = years.map(y=>monthTotals.get(`${y.year}-${month}`)).filter(Boolean).map(finish);
    return {month:month+1,label:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month],...mean(rows),ranges:spread(rows)};
  });
  return {
    annual, monthly, years, ranges, surfaces, panelCount, pvKwp,
    diagnostics:{initialSocKwh:initialSoc,finalSocKwh:soc,minimumSocKwh:minimumSoc,maximumSocKwh:maximumSoc,batteryCapacityKwh:capacity,reserveKwh:reserve,maximumChargeKwh:maximumCharge,maximumDischargeKwh:maximumDischarge,hours:n},
    warnings:surfaces.flatMap(s=>s.warnings.map(w=>`${s.name}: ${w}`)),
    assumptions:[
      '2021–2023 PVGIS modelled weather; annual figures are three-year means, ranges are weather-year variation, not prediction intervals.',
      'Reference PVGIS point differs from the property anchor. Orientation and tilt use a rough annual multiplier while retaining the reference hourly shape; shading and roof geometry require a site survey.',
      'Uniform panel grids use provisional dimensions, a 20 mm module gap and an area allowance. This is not a surveyed setback or structural design.',
      state.gridCharge ? 'Cheap grid charging uses a perfect historical solar forecast: optimistic benchmark, not a real controller guarantee.' : 'House-first storage charges only from solar; original project results included overnight grid charging.',
      'Battery reserve is enforced. Charge/discharge losses, battery power, shared inverter and export limits apply; no deliberate battery export.',
      'ASHP electricity, when enabled, uses an assumed winter-heavy monthly allocation; it is not a heat-loss or seasonal-efficiency calculation.',
      'Flux rates are the editable 15 September 2026 planning snapshot. Savings compare the same electric load on those Flux rates without solar/storage; gas savings, financing and degradation are excluded.',
    ],
  };
}
