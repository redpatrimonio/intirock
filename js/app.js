/* =============================================================
   INTIROCK — app.js
   Punto de entrada. Inicializa servicios, conecta sensores
   con el motor de cálculo y actualiza la UI.
   ============================================================= */

import { OrientationService }  from './sensors/orientation-service.js';
import { GeolocationService }  from './sensors/geolocation-service.js';
import { solarInverseSearch }  from './astronomy/solar-inverse-search.js';

// -------------------------------------------------------------------
// Estado global de la app
// -------------------------------------------------------------------

const state = {
  azimuth:   null,
  elevation: null,
  lat:       null,
  lon:       null,
  altitude:  0,
  year:      new Date().getFullYear(),
  frozen:    false
};

// -------------------------------------------------------------------
// Referencias al DOM
// -------------------------------------------------------------------

const $ = id => document.getElementById(id);

const ui = {
  chipSensors:   $('chip-sensors'),
  chipGps:       $('chip-gps'),
  chipYear:      $('chip-year'),
  valAzimuth:    $('val-azimuth'),
  valElevation:  $('val-elevation'),
  valYear:       $('val-year'),
  yearSlider:    $('year-slider'),
  cardF1:        $('card-f1'),
  cardF2:        $('card-f2'),
  btnFreeze:     $('btn-freeze'),
  btnCapture:    $('btn-capture'),
  dialCanvas:    $('dial-canvas'),
};

// -------------------------------------------------------------------
// Servicios
// -------------------------------------------------------------------

const orientation = new OrientationService();
const geolocation = new GeolocationService();

// -------------------------------------------------------------------
// Arranque
// -------------------------------------------------------------------

async function init() {
  // Año inicial en slider
  ui.yearSlider.value = state.year;
  ui.valYear.textContent = state.year;
  ui.chipYear.textContent = `Año ${state.year}`;

  // GPS
  const gpsStatus = await geolocation.start();
  updateChipGps(gpsStatus);

  geolocation.subscribe(pos => {
    state.lat      = pos.lat;
    state.lon      = pos.lon;
    state.altitude = pos.altitude;
    updateChipGps('active', pos.reliability, pos.accuracy);
    if (!state.frozen) recalc();
  });

  // Orientación — en iOS necesita gesto del usuario
  const orientStatus = await requestOrientation();
  updateChipSensors(orientStatus);

  orientation.subscribe(({ azimuth, elevation }) => {
    if (state.frozen) return;
    state.azimuth   = azimuth;
    state.elevation = elevation;
    updateMeasurementUI();
    updateDial(azimuth);
    recalc();
  });

  // Slider de año
  ui.yearSlider.addEventListener('input', onYearChange);

  // Botón congelar
  ui.btnFreeze.addEventListener('click', toggleFreeze);

  // Botón captura
  ui.btnCapture.addEventListener('click', onCapture);
}

// -------------------------------------------------------------------
// Orientación: manejo de permiso iOS (requiere gesto)
// -------------------------------------------------------------------

async function requestOrientation() {
  // En iOS el permiso solo se puede pedir desde un gesto.
  // Intentamos arrancar directamente; si falla, mostramos el botón.
  const status = await orientation.start();
  if (status === 'error') {
    showPermissionOverlay();
  }
  return status;
}

function showPermissionOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'permission-overlay';
  overlay.innerHTML = `
    <div id="permission-box">
      <p>Intirock necesita acceso a los sensores de orientación.</p>
      <button id="btn-grant">Activar sensores</button>
    </div>
  `;
  // Estilos inline mínimos para no depender de clases aún no definidas
  Object.assign(overlay.style, {
    position:'fixed', inset:'0', background:'rgba(17,17,17,0.96)',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:'999'
  });
  Object.assign(overlay.querySelector('#permission-box').style, {
    background:'#1e1e1e', border:'1px solid #333', borderRadius:'12px',
    padding:'24px', textAlign:'center', maxWidth:'280px'
  });
  document.body.appendChild(overlay);

  overlay.querySelector('#btn-grant').addEventListener('click', async () => {
    const status = await orientation.start();
    updateChipSensors(status);
    overlay.remove();
  });
}

// -------------------------------------------------------------------
// Recalcular fechas candidatas
// -------------------------------------------------------------------

let calcTimer = null;

function recalc() {
  // Necesitamos todos los datos mínimos
  if (state.azimuth   === null) return;
  if (state.elevation === null) return;
  if (state.lat       === null) return;

  // Debounce: no recalcular más de 1 vez cada 300 ms
  clearTimeout(calcTimer);
  calcTimer = setTimeout(() => {
    const results = solarInverseSearch({
      azimuth:   state.azimuth,
      elevation: state.elevation,
      lat:       state.lat,
      lon:       state.lon,
      altitude:  state.altitude,
      year:      state.year
    });
    updateCandidatesUI(results);
  }, 300);
}

