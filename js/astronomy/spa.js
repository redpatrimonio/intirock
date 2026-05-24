/* =============================================================
   INTIROCK — Solar Position Algorithm (SPA)
   Implementación fiel a:
     Reda & Andreas, "Solar Position Algorithm for Solar
     Radiation Applications", NREL/TP-560-34302, 2008.
   Válido: años -2000 a 6000, incertidumbre ±0.0003°.

   USO:
     import { spaCalc } from './spa.js';
     const r = spaCalc({ year, month, day, hour, minute, second,
                         lat, lon, elevation,
                         deltaT, pressure, temperature });
     // r.azimuth  : 0-360° desde el norte, sentido horario
     // r.zenith   : 0-90° (0 = Sol en el cénit)
     // r.elevation: -90 a 90° (positivo = Sol sobre horizonte)

   Módulo puro: sin acceso al DOM, sin efectos secundarios.
   ============================================================= */

// -------------------------------------------------------------------
// Tablas VSOP87 — Términos periódicos terrestres (Tabla A4.2 del paper)
// Cada fila: [A, B, C]
// -------------------------------------------------------------------

const L0 = [
  [175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],
  [3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],
  [2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],
  [1273,2.0371,529.691],[1199,1.1096,1577.3435],[990,5.233,5884.927],
  [902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],
  [753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],
  [357,2.92,0.067],[317,5.849,11790.629],[284,1.899,796.298],
  [271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],
  [205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],
  [132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],
  [103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],
  [99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],
  [85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],
  [79,3.04,12036.46],[75,1.76,5088.63],[74,3.5,3154.69],
  [74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],
  [61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],
  [56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],
  [51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],
  [41,2.4,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],
  [37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],
  [33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],
  [25,3.16,4690.48]
];

const L1 = [
  [628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],
  [425,1.59,3.523],[119,5.796,26.298],[109,2.966,1577.344],
  [93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],
  [67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],
  [45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],
  [21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.3],
  [17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],
  [15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],
  [12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],
  [10,1.3,6286.6],[10,4.24,1349.87],[9,2.7,242.73],
  [9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],
  [6,4.67,4690.48]
];

const L2 = [
  [52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],
  [27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],
  [10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],
  [5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],
  [3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],
  [3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],
  [2,4.38,5223.69],[2,3.75,0.98]
];

const L3 = [
  [289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],
  [3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]
];

const L4 = [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]];
const L5 = [[1,3.14,0]];

const B0 = [
  [280,3.199,84334.662],[102,5.422,5507.553],[80,3.88,5223.69],
  [44,3.7,2352.87],[32,4,1577.34]
];
const B1 = [[9,3.9,5507.55],[6,1.73,5223.69]];

const R0 = [
  [100013989,0,0],[1670700,3.0984635,6283.07585],[13956,3.05525,12566.1517],
  [3084,5.1985,77713.7715],[1628,1.1739,5753.3849],[1576,2.8469,7860.4194],
  [925,5.453,11506.77],[542,4.564,3930.21],[472,3.661,5884.927],
  [346,0.964,5507.553],[329,5.9,5223.694],[307,0.299,5573.143],
  [243,4.273,11790.629],[212,5.847,1577.344],[186,5.022,10977.079],
  [175,3.012,18849.228],[110,5.055,5486.778],[98,0.89,6069.78],
  [86,5.69,15720.84],[86,1.27,161000.69],[65,0.27,17260.15],
  [63,0.92,529.69],[57,2.01,83996.85],[56,5.24,71430.7],
  [49,3.25,2544.31],[47,2.58,775.52],[45,5.54,9437.76],
  [43,6.01,6275.96],[39,5.36,4694],[38,2.39,8827.39],
  [37,0.83,19651.05],[37,4.9,12139.55],[36,1.67,12036.46],
  [35,1.84,2942.46],[33,0.24,7084.9],[32,0.18,5088.63],
  [32,1.78,398.15],[28,1.21,6286.6],[28,1.9,6279.55],
  [26,4.59,10447.39]
];

const R1 = [
  [103019,1.10749,6283.07585],[1721,1.0644,12566.1517],[702,3.142,0],
  [32,1.02,18849.23],[31,2.84,5507.55],[25,1.32,5223.69],
  [18,1.42,1577.34],[10,5.91,10977.08],[9,1.42,6275.96],[9,0.27,5486.78]
];

