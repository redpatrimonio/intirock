/* =============================================================
   INTIROCK — OrientationServiceHorizon
   Variante del servicio de orientación para el Modo 2.

   En Modo 2 el teléfono está VERTICAL apuntando al horizonte,
   con la cámara trasera mirando al objetivo.

   El eje óptico de la cámara trasera es el vector de medición:
     azimuth  : dirección horizontal del eje óptico (0–360°, norte)
     elevation: altitud angular del eje óptico sobre el horizonte
                positivo = apunta hacia arriba, negativo = hacia abajo

   Mapeo de ejes DeviceOrientation → Modo 2:
     alpha (Z) → brújula → azimut (igual que Modo 1)
     gamma (Y) → inclinación lateral cuando el teléfono está vertical
               → es la altitud angular del eje óptico en Modo 2
               rango: -90 (apunta al suelo) a +90 (apunta al cielo)
               0 = apunta horizontalmente al horizonte

   Nota: beta (X) no se usa en Modo 2; describe la inclinación
   frontal-trasera del teléfono cuando está vertical, no el eje óptico.
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
   * Cuando el teléfono está vertical (beta ≈ 90°):
   *   gamma =  0  → cámara apunta horizontalmente
   *   gamma = +90 → cámara apunta al cénit
   *   gamma = -90 → cámara apunta al suelo
   * Invertimos el signo porque gamma positivo en el estándar
   * corresponde a inclinar el teléfono hacia la derecha,
   * que en posición vertical equivale a apuntar hacia abajo.
   */
  #extractElevation(e) {
    if (e.gamma === null || e.gamma === undefined) return null;
    return Math.max(-90, Math.min(90, -e.gamma));
  }

}
