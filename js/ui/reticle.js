/* =============================================================
   INTIROCK — Reticle
   Dibuja la retícula central sobre el feed de cámara del Modo 2.

   La retícula indica el punto exacto del eje óptico de la cámara:
   es el instrumento de puntado del Modo 2, no un adorno.

   Diseño:
     - Cruz de 4 brazos con hueco central (no toca el centro)
     - Círculo central alrededor del hueco
     - Color base: blanco con sombra oscura para contraste
       sobre cualquier fondo (cielo claro, roca oscura, etc.)
     - Tamaño fijo en píxeles lógicos, no relativo al canvas,
       para que no cambie con el zoom del viewport

   Uso:
     const reticle = new Reticle(canvasEl);
     reticle.draw();           // dibuja una vez al montar
     reticle.resize(w, h);     // llamar si el canvas cambia de tamaño

   El canvas debe tener position:absolute sobre el <video>,
   con width y height al 100% del contenedor. La UI lo gestiona.
   ============================================================= */

export class Reticle {

  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {CanvasRenderingContext2D} */
  #ctx;

  // Dimensiones de la retícula en píxeles lógicos
  #ARM_LENGTH = 28;   // longitud de cada brazo desde el borde del hueco
  #ARM_WIDTH  = 2;    // grosor del brazo
  #GAP        = 10;   // radio del hueco central
  #RING_R     = 14;   // radio del círculo central
  #RING_W     = 1.5;  // grosor del círculo

  #COLOR_MAIN   = 'rgba(255, 255, 255, 0.92)';
  #COLOR_SHADOW = 'rgba(0, 0, 0, 0.55)';

  // -----------------------------------------------------------

  /** @param {HTMLCanvasElement} canvasEl */
  constructor(canvasEl) {
    this.#canvas = canvasEl;
    this.#ctx    = canvasEl.getContext('2d');
  }

  // -----------------------------------------------------------
  // Pública: redibujar
  // -----------------------------------------------------------

  /**
   * Dibuja la retícula centrada en el canvas.
   * Llamar una vez al montar la pantalla, y de nuevo tras resize().
   */
  draw() {
    const ctx = this.#ctx;
    const cx  = this.#canvas.width  / 2;
    const cy  = this.#canvas.height / 2;

    ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    // Sombra para contraste sobre cualquier fondo
    ctx.shadowColor   = this.#COLOR_SHADOW;
    ctx.shadowBlur    = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = this.#COLOR_MAIN;
    ctx.lineCap     = 'round';

    // --- Brazos de la cruz ---
    ctx.lineWidth = this.#ARM_WIDTH;
    const gap = this.#GAP;
    const arm = this.#ARM_LENGTH;

    this.#line(ctx, cx,       cy - gap,         cx,             cy - gap - arm); // superior
    this.#line(ctx, cx,       cy + gap,         cx,             cy + gap + arm); // inferior
    this.#line(ctx, cx - gap, cy,               cx - gap - arm, cy);             // izquierdo
    this.#line(ctx, cx + gap, cy,               cx + gap + arm, cy);             // derecho

    // --- Círculo central ---
    ctx.lineWidth = this.#RING_W;
    ctx.beginPath();
    ctx.arc(cx, cy, this.#RING_R, 0, Math.PI * 2);
    ctx.stroke();

    // Limpiar sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  // -----------------------------------------------------------
  // Pública: redimensionar
  // -----------------------------------------------------------

  /**
   * Actualiza las dimensiones del canvas respetando devicePixelRatio
   * y redibuja. Llamar desde un ResizeObserver.
   *
   * IMPORTANTE: setTransform() resetea la matriz a identidad antes
   * de aplicar el nuevo scale(), evitando acumulación de escala
   * si resize() se llama más de una vez (ej. rotación de pantalla).
   *
   * @param {number} width  - Ancho en píxeles CSS
   * @param {number} height - Alto en píxeles CSS
   */
  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width  = width  * dpr;
    this.#canvas.height = height * dpr;
    this.#canvas.style.width  = `${width}px`;
    this.#canvas.style.height = `${height}px`;
    // Resetear matriz a identidad antes de escalar
    this.#ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.#ctx.scale(dpr, dpr);
    this.draw();
  }

  // -----------------------------------------------------------
  // Privado
  // -----------------------------------------------------------

  #line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

}
