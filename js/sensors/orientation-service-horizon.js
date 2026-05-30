/* =============================================================
   INTIROCK — OrientationServiceHorizon
   Variante del servicio de orientación para el Modo 2.

   En Modo 2 el teléfono está VERTICAL apuntando al horizonte,
   con la cámara trasera mirando al objetivo.

   El eje óptico de la cámara trasera es el vector de medición:
     azimuth  : dirección horizontal del eje óptico (0–360°, norte)
     elevation: altitud angular del eje óptico sobre el horizonte
                positivo = apunta hacia arriba, negativo = hacia abajo

   Mapeo de ejes DeviceOrientation → Modo 2 (teléfono VERTICAL):

     alpha (Z) → brújula → azimut (igual que Modo 1)

     beta  (X) → inclinación adelante/atrás del teléfono vertical
               → es la altitud angular del eje óptico en Modo 2
               rango estándar: -180 a +180
               beta = 90  → teléfono vertical, cámara al horizonte  → elevation = 0°
               beta = 135 → cámara apunta 45° hacia arriba          → elevation = +45°
               beta = 45  → cámara apunta 45° hacia abajo           → elevation = -45°
               Fórmula: elevation = beta - 90

     gamma (Y) → balanceo lateral izquierda/derecha del teléfono
               → NO describe el eje óptico cuando el teléfono está vertical
               → no se usa en Modo 2

   Nota: beta (X) en posición vertical es el único eje que describe
   cuánto está inclinada la cámara respecto al horizonte.
   gamma describe el balanceo lateral y es irrelevante para este uso.
   ============================================================= */

export class OrientationServiceHorizon {

  /** @type {Function[]} */
  #listeners = [];

  #last = { azimuth: null, elevation: null };

  /** 'idle' | 'active' | 'error' | 'unsupported' */
  #status = 'idle';

  #handler = null;

  // -----------------------------------------------------------
  // Pública: arrancar
  // -----------------------------------------------------------

  /**
   * Solicita permisos (iOS 13+) e inicia la escucha.
   * @returns {Promise<'active'|'error'|'unsupported'>}
   */
  async start() {
    if (!window.DeviceOrientationEvent) {
      this.#status = 'unsupported';
      return this.#status;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') {
          this.#status = 'error';
          return this.#status;
        }
      } catch {
        this.#status = 'error';
        return this.#status;
      }
    }

    this.#handler = (e) => this.#onEvent(e);

    if (window.DeviceOrientationAbsoluteEvent) {
      window.addEventListener('deviceorientationabsolute', this.#handler, true);
    } else {
      window.addEventListener('deviceorientation', this.#handler, true);
    }

    this.#status = 'active';
    return this.#status;
  }

  /** Detiene la escucha. */
  stop() {
    if (this.#handler) {
      window.removeEventListener('deviceorientationabsolute', this.#handler, true);
      window.removeEventListener('deviceorientation',         this.#handler, true);
      this.#handler = null;
    }
    this.#status = 'idle';
  }

  // -----------------------------------------------------------
  // Pública: suscripción
  // -----------------------------------------------------------

  /** @param {Function} fn — recibe { azimuth, elevation } */
  subscribe(fn)   { this.#listeners.push(fn); }
  unsubscribe(fn) { this.#listeners = this.#listeners.filter(l => l !== fn); }

  get status() { return this.#status; }
  get last()   { return { ...this.#last }; }

  // -----------------------------------------------------------
  // Privado
  // -----------------------------------------------------------

  #onEvent(e) {
    const azimuth   = this.#extractAzimuth(e);
    const elevation = this.#extractElevation(e);
    if (azimuth === null || elevation === null) return;
    this.#last = { azimuth, elevation };
    this.#listeners.forEach(fn => fn({ azimuth, elevation }));
  }

  /**
   * Azimut del eje óptico: igual que Modo 1,
   * alpha absolute representa la dirección de brújula.
   */
  #extractAzimuth(e) {
    if (e.alpha === null || e.alpha === undefined) return null;
    return (360 - e.alpha + 360) % 360;
  }

  /**
   * Altitud angular del eje óptico en Modo 2.
   *
   * El teléfono está VERTICAL sostenido como para tomar una foto.
   * En esa posición, beta describe cuánto se inclina la cámara
   * respecto al horizonte:
   *
   *   beta = 90  → cámara mirando exactamente al horizonte → 0°
   *   beta > 90  → cámara apunta hacia arriba              → positivo
   *   beta < 90  → cámara apunta hacia abajo               → negativo
   *
   * Fórmula: elevation = beta - 90
   * Rango resultante: aproximadamente -90° a +90°
   */
  #extractElevation(e) {
    if (e.beta === null || e.beta === undefined) return null;
    return Math.max(-90, Math.min(90, e.beta - 90));
  }

}
