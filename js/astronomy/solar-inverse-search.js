/* =============================================================
   INTIROCK — SolarInverseSearch
   Dado un azimut, elevación, ubicación y año, encuentra qué
   fechas del año el Sol ocupa esa dirección.

   Reglas de resultado:
     - Solo devuelve fechas con coincidencia real dentro de la
       tolerancia angular. Nunca inventa un resultado cercano.
     - 0 coincidencias → array vacío → la UI muestra '—'.
     - 1 coincidencia  → array con 1 elemento.
     - 2+ coincidencias → las dos con mejor score.
   ============================================================= */

import { spaCalc } from './spa.js';

// -------------------------------------------------------------------
// Parámetros por defecto (ajustables en llamadas futuras)
// -------------------------------------------------------------------

const DEFAULTS = {
  tolAzimuth:   2.0,   // ° tolerancia en azimut
  tolElevation: 2.5,   // ° tolerancia en elevación (un poco más permisiva)
  stepMinutes:  10,    // minutos entre muestras horarias
  hourStart:    5,     // hora UT de inicio de búsqueda (ajustar por zona)
  hourEnd:      20,    // hora UT de fin de búsqueda
};

// -------------------------------------------------------------------
// Función principal exportada
// -------------------------------------------------------------------

/**
 * Busca las fechas del año en que el Sol coincide con la dirección dada.
 *
 * @param {object} opts
 * @param {number} opts.azimuth     - Azimut objetivo (0-360°)
 * @param {number} opts.elevation   - Elevación objetivo (-90 a 90°)
 * @param {number} opts.lat         - Latitud del observador
 * @param {number} opts.lon         - Longitud del observador
 * @param {number} opts.altitude    - Altitud del observador (m snm)
 * @param {number} opts.year        - Año de referencia
 * @param {object} [opts.params]    - Sobreescribir DEFAULTS
 *
 * @returns {CandidateDate[]}  Array de 0, 1 o 2 fechas ordenadas por score.
 *
 * @typedef {object} CandidateDate
 * @property {number} month
 * @property {number} day
 * @property {string} label      - Ej: "21 Jun"
 * @property {number} score      - Distancia angular total (menor = mejor)
 * @property {string} quality    - 'Alta' | 'Media'
 * @property {number} hourUT     - Hora UT aproximada de la coincidencia
 */
export function solarInverseSearch(opts) {
  const {
    azimuth, elevation, lat, lon, altitude, year,
    params = {}
  } = opts;

  const cfg = { ...DEFAULTS, ...params };

  // -- 1. Iterar días del año -----------------------------------------
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const stepFrac   = cfg.stepMinutes / (60 * 24); // día fraccionario

  /** @type {Map<string, {score:number, month:number, day:number, hourUT:number}>} */
  const bestPerDay = new Map();

  for (let doy = 1; doy <= daysInYear; doy++) {
    const { month, day } = doyToMonthDay(doy, year);
    const key = `${month}-${day}`;

    // Muestrear horas del día
    for (let h = cfg.hourStart; h <= cfg.hourEnd; h += cfg.stepMinutes / 60) {
      const hour   = Math.trunc(h);
      const minute = Math.round((h - hour) * 60);

      const sun = spaCalc({
        year, month, day, hour, minute, second: 0,
        lat, lon, elevation: altitude,
        deltaT: 0, pressure: 1013, temperature: 15
      });

      // El Sol bajo el horizonte no cuenta
      if (sun.elevation < 0) continue;

      const dA = angleDiff(sun.azimuth,   azimuth);
      const dE = Math.abs(sun.elevation - elevation);

      if (dA <= cfg.tolAzimuth && dE <= cfg.tolElevation) {
        const score = dA + dE;
        const prev  = bestPerDay.get(key);
        if (!prev || score < prev.score) {
          bestPerDay.set(key, { score, month, day, hourUT: h });
        }
      }
    }
  }

  if (bestPerDay.size === 0) return [];

  // -- 2. Agrupar fechas próximas (ventana ±3 días) ------------------
  // Evita que días consecutivos de la misma coincidencia cuenten doble.
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

  // -- 3. Formatear resultado -----------------------------------------
  return groups.map(g => ({
    month:   g.month,
    day:     g.day,
    label:   formatDate(g.month, g.day),
    score:   Math.round(g.score * 10) / 10,
    quality: g.score <= 1.5 ? 'Alta' : 'Media',
    hourUT:  g.hourUT
  }));
}

// -------------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------------

/** Diferencia angular mínima entre dos azimuts (0-360). */
function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** ¿Es año bisiesto? */
function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Día del año (1-366) a {month, day}. */
function doyToMonthDay(doy, year) {
  const leap = isLeapYear(year);
  const months = [31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  let remaining = doy;
  for (let m = 0; m < 12; m++) {
    if (remaining <= months[m]) return { month: m + 1, day: remaining };
    remaining -= months[m];
  }
  return { month: 12, day: 31 };
}

/** {month, day} a día del año. */
function monthDayToDoy(month, day, year) {
  const leap = isLeapYear(year);
  const months = [31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  let doy = day;
  for (let m = 0; m < month - 1; m++) doy += months[m];
  return doy;
}

/** Formatea {month, day} como "21 Jun". */
function formatDate(month, day) {
  const names = ['Ene','Feb','Mar','Abr','May','Jun',
                  'Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${day} ${names[month - 1]}`;
}