const R2 = [
  [4359,5.7846,6283.0758],[124,5.579,12566.152],[12,3.14,0],
  [9,3.63,77713.77],[6,1.87,5573.14],[3,5.47,18849.23]
];

const R3 = [[145,4.273,6283.076],[7,3.92,12566.15]];
const R4 = [[4,2.56,6283.08]];

// -------------------------------------------------------------------
// Tabla A4.3 — Términos periódicos para nutación en longitud y oblicuidad
// Cada fila: [Y0,Y1,Y2,Y3,Y4, a,b,c,d]
// -------------------------------------------------------------------

const NUT = [
  [0,0,0,0,1,-171996,-174.2,92025,8.9],
  [-2,0,0,2,2,-13187,-1.6,5736,-3.1],
  [0,0,0,2,2,-2274,-0.2,977,-0.5],
  [0,0,0,0,2,2062,0.2,-895,0.5],
  [0,1,0,0,0,1426,-3.4,54,-0.1],
  [0,0,1,0,0,712,0.1,-7,0],
  [-2,1,0,2,2,-517,1.2,224,-0.6],
  [0,0,0,2,1,-386,-0.4,200,0],
  [0,0,1,2,2,-301,0,129,-0.1],
  [-2,-1,0,2,2,217,-0.5,-95,0.3],
  [-2,0,1,0,0,-158,0,0,0],
  [-2,0,0,2,1,129,0.1,-70,0],
  [0,0,-1,2,2,123,0,-53,0],
  [2,0,0,0,0,63,0,0,0],
  [0,0,1,0,1,63,0.1,-33,0],
  [2,0,-1,2,2,-59,0,26,0],
  [0,0,-1,0,1,-58,-0.1,32,0],
  [0,0,1,2,1,-51,0,27,0],
  [-2,0,2,0,0,48,0,0,0],
  [0,0,-2,2,1,46,0,-24,0],
  [2,0,0,2,2,-38,0,16,0],
  [0,0,2,2,2,-31,0,13,0],
  [0,0,2,0,0,29,0,0,0],
  [-2,0,1,2,2,29,0,-12,0],
  [0,0,0,2,0,26,0,0,0],
  [-2,0,0,2,0,-22,0,0,0],
  [0,0,-1,2,1,21,0,-10,0],
  [0,2,0,0,0,17,-0.1,0,0],
  [2,0,-1,0,1,16,0,-8,0],
  [-2,2,0,2,2,-16,0.1,7,0],
  [0,1,0,0,1,-15,0,9,0],
  [-2,0,1,0,1,-13,0,7,0],
  [0,-1,0,0,1,-12,0,6,0],
  [0,0,2,-2,0,11,0,0,0],
  [2,0,-1,2,1,-10,0,5,0],
  [2,0,1,2,2,-8,0,3,0],
  [0,1,0,2,2,7,0,-3,0],
  [-2,1,1,0,0,-7,0,0,0],
  [0,-1,0,2,2,-7,0,3,0],
  [2,0,0,2,1,-7,0,3,0],
  [2,0,1,0,0,6,0,0,0],
  [-2,0,2,2,2,6,0,-3,0],
  [-2,0,1,2,1,6,0,-3,0],
  [2,0,-2,0,1,-6,0,3,0],
  [2,0,0,0,1,-6,0,3,0],
  [0,-1,1,0,0,5,0,0,0],
  [-2,-1,0,2,1,-5,0,3,0],
  [-2,0,0,0,1,-5,0,3,0],
  [0,0,2,2,1,-5,0,3,0],
  [-2,0,2,0,1,4,0,0,0],
  [-2,1,0,2,1,4,0,0,0],
  [0,0,1,-2,0,4,0,0,0],
  [-1,0,1,0,0,-4,0,0,0],
  [-2,1,0,0,0,-4,0,0,0],
  [1,0,0,0,0,-4,0,0,0],
  [0,0,1,2,0,3,0,0,0],
  [0,0,-2,2,2,-3,0,0,0],
  [-1,-1,1,0,0,-3,0,0,0],
  [0,1,1,0,0,-3,0,0,0],
  [0,-1,1,2,2,-3,0,0,0],
  [2,-1,-1,2,2,-3,0,0,0],
  [0,0,3,2,2,-3,0,0,0],
  [2,-1,0,2,2,-3,0,0,0]
];

// -------------------------------------------------------------------
// Utilidades internas
// -------------------------------------------------------------------

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Suma de términos periódicos: Σ A*cos(B + C*jme) */
function sumTerms(table, jme) {
  let s = 0;
  for (const [A, B, C] of table) s += A * Math.cos(B + C * jme);
  return s;
}

