/* =============================================================
   INTIROCK — CameraService
   Gestiona el feed de la cámara trasera para el Modo 2.

   Responsabilidades:
     - Solicitar permiso de cámara al navegador
     - Activar el stream de la cámara trasera (facingMode: environment)
     - Conectar el stream a un elemento <video> provisto por la UI
     - Exponer métodos para pausar/reanudar y detener el stream

   Estados:
     'idle'        — no iniciado
     'active'      — stream activo y conectado al video
     'paused'      — stream activo pero video pausado (lectura congelada)
     'error'       — permiso denegado o cámara no disponible
     'unsupported' — getUserMedia no disponible en este navegador

   Módulo puro de servicio: no accede al DOM salvo el <video>
   que recibe como parámetro. Sin efectos secundarios globales.
   ============================================================= */

export class CameraService {

  #stream  = null;
  #video   = null;
  #status  = 'idle';

  // -----------------------------------------------------------
  // Pública: arrancar
  // -----------------------------------------------------------

  /**
   * Solicita el stream de la cámara trasera y lo conecta al
   * elemento <video> indicado.
   *
   * @param {HTMLVideoElement} videoEl - Elemento <video> donde mostrar el feed
   * @returns {Promise<'active'|'error'|'unsupported'>}
   */
  async start(videoEl) {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.#status = 'unsupported';
      return this.#status;
    }

    this.#video = videoEl;

    try {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },  // cámara trasera
          width:      { ideal: 1280 },
          height:     { ideal: 720 }
        },
        audio: false
      });

      videoEl.srcObject = this.#stream;
      videoEl.setAttribute('playsinline', '')   // iOS: evita pantalla completa
      videoEl.setAttribute('autoplay', '')
      videoEl.setAttribute('muted', '')
      await videoEl.play();

      this.#status = 'active';
    } catch (err) {
      // NotAllowedError = permiso denegado
      // NotFoundError   = no hay cámara trasera
      console.warn('[CameraService] start error:', err.name, err.message);
      this.#status = 'error';
    }

    return this.#status;
  }

  // -----------------------------------------------------------
  // Pública: pausar / reanudar (congelar lectura)
  // -----------------------------------------------------------

  /**
   * Pausa el video (frame congelado). El stream sigue activo
   * para poder reanudarse sin volver a pedir permiso.
   */
  pause() {
    if (this.#video && this.#status === 'active') {
      this.#video.pause();
      this.#status = 'paused';
    }
  }

  /**
   * Reanuda el feed después de una pausa.
   */
  resume() {
    if (this.#video && this.#status === 'paused') {
      this.#video.play();
      this.#status = 'active';
    }
  }

  // -----------------------------------------------------------
  // Pública: detener completamente
  // -----------------------------------------------------------

  /**
   * Detiene todas las pistas del stream y libera la cámara.
   * Llamar al salir del Modo 2 para no mantener la cámara ocupada.
   */
  stop() {
    if (this.#stream) {
      this.#stream.getTracks().forEach(track => track.stop());
      this.#stream = null;
    }
    if (this.#video) {
      this.#video.srcObject = null;
      this.#video = null;
    }
    this.#status = 'idle';
  }

  // -----------------------------------------------------------
  // Getters
  // -----------------------------------------------------------

  get status()  { return this.#status; }
  get isActive(){ return this.#status === 'active'; }
  get isPaused(){ return this.#status === 'paused'; }

}
