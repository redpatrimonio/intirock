/* =============================================================
   INTIROCK — HorizonInverseSearch
   Dado un azimut, altitud angular, ubicación y año, calcula
   la declinación solar equivalente del objetivo y busca las
   fechas del año en que la declinación solar coincide con ella.

   Flujo:
     1. calcDeclination(lat, azimuth, horizonAltitude) → D
     2. Para cada día del año, obtener la declinación solar
        media del día (una sola llamada SPA al mediodía solar)
     3. Encontrar los días donde |D_solar - D| ≤ tolerancia
     4. Devolver las 2 fechas con menor error, agrupando
        días consecutivos (ventana ±3 días)

   Por qué una sola llamada SPA por día (y no barrido horario):
     La declinación solar cambia lentamente (≤0.5°/día).
     Muestrearla al mediodía solar es suficiente para
     identificar el día correcto con precisión ±1 día.
     Esto mantiene el cálculo < 50 ms en móvil de gama media.

   Reglas de resultado:
     - 0 coincidencias → array vacío → UI muestra '—'
     - 1 coincidencia  → array con 1 elemento
     - 2+ coincidencias → las dos con menor error absoluto

   Módulo puro: sin acceso al DOM, sin efectos secundarios.
   ============================================================= */

import { spaCalc }          from './spa.js';
import { calcDeclination }  from './declination-calculator.js';

// -------------------------------------------------------------------
// Parámetros por defecto
// -------------------------------------------------------------------

const DEFAULTS = {
  tolDeclination: 1.0,   // ° tolerancia en declinación (ajustable)
  solarNoonHour:  12,    // hora UT aproximada del mediodía solar para el muestreo
};

// -------------------------------------------------------------------
// Función principal exportada
// -------------------------------------------------------------------

/**
 * Busca las fechas del año en que la declinación solar coincide
 * con la dirección del objetivo en el horizonte.
 *
 * @param {object} opts
 * @param {number} opts.azimuth          - Azimut del objetivo (0–360°)
 * @param {number} opts.horizonAltitude  - Altitud angular del objetivo (grados)
 * @param {number} opts.lat              - Latitud del observador
 * @param {number} opts.lon              - Longitud del observador
 * @param {number} opts.altitude         - Altitud del observador (m snm)
 * @param {number} opts.year             - Año de referencia
 * @param {object} [opts.params]         - Sobreescribir DEFAULTS
 *
 * @returns {CandidateDate[]}  Array de 0, 1 o 2 fechas ordenadas por score.
 *
 * @typedef {object} CandidateDate
 * @property {number} month
 * @property {number} day
 * @property {string} label       - Ej: "21 Jun"
 * @property {number} score       - Error absoluto en declinación (menor = mejor)
 * @property {string} quality     - 'Alta' | 'Media'
 * @property {number} declination - Declinación objetivo usada en el cálculo
 */
