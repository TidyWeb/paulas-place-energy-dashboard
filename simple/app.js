import { simulate, defaults } from './model.js';

const FRONT_FIT = 6;           // panels the provisional front roof holds (model.js geometry)
const MAX_PANELS = 40;
// Panels beyond the front roof go on the rear/ground area, sized large enough
// that the chosen count is never capped. Its real size is not yet known.
const EXTRA = { name: 'Rear / ground', areaM2: 500, widthM: 25, slopeM: 20 };
const START = { panels: '10', battery: '16.08', usage: '8', heat: 'off', night: 'on', peak: 'on',
  watt: 450, budget: 5000, ashp: 3000, exportKw: '3.68' };
let pick = { ...START };
let profile = null;

const $ = id => document.getElementById(id);
const gbp = v => (v < 0 ? '−' : '') + '£' + Math.round(Math.abs(v)).toLocaleString('en-GB');

function inputs() {
  const n = Number(pick.panels);
  const front = Math.min(n, FRONT_FIT), extra = n - front;
  const surfaces = defaults.surfaces.map(s => {
    if (s.id === 'front') return { ...s, enabled: front > 0, overridePanels: front };
    if (s.id === 'rear') return { ...s, ...EXTRA, enabled: extra > 0, overridePanels: extra };
    return { ...s, enabled: false };
  });
  return {
    panelWattage: pick.watt,
    surfaces,
    batteryKwh: Number(pick.battery),
    baseDailyKwh: Number(pick.usage),
    ashpEnabled: pick.heat === 'on',
    ashpAnnualKwh: pick.ashp,
    gridCharge: pick.night === 'on',
    peakExport: pick.peak === 'on',
    exportLimitKw: Number(pick.exportKw),
  };
}

function syncTiles() {
  document.querySelectorAll('.group').forEach(g => {
    const key = g.dataset.key;
    g.querySelectorAll('.tiles button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.value === pick[key]));
    });
    if (key === 'night' || key === 'peak') g.classList.toggle('dim', pick.battery === '0');
  });
  const n = Number(pick.panels);
  $('r-panels').textContent = `${n} panel${n === 1 ? '' : 's'}`;
  $('r-kwp').textContent = `${(n * pick.watt / 1000).toFixed(1)} kWp · ${Math.min(n, FRONT_FIT)} front, ${Math.max(0, n - FRONT_FIT)} back/ground`;
  $('pan-down').disabled = n <= 0;
  $('pan-up').disabled = n >= MAX_PANELS;
  $('f-watt').value = String(pick.watt);
  $('f-budget').value = pick.budget;
  $('f-ashp').value = pick.ashp;
  $('r-budget').textContent = gbp(pick.budget);
}

function pop(el, text) {
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

function render() {
  syncTiles();
  if (!profile) return;
  const r = simulate(inputs(), profile);
  const a = r.annual;
  const before = a.baselineCost + a.standingCost;
  const after = a.totalCost;
  const saving = before - after;

  pop($('r-bill'), gbp(Math.abs(after)));
  $('r-bill-was').textContent = `bill was ${gbp(before)} with no panels`;
  $('r-bill').classList.toggle('credit', after < 0);
  $('r-bill-label').textContent = after < 0 ? 'Grid pays you per year' : 'Electricity bill per year';
  pop($('r-save'), gbp(saving));
  document.querySelector('.card.save').classList.toggle('loss', saving < 0);
  $('r-export').textContent = a.peakExportRevenue > 0.5
    ? `includes ${gbp(a.exportRevenue)} for power sold, ${gbp(a.peakExportRevenue)} of it from the battery at the evening peak`
    : `includes ${gbp(a.exportRevenue)} paid for power sent to the grid`;
  const sun = Math.round(a.coveragePct);
  pop($('r-sun'), sun + '%');
  $('r-sun-bar').style.width = Math.min(100, sun) + '%';
  const years = saving > 0 ? pick.budget / saving : Infinity;
  pop($('r-pay'), Number.isFinite(years) ? `${years.toFixed(1)} years` : 'Never');

  drawChart(r.monthly);
  $('tip').textContent = tipFor(saving);
}

function drawChart(months) {
  const max = Math.max(...months.flatMap(m => [m.pvKwh, m.loadKwh]));
  $('chart').innerHTML = months.map(m => `
    <div class="col" title="${m.label}: sun ${Math.round(m.pvKwh)} kWh, use ${Math.round(m.loadKwh)} kWh">
      <div class="bars">
        <i class="b-sun" style="height:${m.pvKwh / max * 100}%"></i>
        <i class="b-use" style="height:${m.loadKwh / max * 100}%"></i>
      </div>
      <span>${m.label[0]}</span>
    </div>`).join('');
}

// One plain-English hint, comparing against the next battery option.
function tipFor(saving) {
  if (pick.battery !== '0' && pick.peak === 'off') {
    const extra = savingFor({ peak: 'on' }) - saving;
    if (extra > 20) return `Selling stored power at the 4–7pm peak would add about ${gbp(extra)} a year.`;
  }
  if (pick.battery === '0') {
    const withOne = savingFor({ battery: '16.08' });
    return `Adding one battery would save about ${gbp(withOne - saving)} more a year.`;
  }
  if (pick.battery === '16.08') {
    const withTwo = savingFor({ battery: '32.16' });
    const extra = withTwo - saving;
    return extra < 50
      ? `A second battery would only add about ${gbp(extra)} a year here — one is plenty for this many panels.`
      : `A second battery would add about ${gbp(extra)} a year.`;
  }
  const withOne = savingFor({ battery: '16.08' });
  return `Dropping to one battery would only cost about ${gbp(saving - withOne)} a year in savings.`;
}

function savingFor(change) {
  const keep = pick; pick = { ...pick, ...change };
  const a = simulate(inputs(), profile).annual;
  pick = keep;
  return a.baselineCost + a.standingCost - a.totalCost;
}

document.querySelectorAll('.group').forEach(g => {
  g.addEventListener('click', e => {
    const b = e.target.closest('.tiles button');
    if (!b) return;
    pick[g.dataset.key] = b.dataset.value;
    render();
  });
});
const panels = d => {
  pick.panels = String(Math.min(MAX_PANELS, Math.max(0, Number(pick.panels) + d)));
  render();
};
$('pan-down').onclick = () => panels(-1);
$('pan-up').onclick = () => panels(1);
$('f-watt').addEventListener('change', e => { pick.watt = Number(e.target.value); render(); });
const step = d => { pick.budget = Math.max(0, pick.budget + d); render(); };
$('bud-down').onclick = () => step(-500);
$('bud-up').onclick = () => step(500);
const num = (id, key) => $(id).addEventListener('change', e => {
  const v = Number(e.target.value);
  if (Number.isFinite(v) && v >= 0) pick[key] = v;
  render();
});
num('f-budget', 'budget'); num('f-ashp', 'ashp');
$('reset').onclick = () => { pick = { ...START }; render(); };

render();
fetch('data/solar-profile.json')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(p => { profile = p; $('status').hidden = true; render(); })
  .catch(() => {
    $('status').textContent = 'Could not load the solar data. Start it with: python3 -m http.server 8766 (see README).';
  });
