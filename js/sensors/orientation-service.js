/* =============================================================
   INTIROCK — OrientationService
   Abstrae DeviceOrientationEvent (absolute cuando esté disponible)
   y expone azimut e inclinación del eje longitudinal del teléfono.

   Convenciones:
     azimuth  : 0–360°, desde el norte, sentido horario
     elevation: -90–+90°, positivo = eje apunta hacia arriba

   El teléfono se usa con la ESPALDA apoyada sobre la roca
   y el eje longitudinal (abajo → cámara) como vector de medición.
   ============================================================= */

export class OrientationService {

  /** @type {Function[]} */
  #listeners = [];

  /** Última lectura válida */
  #last = { azimuth: null, elevation: null };

  /** Estado del servicio: 'idle' | 'active' | 'error' | 'unsupported' */
  #status = 'idle';

  /** Handler guardado para poder removeEventListener */
  #handler = null;

  // -----------------------------------------------------------
  // Pública: arrancar el servicio
  // -----------------------------------------------------------

  /**
   * Solicita permisos (iOS 13+) e inicia la escucha de eventos.
   * Devuelve el estado resultante.
   * @returns {Promise<'active'|'error'|'unsupported'>}
   */
  async start() {
    if (!window.DeviceOrientationEvent) {
      this.#status = 'unsupported';
      return this.#status;
    }

    // iOS 13+ requiere permiso explícito
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

    // Preferir absolute (brújula real); si no existe, usar el relativo
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

  /**
   * Registra un callback que recibe { azimuth, elevation } en cada evento.
   * @param {Function} fn
   */
  subscribe(fn) {
    this.#listeners.push(fn);
  }

  unsubscribe(fn) {
    this.#listeners = this.#listeners.filter(l => l !== fn);
  }

  get status() { return this.#status; }
  get last()   { return { ...this.#last }; }

  // -----------------------------------------------------------
  // Privado: procesamiento del evento
  // -----------------------------------------------------------

  #onEvent(e) {
    const azimuth   = this.#extractAzimuth(e);
    const elevation = this.#extractElevation(e);

    if (azimuth === null || elevation === null) return;

    this.#last = { azimuth, elevation };
    this.#listeners.forEach(fn => fn({ azimuth, elevation }));
  }

  /**
   * Extrae el azimut del eje longitudinal.
   *
   * DeviceOrientationEvent:
   *   alpha : rotación alrededor del eje Z (0–360, brújula cuando es absolute)
   *   beta  : rotación alrededor del eje X (-180–180, inclinación frontal-trasera)
   *   gamma : rotación alrededor del eje Y (-90–90, inclinación lateral)
   *
   * Cuando el teléfono está plano (espalda sobre la roca) y alpha es absolute,
   * alpha representa directamente el azimut del eje longitudinal.
   * Normalizamos a 0–360.
   */
  #extractAzimuth(e) {
    if (e.alpha === null || e.alpha === undefined) return null;
    return (360 - e.alpha + 360) % 360;
  }

  /**
   * Extrae la inclinación del eje longitudinal respecto al horizonte.
   * beta = 0  → teléfono plano (horizontal)
   * beta = 90 → teléfono vertical apuntando arriba
   * Devolvemos beta directamente como elevación.
   */
  #extractElevation(e) {
    if (e.beta === null || e.beta === undefined) return null;
    // Clampear al rango útil (-90 a 90)
    return Math.max(-90, Math.min(90, e.beta));
  }

}