export function horizonInverseSearch(opts) {
  const {
    azimuth, horizonAltitude, lat, lon, altitude, year,
    params = {}
  } = opts;

  const cfg = { ...DEFAULTS, ...params };

  // -- 1. Declinación objetivo ------------------------------------------
  const targetDecl = calcDeclination({ lat, azimuth, horizonAltitude });
  if (!isFinite(targetDecl)) return [];

  // -- 2. Iterar días del año ------------------------------------------
  const daysInYear = isLeapYear(year) ? 366 : 365;

  /** @type {Map<string, {score:number, month:number, day:number}>} */
  const bestPerDay = new Map();

  for (let doy = 1; doy <= daysInYear; doy++) {
    const { month, day } = doyToMonthDay(doy, year);

    // Una sola llamada SPA al mediodía solar (hora UT)
    const sun = spaCalc({
      year, month, day,
      hour: cfg.solarNoonHour, minute: 0, second: 0,
      lat, lon, elevation: altitude,
      deltaT: 0, pressure: 1013, temperature: 15
    });

    // Extraemos la declinación del Sol del día desde el resultado SPA.
    // spaCalc devuelve azimuth, zenith, elevation pero no delta directamente.
    // La declinación solar la recalculamos desde la elevación y el ángulo horario
    // usando la identidad esférica inversa, o más simple:
    // usamos que al mediodía solar H≈0, entonces:
    //   sin(elevation) = sin(lat)·sin(delta) + cos(lat)·cos(delta)·cos(H)
    // con H≈0 → elevation_noon ≈ 90 - |lat - delta|
    // Por tanto: delta ≈ elevation_noon - (90 - lat)  [hemisferio sur ajustado]
    // Pero es más robusto usar calcDeclination con el azimut solar al mediodía,
    // donde h_solar = sun.elevation y A_solar = sun.azimuth.
    // Sin embargo, eso sería la declinación del punto solar, no del objetivo.
    //
    // Enfoque correcto: derivar delta desde la elevación meridiana.
    // Al mediodía solar (H=0):
    //   sin(e) = sin(L)·sin(D) + cos(L)·cos(D)  <-- expandido con cos(0)=1
    //          = cos(L - D)
    //   por tanto: D = L - (90 - e) = e - (90 - L)
    // Pero esto solo es exacto en el meridiano. Usamos la fórmula general
    // invertida ya que conocemos azimut y elevación del Sol en ese momento:
    const solarDecl = solarDeclFromPosition(sun.azimuth, sun.elevation, lat);

    const score = Math.abs(solarDecl - targetDecl);

    if (score <= cfg.tolDeclination) {
      const key = `${month}-${day}`;
      const prev = bestPerDay.get(key);
      if (!prev || score < prev.score) {
        bestPerDay.set(key, { score, month, day });
      }
    }
  }

  if (bestPerDay.size === 0) return [];

  // -- 3. Agrupar fechas próximas (±3 días) ----------------------------
  const sorted = [...bestPerDay.values()].sort((a, b) => a.score - b.score);
  const groups = [];

  for (const candidate of sorted) {
    const doy = monthDayToDoy(candidate.month, candidate.day, year);
    const overlaps = groups.some(g => {
      const gDoy = monthDayToDoy(g.month, g.day, year);
      return Math.abs(doy - gDoy) <= 3;
    });
    if (!overlaps) groups.push(candidate);
    if (groups.length === 2) break;
  }

  // -- 4. Formatear resultado ------------------------------------------
  return groups.map(g => ({
    month:       g.month,
    day:         g.day,
    label:       formatDate(g.month, g.day),
    score:       Math.round(g.score * 100) / 100,
    quality:     g.score <= 0.5 ? 'Alta' : 'Media',
    declination: Math.round(targetDecl * 10) / 10
  }));
}

// -------------------------------------------------------------------
// Derivar declinación solar desde posición observable
// -------------------------------------------------------------------

/**
 * Dado el azimut y elevación del Sol y la latitud del observador,
 * recupera la declinación solar usando la fórmula inversa de
 * la misma ecuación del brief (Thom/Ruggles):
 *   sin(D) = cos(L)·cos(A)·cos(h) + sin(h)·sin(L)
 * Esta es exactamente calcDeclination con los datos del Sol.
 *
 * @param {number} sunAzimuth   - Azimut del Sol (grados)
 * @param {number} sunElevation - Elevación del Sol (grados)
 * @param {number} lat          - Latitud del observador (grados)
 * @returns {number} Declinación solar (grados)
 */
function solarDeclFromPosition(sunAzimuth, sunElevation, lat) {
  return calcDeclination({
    lat,
    azimuth:          sunAzimuth,
    horizonAltitude:  sunElevation
  });
}

// -------------------------------------------------------------------
// Utilidades (idénticas a solar-inverse-search.js para mantener
// independencia del módulo)
// -------------------------------------------------------------------

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function doyToMonthDay(doy, year) {
  const leap = isLeapYear(year);
  const months = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = doy;
  for (let m = 0; m < 12; m++) {
    if (remaining <= months[m]) return { month: m + 1, day: remaining };
    remaining -= months[m];
  }
  return { month: 12, day: 31 };
}

function monthDayToDoy(month, day, year) {
  const leap = isLeapYear(year);
  const months = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = day;
  for (let m = 0; m < month - 1; m++) doy += months[m];
  return doy;
}

function formatDate(month, day) {
  const names = ['Ene','Feb','Mar','Abr','May','Jun',
                  'Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${day} ${names[month - 1]}`;
}
