import {defaults, tiers, panelLayout, simulate} from './model.js';
import {initMap} from './map.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clone = value => structuredClone(value);
const num = (value, digits=0) => Number(value).toLocaleString('en-GB',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const safe = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blankCosts = () => Object.fromEntries(['hardware','installation','materials','delivery','scaffolding','electrical','admin','ashp','contingency'].map(key=>[key,key==='installation'?[0,0]:[null,null]]));
const costsByTier = {basic:blankCosts(),medium:blankCosts(),top:blankCosts()};
const componentNames={hardware:'Selected kit · VAT included',installation:'DIY fitting labour',materials:'Additional materials / hardware beyond kit',delivery:'Delivery',scaffolding:'Access / scaffolding if needed',electrical:'Outside electrical work / testing',admin:'MCS / DNO / administration if applicable',ashp:'ASHP equipment / outside work',contingency:'Your contingency'};
const kitByTier={basic:'its-one',medium:'its-one',top:'its-two'};let kits=[];let diyTotal=5000;
let state=clone(defaults),costs=clone(costsByTier.medium),profile,mapApi,ready=false,timer,grantValue=0;

function numberField(label,path,min,max,step=1,value='') {
  return `<label>${label}<input type="number" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}" ${path.endsWith('overridePanels')?'placeholder="Auto"':''}></label>`;
}
function buildControls() {
  $('#surfaces').innerHTML=state.surfaces.map((surface,i)=>`<div class="surface-control"><label class="check"><input type="checkbox" data-path="surfaces.${i}.enabled"><strong>${safe(surface.name)}</strong></label><div class="fields two">${numberField('Area cap · m²',`surfaces.${i}.areaM2`,0,500,.1)}${numberField('Usable area · %',`surfaces.${i}.usablePct`,0,100)}</div><details><summary>Dimensions, aspect & panel count</summary><div class="fields two">${numberField('Width · m',`surfaces.${i}.widthM`,0,50,.1)}${numberField('Slope length · m',`surfaces.${i}.slopeM`,0,50,.1)}${numberField('Azimuth · ° from north',`surfaces.${i}.azimuthDeg`,0,360)}${numberField('Tilt · °',`surfaces.${i}.tiltDeg`,0,90)}${numberField('Manual panel count',`surfaces.${i}.overridePanels`,0,500)}</div><p class="micro">Width and slope length define the fit rectangle; the area cap is separate. Smaller area wins. Blank count = automatic; overrides cannot exceed the provisional fit. Azimuth: east 90°, south 180°, west 270°. Front 138° is provisional; rear aspect is an unverified placeholder.</p></details></div>`).join('');
  const tariffLabels={cheapImport:'Cheap import · p/kWh',normalImport:'Normal import · p/kWh',peakImport:'Peak import · p/kWh',cheapExport:'Cheap export · p/kWh',normalExport:'Normal export · p/kWh',peakExport:'Peak export · p/kWh',standingPence:'Standing charge · p/day'};
  $('#tariff-fields').innerHTML=Object.entries(tariffLabels).map(([key,label])=>numberField(label,`tariff.${key}`,0,500,.0001)).join('');
  syncControls(); buildCosts();
}
function syncControls() {
  $$('[data-path]').forEach(el=>{const value=el.dataset.path.split('.').reduce((o,k)=>o[k],state);if(el.type==='checkbox')el.checked=!!value;else el.value=value??'';});
  $$('[data-tier]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.tier===state.tier)));
  $('[data-path="ashpAnnualKwh"]').disabled=!state.ashpEnabled;
}
function buildCosts() {
  $('#cost-inputs').innerHTML=Object.entries(componentNames).map(([key,label])=>`<tr><th scope="row">${label}${key==='ashp'&&!state.ashpEnabled?' <small>(off)</small>':''}</th>${[0,1].map(i=>`<td><input aria-label="${label} ${i?'upper':'lower'} cost" type="number" data-cost="${key}.${i}" min="0" max="200000" step=".01" value="${costs[key][i]??''}" placeholder="Not known" ${key==='ashp'&&!state.ashpEnabled?'disabled':''}></td>`).join('')}</tr>`).join('');
}
function selectedKit(tier=state.tier){return kits.find(k=>k.id===kitByTier[tier]);}
function renderKit() {
  const kit=selectedKit(); if(!kit)return;
  $('#kit-choice').value=kit.id;
  const energian=kit.supplier==='Energian';
  $('#kit-detail').innerHTML=`<p class="source-tag">Imported from supplier data · checked 16 September 2026</p><h3>${safe(kit.label)}</h3><strong class="kit-price">£${num(kit.priceIncVat,2)} <small>including VAT</small></strong><p>${energian?'RIIO SUN II 8 kW inverter. Cables and accessories included; panel mounting excluded. Supplier advertises free UK delivery.':'Solis 8 kW inverter; 20 panels, standard pitched-roof mounting and electrics pack included. Exact modules and Fogstar/Dyness battery choice need confirmation.'}</p><p>${kit.priceExVat!==null?'Listed ex-VAT price £'+num(kit.priceExVat,2)+'. ':''}${!energian?'DIY supply-only budget adds 20% VAT. Delivery not established.':''}</p><p><a href="${safe(kit.url)}" target="_blank" rel="noreferrer">Open this exact supplier variant ↗</a></p><p class="micro">${kit.panelCount} panels supplied by this package. The roof-fit controls determine how many are modelled here; unused panels are still part of the purchased kit. Any extra panels or battery capacity need a separate materials entry.</p>${energian?'<p class="winter-note">This supplier describes an off-grid inverter with mains charging. Export is set to zero in this scenario; Flux export revenue is excluded. The simulation is a grid-supported, zero-export screening model, not a verified inverter control design.</p>':'<p class="micro">The battery model uses the 16.08 kWh project assumption for each Fogstar-class battery. DIY export tariff acceptance remains unconfirmed; the chosen export limit is a planning assumption.</p>'}`;
  const exp=$('[data-path="exportLimitKw"]');exp.disabled=energian;
}
function loadKitIntoScenario() {
  const kit=selectedKit();if(!kit)return;
  costs.hardware=[kit.priceIncVat,kit.priceIncVat];
  if(kit.supplier==='Energian')costs.delivery=[0,0];else costs.delivery=[null,null];
  state.batteryKwh=kit.batteryKwh;state.inverterKw=8;state.exportLimitKw=kit.supplier==='Energian'?0:defaults.exportLimitKw;
  if(kit.supplier==='Energian'&&kit.panelCount)state.panelWattage=450;
  syncControls();buildCosts();schedule();
}
function preset(key) {
  const s=clone(state), tier=tiers[key];s.tier=key;s.batteryKwh=tier.batteryKwh;
  s.surfaces.forEach(surface=>{if(surface.id!=='ground')surface.enabled=tier.enabledSurfaces.includes(surface.id);});return s;
}
function capital(componentCosts,scenario) {
  const grant=$('#grant-enabled').checked?grantValue:0;
  return {complete:true,missing:[],lower:Math.max(0,diyTotal-grant),upper:Math.max(0,diyTotal-grant),grossLower:diyTotal,grossUpper:diyTotal,grant};
}

function payback(cap,result) {
  if(!cap.complete)return 'Awaiting costs';
  const low=result.ranges.saving.min,high=result.ranges.saving.max;
  if(high<=0)return 'No payback';
  if(low<=0)return `${num(cap.lower/high,1)}+ years; uncertain`;
  return `${num(cap.lower/high,1)}–${num(cap.upper/low,1)} years`;
}
function renderChart(result) {
  const W=760,H=258,left=48,right=8,top=14,bottom=31,plotH=H-top-bottom;
  const maximum=Math.max(100,...result.monthly.flatMap(m=>[m.pvKwh,m.loadKwh]));
  const ceiling=Math.ceil(maximum/200)*200,step=(W-left-right)/12;
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Average monthly solar generation and electricity demand</title><desc id="chart-desc">Green bars show solar generation; amber bars show total household electricity demand. The accessible monthly table contains all figures.</desc>`;
  for(let i=0;i<=4;i++){const value=ceiling*i/4,y=top+plotH*(1-i/4);svg+=`<line x1="${left}" x2="${W-right}" y1="${y}" y2="${y}" stroke="#d8decf"/><text x="${left-9}" y="${y+4}" text-anchor="end" fill="#53665d" font-size="10">${num(value)}</text>`;}
  result.monthly.forEach((m,i)=>{const x=left+i*step+step*.18,bw=step*.28;for(const [key,offset,colour,label] of [['pvKwh',0,'#256d61','Solar'],['loadKwh',bw+3,'#e2b85b','Demand']]){const height=m[key]/ceiling*plotH;svg+=`<rect x="${x+offset}" y="${top+plotH-height}" width="${bw}" height="${height}" fill="${colour}" rx="1"><title>${m.label} ${label}: ${num(m[key])} kWh</title></rect>`;}svg+=`<text x="${left+i*step+step*.5}" y="${H-9}" text-anchor="middle" fill="#53665d" font-size="11">${m.label}</text>`;});
  $('#monthly-chart').innerHTML=svg+'</svg>';
  $('#monthly-table').innerHTML=result.monthly.map(m=>`<tr><th scope="row">${m.label}</th><td>${num(m.pvKwh)}</td><td>${num(m.ranges.pvKwh.min)}–${num(m.ranges.pvKwh.max)}</td><td>${num(m.loadKwh)}</td><td>${num(m.importKwh)}</td><td>${num(m.exportKwh)}</td></tr>`).join('');
}
function renderEnergy(result) {
  const a=result.annual,r=result.ranges;
  const metric=(label,value,unit,note)=>`<div class="metric"><span class="metric-label">${label}</span><strong>${value} <small>${unit}</small></strong><small>${note}</small></div>`;
  $('#metrics').innerHTML=metric('Installed solar capacity',num(result.pvKwp,2),'kWp',`${result.panelCount} panels · provisional layout`)+metric('Solar electricity / year',num(a.pvKwh),'kWh',`${num(r.pvKwh.min)}–${num(r.pvKwh.max)} across 3 years`)+metric('Household electricity / year',num(a.loadKwh),'kWh',state.ashpEnabled?`Includes ${num(a.ashpKwh)} kWh heat pump`:'Heat pump not included')+metric('Annual electricity bill',money(a.totalCost),'',`Includes ${money(a.standingCost)} standing charge`);
  const details=[['Grid import',`${num(a.importKwh)} kWh`],['Grid export',`${num(a.exportKwh)} kWh`],['Solar kept on site',`${num(a.selfConsumptionPct)}%`],['Demand met by solar',`${num(a.coveragePct)}%`],['Solar into battery (AC)',`${num(a.chargeKwh)} kWh`],['Grid into battery (AC)',`${num(a.gridChargeKwh)} kWh`],['Battery to house (AC)',`${num(a.batteryKwh)} kWh`],['Storage conversion losses',`${num(a.lossKwh)} kWh`],['Curtailed / clipped solar',`${num(a.curtailKwh)} kWh`],['Usable battery window',`${num(result.diagnostics.batteryCapacityKwh,1)} kWh`],['Protected reserve (within window)',`${num(result.diagnostics.reserveKwh,1)} kWh`],['Heat-pump electricity added',`${num(a.ashpKwh)} kWh`]];
  $('#energy-details').innerHTML=details.map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#layout-results').innerHTML=result.surfaces.map(s=>`<div class="layout-row"><div class="roof-sketch" aria-hidden="true" style="grid-template-columns:repeat(${Math.max(1,Math.min(s.cols,10))},1fr)">${Array.from({length:Math.min(s.selectedCount,60)},()=>'<i></i>').join('')||'—'}</div><div><h4>${safe(s.name)} · ${s.selectedCount} panels / ${num(s.capacityKwp,2)} kWp ${!s.enabled?'(off)':''}</h4><p>Area-only capacity: ${s.theoreticalCount} panels (${num(s.theoreticalCount*state.panelWattage/1000,2)} kWp). Layout-adjusted: ${s.layoutCount} (${num(s.layoutCount*state.panelWattage/1000,2)} kWp).</p><p>Rectangle ${num(s.widthM,1)} × ${num(s.slopeM,1)} m · up to ${s.rows} rows × ${s.cols} columns, ${s.rotation}; count also capped by usable area.</p><small>Illustrative module grid, not a roof plan. Yield multiplier ${num(s.yieldFactor*100)}% of the saved optimum profile; a rough screening assumption that retains its hourly timing.</small></div></div>`).join('');
  const warnings=[...result.warnings];
  if(state.reserveKwh>result.diagnostics.batteryCapacityKwh)warnings.push('Reserve exceeds the usable battery window. It has been capped at that window, leaving no energy available to discharge.');
  if(Object.values(costs).some(([lo,hi])=>lo!==null&&hi!==null&&lo>hi))warnings.push('A lower cost exceeds its upper cost. The displayed capital range uses the smaller and larger entries in order; correct the input labels.');
  if(!result.pvKwp)warnings.push('No panels fit the enabled surfaces. This scenario currently has no solar generation.');
  $('#warnings').innerHTML=warnings.map(w=>`<p class="warning">${safe(w)}</p>`).join('');renderChart(result);
}
function renderFinance(result) {
  const a=result.annual,cap=capital(costs,state);
  const item=(label,value,note='',klass='')=>`<div class="${klass}"><span>${label}</span><strong>${value}</strong>${note?`<small>${note}</small>`:''}</div>`;
  $('#finance').innerHTML=item('Annual import cost',money(a.importCost),'Electricity bought, including battery charging')+item('Annual export revenue',money(a.exportRevenue),'Surplus solar only; not guaranteed income')+item('Net energy cost',money(a.netCost),'Import cost minus export revenue; before standing charge')+item('Annual standing charge',money(a.standingCost),`${num(state.tariff.standingPence,2)}p per day`)+item('Total DIY capital outlay',money(cap.lower),cap.complete?(cap.grant?`${money(cap.grant)} possible grant included — possible, not confirmed`:'No grant deducted'):`Missing cost ranges: ${cap.missing.join(', ')}. No total or payback is calculated.`)+item('Approximate simple payback',payback(cap,result),cap.complete?'Your total DIY budget divided by the three weather-year savings range':'Enter the applicable cost ranges first. Blank does not mean free.','payback')+item('Annual saving vs same-load Flux baseline',money(a.saving),`Baseline bill ${money(a.baselineCost+a.standingCost)}; current bill ${money(a.totalCost)}`)+item('Across the three weather years',`${money(result.ranges.totalCost.min)}–${money(result.ranges.totalCost.max)}`,'Annual bill including standing; not a forecast interval');
}
function update() {
  if(!ready)return;
  const current=simulate(state,profile);renderEnergy(current);renderFinance(current);mapApi?.setGround(state.surfaces[2].enabled&&state.surfaces[2].areaM2>0);
  $('#comparison').innerHTML=Object.keys(tiers).map(key=>{
    const selected=key===state.tier,s=selected?state:preset(key),result=selected?current:simulate(s,profile),cap=capital(selected?costs:costsByTier[key],s);
    $(`#tier-${key}`).textContent=`${num(result.pvKwp,1)} kWp`;
    return `<tr class="${selected?'selected-row':''}"><th scope="row">${tiers[key].label}${selected?' · current':''}</th><td>${num(result.pvKwp,2)}</td><td>${num(s.batteryKwh,2)}</td><td>${num(result.annual.pvKwh)}</td><td>${money(result.annual.totalCost)}</td><td>${money(cap.lower)}</td><td>${payback(cap,result)}</td></tr>`;
  }).join('');
  $('#load-status').textContent='Updated · 26,280 hourly records · 2021–2023 annual averages · £5,000 DIY budget supplied by Phil · editable · reload resets edits';
}
function schedule(){clearTimeout(timer);timer=setTimeout(update,140);}
document.addEventListener('change',e=>{
  const el=e.target;if(!el.matches('[data-path]'))return;
  if(el.type!=='checkbox'&&(!el.checkValidity()||(el.value===''&&!el.dataset.path.endsWith('overridePanels')))){syncControls();return;}
  const path=el.dataset.path.split('.'),key=path.pop(),target=path.reduce((o,k)=>o[k],state);
  target[key]=el.type==='checkbox'?el.checked:el.value===''&&key==='overridePanels'?null:Number(el.value);
  if(el.dataset.path==='surfaces.2.areaM2'&&target.areaM2>0&&target.widthM===0){target.widthM=5;target.slopeM=target.areaM2/5;target.enabled=true;syncControls();}
  if(key==='ashpEnabled'){syncControls();buildCosts();}
  schedule();
});
document.addEventListener('input',e=>{
  const el=e.target;if(el.matches('[data-cost]')&&el.checkValidity()){const [key,index]=el.dataset.cost.split('.');costs[key][index]=el.value===''?null:Number(el.value);schedule();}
  if(el.id==='grant-amount'&&el.checkValidity()&&el.value!==''){grantValue=Number(el.value);schedule();}
});
$('#grant-enabled').addEventListener('change',()=>{$('#grant-amount').disabled=!$('#grant-enabled').checked;schedule();});
$$('[data-tier]').forEach(button=>button.addEventListener('click',()=>{costsByTier[state.tier]=clone(costs);state=preset(button.dataset.tier);costs=clone(costsByTier[state.tier]);syncControls();buildCosts();schedule();}));
$('#reset').addEventListener('click',()=>{state=clone(defaults);diyTotal=5000;$('#diy-total').value=5000;Object.keys(costsByTier).forEach(key=>{kitByTier[key]=key==='top'?'its-two':'its-one';costsByTier[key]=blankCosts();const k=selectedKit(key);if(k)costsByTier[key].hardware=[k.priceIncVat,k.priceIncVat];});costs=clone(costsByTier.medium);grantValue=0;$('#grant-enabled').checked=false;$('#grant-amount').value=0;$('#grant-amount').disabled=true;syncControls();buildCosts();mapApi?.reset();update();});