/** Limita un valor al rango [0, 360). */
function limit360(v) {
  v = v % 360;
  return v < 0 ? v + 360 : v;
}

/** Limita un valor al rango [0, 1). */
function limit1(v) {
  v = v % 1;
  return v < 0 ? v + 1 : v;
}

// -------------------------------------------------------------------
// Función principal
// -------------------------------------------------------------------

/**
 * Calcula la posición solar topocéntrica.
 *
 * @param {object} p
 * @param {number} p.year         - Año (-2000 a 6000)
 * @param {number} p.month        - Mes (1–12)
 * @param {number} p.day          - Día del mes (1–31)
 * @param {number} p.hour         - Hora UT (0–23)
 * @param {number} p.minute       - Minuto (0–59)
 * @param {number} p.second       - Segundo (0–59)
 * @param {number} p.lat          - Latitud geográfica (°90°)
 * @param {number} p.lon          - Longitud geográfica (°, +este)
 * @param {number} p.elevation    - Elevación del observador (metros snm)
 * @param {number} [p.deltaT=0]   - Diferencia TT−UT (segundos); 0 es válido para el MVP
 * @param {number} [p.pressure=1013] - Presión (mbar)
 * @param {number} [p.temperature=15] - Temperatura (°C)
 *
 * @returns {{ azimuth:number, zenith:number, elevation:number }}
 */
