/* =============================================================
   INTIROCK — GeolocationService
   Encapsula la Geolocation API del navegador.
   Provee lat, lon, altitud y un indicador de confiabilidad.

   Estados:
     'idle'        — no iniciado
     'waiting'     — esperando primera lectura
     'active'      — posición recibida y actualizándose
     'error'       — permiso denegado o fallo del dispositivo
     'unsupported' — API no disponible
   ============================================================= */

export class GeolocationService {

  #listeners = [];
  #watchId   = null;
  #status    = 'idle';

  #last = {
    lat:      null,
    lon:      null,
    altitude: null,   // metros snm según GPS (puede ser null en algunos dispositivos)
    accuracy: null,   // metros de precisión horizontal
    reliability: 'unknown' // 'high' | 'medium' | 'low' | 'unknown'
  };

  // -----------------------------------------------------------
  // Pública: arrancar el servicio
  // -----------------------------------------------------------

  /**
   * Inicia el seguimiento de posición.
   * Devuelve una promesa que resuelve con el estado resultante.
   * @returns {Promise<'active'|'error'|'unsupported'>}
   */
  start() {
    if (!navigator.geolocation) {
      this.#status = 'unsupported';
      return Promise.resolve(this.#status);
    }

    this.#status = 'waiting';

    return new Promise((resolve) => {
      this.#watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const wasWaiting = this.#status === 'waiting';
          this.#onPosition(pos);
          if (wasWaiting) resolve('active');
        },
        (err) => {
          this.#status = 'error';
          resolve('error');
        },
        {
          enableHighAccuracy: true,
          timeout:            10000,
          maximumAge:         0
        }
      );
    });
  }

  /** Detiene el seguimiento. */
  stop() {
    if (this.#watchId !== null) {
      navigator.geolocation.clearWatch(this.#watchId);
      this.#watchId = null;
    }
    this.#status = 'idle';
  }

  // -----------------------------------------------------------
  // Pública: suscripción
  // -----------------------------------------------------------

  /**
   * Registra un callback que recibe la última posición.
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
  // Privado
  // -----------------------------------------------------------

  #onPosition(pos) {
    const { latitude, longitude, altitude, accuracy } = pos.coords;

    this.#last = {
      lat:         latitude,
      lon:         longitude,
      altitude:    altitude ?? 0,   // si el dispositivo no reporta altitud, usamos 0
      accuracy,
      reliability: this.#classify(accuracy)
    };

    this.#status = 'active';
    this.#listeners.forEach(fn => fn({ ...this.#last }));
  }

  /**
   * Clasifica la precisión horizontal del GPS.
   * No afecta el cálculo; solo informa al usuario.
   *   high   : <= 20 m
   *   medium : <= 100 m
   *   low    : > 100 m
   */
  #classify(accuracy) {
    if (accuracy === null || accuracy === undefined) return 'unknown';
    if (accuracy <= 20)  return 'high';
    if (accuracy <= 100) return 'medium';
    return 'low';
  }

}