$('#diy-total').addEventListener('input',e=>{if(e.target.value!==''&&e.target.checkValidity()){diyTotal=Number(e.target.value);schedule();}});
buildControls();
if(window.matchMedia('(max-width:760px)').matches)$$('.controls>details').forEach(el=>el.open=false);
try {
  const responses=await Promise.all([fetch('./data/solar-profile.json'),fetch('./data/grants.json'),fetch('./data/its-kits.json'),fetch('./data/energian-kits.json')]);
  if(responses.some(r=>!r.ok))throw new Error('A local data file could not be loaded.');
  const [solar,grants,its,energian]=await Promise.all(responses.map(r=>r.json()));profile=solar;kits=[...its,...energian.map(k=>({...k,label:'Energian · '+k.label,supplier:'Energian'}))];
  $('#grants').innerHTML=grants.map(g=>`<article class="grant-card"><h3>${safe(g.name)}</h3><span class="grant-status">Eligibility: ${safe(g.status)}</span><p>${safe(g.area)} · ${safe(g.support)}</p><p>${safe(g.caveat)}</p><small>Last checked ${safe(g.checked)} · <a href="${safe(g.url)}" target="_blank" rel="noreferrer">Official source ↗</a></small></article>`).join('');
  mapApi=initMap();ready=true;update();
}catch(error){$('#load-status').textContent=`Could not start the notebook: ${error.message} Serve this folder over local HTTP using the README instructions.`;console.error(error);}