export function spaCalc(p) {
  const {
    year, month, day, hour, minute, second,
    lat, lon, elevation,
    deltaT = 0,
    pressure = 1013,
    temperature = 15
  } = p;

  // -- 3.1 Tiempos Julian y efemérides ----------------------------------
  const D = day + (hour + (minute + second / 60) / 60) / 24;
  let Y = year, M = month;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.trunc(Y / 100);
  const B = 2 - A + Math.trunc(A / 4);
  const JD = Math.trunc(365.25 * (Y + 4716)) +
              Math.trunc(30.6001 * (M + 1)) + D + B - 1524.5;

  const JDE = JD + deltaT / 86400;
  const JC  = (JD  - 2451545) / 36525;
  const JCE = (JDE - 2451545) / 36525;
  const JME = JCE / 10;

  // -- 3.2 Longitud, latitud y radio heliocentricos (°) -----------------
  const L = limit360((
    sumTerms(L0, JME) +
    sumTerms(L1, JME) * JME +
    sumTerms(L2, JME) * JME ** 2 +
    sumTerms(L3, JME) * JME ** 3 +
    sumTerms(L4, JME) * JME ** 4 +
    sumTerms(L5, JME) * JME ** 5
  ) / 1e8 * DEG);

  const B_geo = (
    sumTerms(B0, JME) +
    sumTerms(B1, JME) * JME
  ) / 1e8 * DEG;

  const R = (
    sumTerms(R0, JME) +
    sumTerms(R1, JME) * JME +
    sumTerms(R2, JME) * JME ** 2 +
    sumTerms(R3, JME) * JME ** 3 +
    sumTerms(R4, JME) * JME ** 4
  ) / 1e8;

  // -- 3.3 Longitud y latitud geocentricas ------------------------------
  const THETA = limit360(L + 180);
  const BETA  = -B_geo;

  // -- 3.4 Nutación en longitud y oblicuidad ---------------------------
  const X0 = 297.85036  + 445267.111480 * JCE - 0.0019142  * JCE ** 2 + JCE ** 3 / 189474;
  const X1 = 357.52772  +  35999.050340 * JCE - 0.0001603  * JCE ** 2 - JCE ** 3 / 300000;
  const X2 = 134.96298  + 477198.867398 * JCE + 0.0086972  * JCE ** 2 + JCE ** 3 / 56250;
  const X3 =  93.27191  + 483202.017538 * JCE - 0.0036825  * JCE ** 2 + JCE ** 3 / 327270;
  const X4 = 125.04452  -   1934.136261 * JCE + 0.0020708  * JCE ** 2 + JCE ** 3 / 450000;
  const X  = [X0, X1, X2, X3, X4];

  let sumDpsi = 0, sumDeps = 0;
  for (const [y0,y1,y2,y3,y4, a,b,c,d] of NUT) {
    const arg = (y0*X[0] + y1*X[1] + y2*X[2] + y3*X[3] + y4*X[4]) * RAD;
    sumDpsi += (a + b * JCE) * Math.sin(arg);
    sumDeps += (c + d * JCE) * Math.cos(arg);
  }
  const Dpsi = sumDpsi / 36000000;  // grados
  const Deps = sumDeps / 36000000;  // grados

  // -- 3.5 Oblicuidad verdadera de la eclíptica (grados) --------------
  const U   = JME / 10;
  const eps0 = 84381.448 - 4680.93*U - 1.55*U**2 + 1999.25*U**3
               - 51.38*U**4 - 249.67*U**5 - 39.05*U**6 + 7.12*U**7
               + 27.87*U**8 + 5.79*U**9 + 2.45*U**10;  // arc-segundos
  const eps  = eps0 / 3600 + Deps;  // grados

  // -- 3.6 Corrección por aberración (grados) -------------------------
  const Dtau = -20.4898 / (3600 * R);

  // -- 3.7 Longitud aparente del Sol (grados) -------------------------
  const lambda = THETA + Dpsi + Dtau;

  // -- 3.8 Tiempo sideral aparente en Greenwich (grados) --------------
  const nu0 = limit360(
    280.46061837 + 360.98564736629 * (JD - 2451545) +
    0.000387933 * JC ** 2 - JC ** 3 / 38710000
  );
  const nu = nu0 + Dpsi * Math.cos(eps * RAD);

  // -- 3.9-3.10 Ascensión recta y declinación geocentricas (grados) --
  const lRad = lambda * RAD;
  const eRad = eps    * RAD;
  const bRad = BETA   * RAD;

  const alpha = limit360(Math.atan2(
    Math.sin(lRad) * Math.cos(eRad) - Math.tan(bRad) * Math.sin(eRad),
    Math.cos(lRad)
  ) * DEG);

  const delta = Math.asin(
    Math.sin(bRad) * Math.cos(eRad) + Math.cos(bRad) * Math.sin(eRad) * Math.sin(lRad)
  ) * DEG;

  // -- 3.11 Ángulo horario local (grados) ----------------------------
  const H = limit360(nu + lon - alpha);

  // -- 3.12 Corrección topocéntrica ----------------------------------
  const xi = 8.794 / (3600 * R);  // paralaje ecuatorial horizontal
  const u  = Math.atan(0.99664719 * Math.tan(lat * RAD));
  const x  = Math.cos(u) + elevation / 6378140 * Math.cos(lat * RAD);
  const y  = 0.99664719 * Math.sin(u) + elevation / 6378140 * Math.sin(lat * RAD);

  const xiRad = xi    * RAD;
  const HRad  = H     * RAD;
  const dRad  = delta * RAD;

  const Dalpha = Math.atan2(
    -x * Math.sin(xiRad) * Math.sin(HRad),
    Math.cos(dRad) - x * Math.sin(xiRad) * Math.cos(HRad)
  ) * DEG;

  const deltaPrime = Math.atan2(
    (Math.sin(dRad) - y * Math.sin(xiRad)) * Math.cos(Dalpha * RAD),
    Math.cos(dRad)  - x * Math.sin(xiRad) * Math.cos(HRad)
  ) * DEG;

  const Hprime = H - Dalpha;

  // -- 3.14 Ángulo cenital y elevación topocéntrica (grados) ---------
  const latRad    = lat       * RAD;
  const HpRad     = Hprime    * RAD;
  const dpRad     = deltaPrime * RAD;

  const e0 = Math.asin(
    Math.sin(latRad) * Math.sin(dpRad) +
    Math.cos(latRad) * Math.cos(dpRad) * Math.cos(HpRad)
  ) * DEG;

  // Refraction correction (ecuación 42)
  let De = 0;
  if (e0 > -1) {
    De = (pressure / 1010) * (283 / (273 + temperature)) *
         1.02 / (60 * Math.tan((e0 + 10.3 / (e0 + 5.11)) * RAD));
  }

  const e     = e0 + De;       // elevación topocéntrica con refracción
  const theta = 90 - e;        // ángulo cenital

  // -- 3.15 Azimut topocéntrico (grados, desde el norte, horario) ----
  const Gamma = limit360(Math.atan2(
    Math.sin(HpRad),
    Math.cos(HpRad) * Math.sin(latRad) - Math.tan(dpRad) * Math.cos(latRad)
  ) * DEG);

  const azimuth = limit360(Gamma + 180);

  return {
    azimuth,           // 0-360° desde el norte, sentido horario
    zenith:    theta,  // 0-180°
    elevation: e       // -90 a 90°
  };
}