// -------------------------------------------------------------------
// UI: actualizar valores de medición
// -------------------------------------------------------------------

function updateMeasurementUI() {
  ui.valAzimuth.textContent =
    state.azimuth   !== null ? `${state.azimuth.toFixed(1)}°`   : '—°';
  ui.valElevation.textContent =
    state.elevation !== null ? `${state.elevation.toFixed(1)}°` : '—°';
}

// -------------------------------------------------------------------
// UI: tarjetas de candidatos
// -------------------------------------------------------------------

function updateCandidatesUI(results) {
  setCard(ui.cardF1, results[0] ?? null);
  setCard(ui.cardF2, results[1] ?? null);
}

function setCard(card, candidate) {
  const dateEl  = card.querySelector('.candidate-date');
  const scoreEl = card.querySelector('.candidate-score');

  if (!candidate) {
    dateEl.textContent  = '—';
    scoreEl.textContent = '—';
    card.classList.remove('has-result');
    return;
  }

  dateEl.textContent  = candidate.label;
  scoreEl.textContent = candidate.quality;
  card.classList.add('has-result');
}

// -------------------------------------------------------------------
// UI: chips de estado
// -------------------------------------------------------------------

function updateChipSensors(status) {
  const map = {
    active:      ['ok',    'Sensores ✓'],
    error:       ['error', 'Sensores ✗'],
    unsupported: ['error', 'Sin sensores'],
    idle:        ['',      'Sensores —'],
  };
  const [cls, text] = map[status] ?? ['', status];
  setChip(ui.chipSensors, cls, text);
}

function updateChipGps(status, reliability, accuracy) {
  if (status === 'active') {
    const acc  = accuracy ? `±${Math.round(accuracy)}m` : '';
    const text = `GPS ${acc}`;
    const cls  = reliability === 'high' ? 'ok' : reliability === 'medium' ? 'warn' : 'error';
    setChip(ui.chipGps, cls, text);
  } else if (status === 'waiting') {
    setChip(ui.chipGps, 'warn', 'GPS...');
  } else if (status === 'error') {
    setChip(ui.chipGps, 'error', 'GPS ✗');
  } else {
    setChip(ui.chipGps, '', 'GPS —');
  }
}

function setChip(el, cls, text) {
  el.className = 'chip' + (cls ? ` ${cls}` : '');
  el.textContent = text;
}

// -------------------------------------------------------------------
// Año
// -------------------------------------------------------------------

function onYearChange(e) {
  state.year = parseInt(e.target.value, 10);
  ui.valYear.textContent  = state.year;
  ui.chipYear.textContent = `Año ${state.year}`;
  recalc();
}

// -------------------------------------------------------------------
// Congelar
// -------------------------------------------------------------------

function toggleFreeze() {
  state.frozen = !state.frozen;
  ui.btnFreeze.textContent = state.frozen ? 'Descongelar' : 'Congelar lectura';
  ui.btnFreeze.classList.toggle('frozen', state.frozen);
}

// -------------------------------------------------------------------
// Dial (canvas — rosa de orientación mínima)
// -------------------------------------------------------------------

function updateDial(azimuth) {
  const canvas = ui.dialCanvas;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const r  = W / 2 - 10;

  ctx.clearRect(0, 0, W, H);

  // Fondo circular
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1e1e1e';
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Marcas de los 4 puntos cardinales
  const cardinals = [['N', 0], ['E', 90], ['S', 180], ['O', 270]];
  ctx.fillStyle    = '#888';
  ctx.font         = '11px Inter, system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, deg] of cardinals) {
    const rad = (deg - 90) * Math.PI / 180;
    const tx  = cx + (r - 14) * Math.cos(rad);
    const ty  = cy + (r - 14) * Math.sin(rad);
    ctx.fillStyle = label === 'N' ? '#f0a500' : '#888';
    ctx.fillText(label, tx, ty);
  }

  // Aguja del azimut
  const needleRad = (azimuth - 90) * Math.PI / 180;
  const nx = cx + (r - 28) * Math.cos(needleRad);
  const ny = cy + (r - 28) * Math.sin(needleRad);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#f0a500';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Punto central
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#f0a500';
  ctx.fill();
}

// -------------------------------------------------------------------
// Captura
// -------------------------------------------------------------------

function onCapture() {
  // En el MVP guiamos al usuario a hacer el pantallazo manualmente.
  // El botón congela la lectura y muestra un aviso breve.
  if (!state.frozen) toggleFreeze();

  const hint = document.createElement('div');
  hint.textContent = 'Lectura congelada — toma el pantallazo ahora';
  Object.assign(hint.style, {
    position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)',
    background:'#f0a500', color:'#111', padding:'8px 16px',
    borderRadius:'999px', fontSize:'13px', fontWeight:'600',
    zIndex:'100', whiteSpace:'nowrap'
  });
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 3000);
}

// -------------------------------------------------------------------
// Arrancar
// -------------------------------------------------------------------

init();
