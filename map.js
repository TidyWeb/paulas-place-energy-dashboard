/* Leaflet 1.9.4 is vendored under vendor/ (BSD-2-Clause).
 * Solar geometry: NOAA General Solar Position Calculations,
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * Fractional-year approximation, UTC input, geometric altitude; no refraction,
 * terrain horizon, trees, roof shading, cloud cover or irradiance prediction.
 * Markers represent supplied working coordinates, not surveyed boundaries.
 */
const A = [52.91556, -4.13733];
const B = [52.91570, -4.13754];
const G = [52.91575, -4.13761]; // Illustrative planning location only.
const DEFAULT_DATE = '2026-09-16';
const DEFAULT_TIME = '12:00';
const DEG = Math.PI / 180;

export function solarPosition(date, latitude = A[0], longitude = A[1]) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const day = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = 2 * Math.PI / (leap ? 366 : 365) * (day - 1 + (hour - 12) / 24);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const solarMinutes = ((hour * 60 + equation + 4 * longitude) % 1440 + 1440) % 1440;
  const hourAngle = (solarMinutes / 4 - 180) * DEG;
  const latitudeRad = latitude * DEG;
  const sinAltitude = Math.sin(latitudeRad) * Math.sin(declination)
    + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) / DEG;
  const azimuth = (Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(latitudeRad)
    - Math.tan(declination) * Math.cos(latitudeRad)) / DEG + 180 + 360) % 360;
  return { azimuth, altitude };
}

function endpoint(origin, bearing, metres) {
  const angular = metres / 6371000;
  const lat = origin[0] * DEG;
  const lng = origin[1] * DEG;
  const heading = bearing * DEG;
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(angular)
    + Math.cos(lat) * Math.sin(angular) * Math.cos(heading));
  const nextLng = lng + Math.atan2(Math.sin(heading) * Math.sin(angular) * Math.cos(lat),
    Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat));
  return [nextLat / DEG, nextLng / DEG];
}

