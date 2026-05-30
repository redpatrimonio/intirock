/* =============================================================
   INTIROCK — DeclinationCalculator
   Cálculo de la declinación solar equivalente a una dirección
   en el horizonte, usando la fórmula estándar de arqueoastronomía.

   Fórmula (Thom / Ruggles):
     D = arcsin( cos(L) · cos(A) · cos(h) + sin(h) · sin(L) )

   Donde:
     L = latitud del observador (grados)
     A = azimut del objetivo (grados, norte geográfico)
     h = altitud angular del objetivo sobre el horizonte (grados)
     D = declinación solar equivalente (grados)

   El resultado D está en el rango [-90, +90]°.
     D ≈ +23.5 → dirección coincide con solsticio de verano boreal
     D ≈   0   → dirección coincide con equinoccios
     D ≈ -23.5 → dirección coincide con solsticio de invierno boreal

   Módulo puro: sin acceso al DOM, sin efectos secundarios.
   ============================================================= */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Calcula la declinación solar equivalente a una dirección del horizonte.
 *
 * @param {object} opts
 * @param {number} opts.lat       - Latitud del observador (grados, +norte)
 * @param {number} opts.azimuth   - Azimut del objetivo (grados, 0-360 desde el norte)
 * @param {number} opts.horizonAltitude - Altitud angular del objetivo (grados, +sobre horizonte)
 *
 * @returns {number} Declinación en grados [-90, +90], o NaN si los parámetros son inválidos.
 */
export function calcDeclination({ lat, azimuth, horizonAltitude }) {
  if (!isFinite(lat) || !isFinite(azimuth) || !isFinite(horizonAltitude)) return NaN;

  const L = lat             * RAD;
  const A = azimuth         * RAD;
  const h = horizonAltitude * RAD;

  const sinD = Math.cos(L) * Math.cos(A) * Math.cos(h)
             + Math.sin(h) * Math.sin(L);

  // Clampear al rango válido de arcsin para evitar NaN por errores de punto flotante
  return Math.asin(Math.max(-1, Math.min(1, sinD))) * DEG;
}