export function initMap() {
  const host = document.getElementById('site-map');
  const status = document.getElementById('map-status');
  const dateInput = document.getElementById('sun-date');
  const timeInput = document.getElementById('sun-time');
  const readout = document.getElementById('sun-readout');
  const setStatus = message => { if (status) status.textContent = message; };
  if (!host) return { setGround() {}, reset() {} };
  if (!window.L) {
    host.textContent = 'Map library could not load. Working anchor A: 52.91556, −4.13733; rear point B: 52.91570, −4.13754. The A–B terrain line is approximately 21 m, from 9.56 m to 7.28 m elevation. These points are not surveyed boundaries.';
    setStatus('Map unavailable. Coordinate and terrain information is retained above.');
    return { setGround() {}, reset() {} };
  }
  const L = window.L;
  host.style.minHeight = '420px';
  host.style.height = '420px';
  host.style.background = '#e7ebe4';
  const map = L.map(host, { scrollWheelZoom: false, maxZoom: 21 }).setView(A, 19);
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19, maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19, maxZoom: 21,
    attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community'
  });
  const baseMessage = 'A = property/front working anchor · B = rear point. Markers and terrain line are not a surveyed plot boundary.';
  [street, satellite].forEach(layer => {
    let tileFailure = false;
    layer.on('loading', () => { tileFailure = false; });
    layer.on('tileerror', () => {
      tileFailure = true;
      if (map.hasLayer(layer)) setStatus('Some map imagery is unavailable. Markers, terrain line and sun direction still work; try the other map layer. No surveyed plot boundary is shown.');
    });
    layer.on('load', () => { if (!tileFailure && map.hasLayer(layer)) setStatus(baseMessage); });
  });
  street.addTo(map);
  setStatus(baseMessage);
  // Expanded text control avoids Leaflet's optional image-based toggle asset.
  L.control.layers({ 'Street map': street, 'Satellite imagery': satellite }, null,
    { collapsed: false, position: 'topright' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 120 }).addTo(map);
  const markerIcon = (letter, color) => L.divIcon({
    className: 'site-point-icon',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${color};color:white;border:3px solid white;box-shadow:0 2px 9px #0005;font:bold 15px system-ui">${letter}</span>`,
    iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -19]
  });
  L.marker(A, { icon: markerIcon('A', '#184c40'), title: 'A — property and front working anchor' }).addTo(map)
    .bindPopup('<strong>A · Property / front working anchor</strong><br>52.91556, −4.13733<br>Reported ground elevation: 9.56 m.<br>Roof orientation, pitch, usable area and shading are planning assumptions, not a roof survey. A is the working anchor, not a building footprint.');
  L.marker(B, { icon: markerIcon('B', '#5f6e7b'), title: 'B — rear terrain point' }).addTo(map)
    .bindPopup('<strong>B · Rear terrain point</strong><br>52.91570, −4.13754<br>Reported ground elevation: 7.28 m.<br>A–B is approximately 21 m, with a 2.28 m fall. Supplied terrain evidence; not a site survey or plot boundary.');
  L.polyline([A, B], { color: '#435e50', weight: 3, dashArray: '6 6' }).addTo(map)
    .bindPopup('<strong>A–B terrain reference</strong><br>Approximately 21 m; elevation 9.56 → 7.28 m (fall 2.28 m). This connects two terrain reference points. It does not mark a plot edge.');
  const groundMarker = L.marker(G, { icon: markerIcon('G', '#ba7531'), title: 'Illustrative ground-array location' })
    .bindPopup('<strong>G · Illustrative ground-array location</strong><br>Position is illustrative only. Space, ownership, access, shading and permissions are unverified. This is not a proposed boundary or a surveyed installation position.');
  const northControl = L.control({ position: 'topleft' });
  northControl.onAdd = () => {
    const element = L.DomUtil.create('div', 'map-north-control');
    element.style.cssText = 'padding:9px 12px;background:white;border-radius:6px;box-shadow:0 1px 6px #0003;text-align:center;font:700 12px system-ui;color:#184c40;line-height:1.15';
    element.innerHTML = '<span aria-hidden="true" style="font-size:24px">↑</span><br>N';
    element.title = 'True north; map orientation is fixed';
    element.setAttribute('aria-label', 'True north is upward');
    return element;
  };
  northControl.addTo(map);
  const sunLine = L.polyline([], { color: '#df9c26', weight: 4, dashArray: '9 5', interactive: false }).addTo(map);
  const sunMarker = L.marker(A, { interactive: false, keyboard: false,
    icon: L.divIcon({ className: 'sun-map-icon', html: '<span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#fff4ca;border:2px solid #df9c26;border-radius:50%;font-size:20px;color:#885912">☀</span>', iconSize: [32, 32], iconAnchor: [16, 16] })
  });
  if (dateInput) dateInput.value = dateInput.value || DEFAULT_DATE;
  if (timeInput) timeInput.value = timeInput.value || DEFAULT_TIME;
  function updateSun() {
    const dateValue = dateInput?.value || '';
    const timeValue = timeInput?.value || '';
    const date = new Date(`${dateValue}T${timeValue}:00Z`);
    const position = dateValue && timeValue ? solarPosition(date) : null;
    if (!position) {
      sunLine.setLatLngs([]);
      if (map.hasLayer(sunMarker)) map.removeLayer(sunMarker);
      if (readout) readout.textContent = 'Choose a valid date and time (UTC) to show the approximate solar direction.';
      return;
    }
    const isAbove = position.altitude > 0;
    const tip = endpoint(A, position.azimuth, 36);
    sunLine.setLatLngs([A, tip]);
    sunLine.setStyle({ opacity: isAbove ? 0.9 : 0.35 });
    sunMarker.setLatLng(tip).setOpacity(isAbove ? 1 : 0.4).addTo(map);
    if (readout) readout.textContent = `${dateValue} · ${timeValue} UTC · Bearing ${position.azimuth.toFixed(0)}° from north · Solar altitude ${position.altitude.toFixed(1)}°${isAbove ? '' : ' · Below horizon'}. Approximate solar geometry only; not irradiance or a shading assessment.`;
  }
  dateInput?.addEventListener('input', updateSun);
  timeInput?.addEventListener('input', updateSun);
  document.getElementById('recenter-map')?.addEventListener('click', () => map.setView(A, 19));
  // Layout changes can otherwise leave unloaded grey strips in embedded previews.
  if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe(host);
  updateSun();
  return {
    setGround(visible) {
      if (visible) groundMarker.addTo(map);
      else if (map.hasLayer(groundMarker)) map.removeLayer(groundMarker);
    },
    reset() {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(street)) street.addTo(map);
      map.setView(A, 19);
      if (dateInput) dateInput.value = DEFAULT_DATE;
      if (timeInput) timeInput.value = DEFAULT_TIME;
      if (map.hasLayer(groundMarker)) map.removeLayer(groundMarker);
      updateSun();
    }
  };
}
