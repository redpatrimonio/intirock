/* =============================================================
   INTIROCK — ScreenHorizonMode
   Pantalla completa del Modo 2: Visión de Horizonte.
   ============================================================= */

import { CameraService }             from '../sensors/camera-service.js';
import { OrientationServiceHorizon } from '../sensors/orientation-service-horizon.js';
import { horizonInverseSearch }      from '../astronomy/horizon-inverse-search.js';

export class ScreenHorizonMode {

  #container;
  #geoService;

  #camera      = new CameraService();
  #orientation = new OrientationServiceHorizon();

  #root = null;

  #state = {
    azimuth:   null,
    elevation: null,
    lat:       null,
    lon:       null,
    altitude:  0,
    year:      new Date().getFullYear(),
    frozen:    false,
  };

  #calcTimer   = null;
  #orientUnsub = null;
  #geoUnsub    = null;

  constructor(container, geoService) {
    this.#container  = container;
    this.#geoService = geoService;
  }

  // -----------------------------------------------------------
  // Pública: montar
  // -----------------------------------------------------------

  async mount() {
    if (!this.#root) {
      this.#buildDOM();
      this.#attachEvents();
    }

    if (this.#state.frozen) {
      this.#state.frozen = false;
      const btn = this.#root.querySelector('#horizon-btn-freeze');
      if (btn) {
        btn.textContent = 'Congelar lectura';
        btn.classList.remove('frozen');
      }
    }

    const geoLast = this.#geoService.last;
    if (geoLast && geoLast.lat !== null) {
      this.#state.lat      = geoLast.lat;
      this.#state.lon      = geoLast.lon;
      this.#state.altitude = geoLast.altitude;
    }

    this.#geoUnsub = (pos) => {
      this.#state.lat      = pos.lat;
      this.#state.lon      = pos.lon;
      this.#state.altitude = pos.altitude;
      this.#updateGpsChip(pos);
      if (!this.#state.frozen) this.#scheduleCalc();
    };
    this.#geoService.subscribe(this.#geoUnsub);
    this.#updateGpsChip(geoLast);

    const orientStatus = await this.#orientation.start();
    this.#updateSensorsChip(orientStatus);

    this.#orientUnsub = ({ azimuth, elevation }) => {
      if (this.#state.frozen) return;
      this.#state.azimuth   = azimuth;
      this.#state.elevation = elevation;
      this.#updateReadings();
      this.#scheduleCalc();
    };
    this.#orientation.subscribe(this.#orientUnsub);

    const videoEl      = this.#root.querySelector('#horizon-video');
    const cameraStatus = await this.#camera.start(videoEl);
    if (cameraStatus === 'error' || cameraStatus === 'unsupported') {
      this.#showCameraError(cameraStatus);
    }

    this.#root.hidden = false;
  }

  // -----------------------------------------------------------
  // Pública: desmontar
  // -----------------------------------------------------------

  unmount() {
    this.#camera.stop();
    this.#orientation.stop();

    if (this.#orientUnsub) {
      this.#orientation.unsubscribe(this.#orientUnsub);
      this.#orientUnsub = null;
    }
    if (this.#geoUnsub) {
      this.#geoService.unsubscribe(this.#geoUnsub);
      this.#geoUnsub = null;
    }
    clearTimeout(this.#calcTimer);

    if (this.#root) this.#root.hidden = true;
  }

  // -----------------------------------------------------------
  // Construcción del DOM (solo se llama una vez)
  // -----------------------------------------------------------

  #buildDOM() {
    const el  = document.createElement('div');
    el.id     = 'screen-horizon';
    el.hidden = true;
    el.innerHTML = `
      <div id="horizon-video-wrap">
        <video id="horizon-video" playsinline muted autoplay></video>

        <!-- Crosshair CSS puro: no depende de dimensiones ni timing -->
        <div id="horizon-reticle" aria-hidden="true"></div>

        <!-- Overlay de datos -->
        <div id="horizon-overlay">
          <div id="horizon-chips">
            <span id="horizon-chip-sensors" class="chip">Sensores —</span>
            <span id="horizon-chip-gps"     class="chip">GPS —</span>
            <span id="horizon-chip-year"    class="chip">Año ${this.#state.year}</span>
          </div>

          <div id="horizon-readings">
            <div class="horizon-reading-block">
              <span class="horizon-label">Azimut</span>
              <span class="horizon-value" id="horizon-val-azimuth">—°</span>
            </div>
            <div class="horizon-reading-block">
              <span class="horizon-label">Altitud</span>
              <span class="horizon-value" id="horizon-val-elevation">—°</span>
            </div>
          </div>

          <div id="horizon-candidates">
            <div class="candidate-card" id="horizon-card-f1">
              <div class="candidate-date">—</div>
              <div class="candidate-score">—</div>
            </div>
            <div class="candidate-card" id="horizon-card-f2">
              <div class="candidate-date">—</div>
              <div class="candidate-score">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controles inferiores -->
      <div id="horizon-controls">
        <div id="horizon-year-block">
          <span class="meas-label">Año</span>
          <span class="meas-value" id="horizon-val-year">${this.#state.year}</span>
          <input type="range" id="horizon-year-slider"
                 min="-2000" max="6000"
                 value="${this.#state.year}" step="1" />
        </div>
        <div id="horizon-buttons">
          <button id="horizon-btn-freeze">Congelar lectura</button>
          <button id="horizon-btn-capture">Capturar pantalla</button>
        </div>
      </div>

      <p id="horizon-hint">Apunta la cámara al objetivo en el horizonte y centra la retícula.</p>
    `;

    this.#container.appendChild(el);
    this.#root = el;
  }

  // -----------------------------------------------------------
  // Eventos (se registran solo una vez)
  // -----------------------------------------------------------

  #attachEvents() {
    const q = id => this.#root.querySelector(`#${id}`);

    q('horizon-year-slider').addEventListener('input', (e) => {
      this.#state.year = parseInt(e.target.value, 10);
      q('horizon-val-year').textContent  = this.#state.year;
      q('horizon-chip-year').textContent = `Año ${this.#state.year}`;
      this.#scheduleCalc();
    });

    q('horizon-btn-freeze').addEventListener('click',  () => this.#toggleFreeze());
    q('horizon-btn-capture').addEventListener('click', () => this.#onCapture());
  }

  // -----------------------------------------------------------
  // Cálculo (debounced)
  // -----------------------------------------------------------

  #scheduleCalc() {
    if (this.#state.azimuth === null) return;
    if (this.#state.lat     === null) return;

    clearTimeout(this.#calcTimer);
    this.#calcTimer = setTimeout(() => {
      const results = horizonInverseSearch({
        azimuth:         this.#state.azimuth,
        horizonAltitude: this.#state.elevation ?? 0,
        lat:             this.#state.lat,
        lon:             this.#state.lon,
        altitude:        this.#state.altitude,
        year:            this.#state.year,
      });
      this.#updateCandidates(results);
    }, 300);
  }

  // -----------------------------------------------------------
  // Actualizar UI
  // -----------------------------------------------------------

  #updateReadings() {
    const q = id => this.#root.querySelector(`#${id}`);
    const s = this.#state;
    q('horizon-val-azimuth').textContent =
      s.azimuth   !== null ? `${s.azimuth.toFixed(1)}°`   : '—°';
    q('horizon-val-elevation').textContent =
      s.elevation !== null ? `${s.elevation.toFixed(1)}°` : '—°';
  }

  #updateCandidates(results) {
    this.#setCard('horizon-card-f1', results[0] ?? null);
    this.#setCard('horizon-card-f2', results[1] ?? null);
  }

  #setCard(id, candidate) {
    const card    = this.#root.querySelector(`#${id}`);
    const dateEl  = card.querySelector('.candidate-date');
    const scoreEl = card.querySelector('.candidate-score');
    if (!candidate) {
      dateEl.textContent  = '—';
      scoreEl.textContent = '—';
      card.classList.remove('has-result');
      return;
    }
    dateEl.textContent  = candidate.label;
    scoreEl.textContent = candidate.quality;
    card.classList.add('has-result');
  }

  #updateSensorsChip(status) {
    const map = {
      active:      ['ok',    'Sensores ✓'],
      error:       ['error', 'Sensores ✗'],
      unsupported: ['error', 'Sin sensores'],
      idle:        ['',      'Sensores —'],
    };
    const [cls, text] = map[status] ?? ['', status];
    this.#setChip('horizon-chip-sensors', cls, text);
  }

  #updateGpsChip(pos) {
    if (!pos || pos.lat === null) {
      this.#setChip('horizon-chip-gps', 'warn', 'GPS...');
      return;
    }
    const acc = pos.accuracy ? `±${Math.round(pos.accuracy)}m` : '';
    const cls = pos.reliability === 'high'   ? 'ok'
              : pos.reliability === 'medium' ? 'warn' : 'error';
    this.#setChip('horizon-chip-gps', cls, `GPS ${acc}`);
  }

  #setChip(id, cls, text) {
    const el = this.#root.querySelector(`#${id}`);
    if (!el) return;
    el.className   = 'chip' + (cls ? ` ${cls}` : '');
    el.textContent = text;
  }

  // -----------------------------------------------------------
  // Congelar
  // -----------------------------------------------------------

  #toggleFreeze() {
    this.#state.frozen = !this.#state.frozen;
    const btn = this.#root.querySelector('#horizon-btn-freeze');
    btn.textContent = this.#state.frozen ? 'Descongelar' : 'Congelar lectura';
    btn.classList.toggle('frozen', this.#state.frozen);

    if (this.#state.frozen) {
      this.#camera.pause();
    } else {
      this.#camera.resume();
    }
  }

  // -----------------------------------------------------------
  // Captura
  // -----------------------------------------------------------

  #onCapture() {
    if (!this.#state.frozen) this.#toggleFreeze();

    const hint = document.createElement('div');
    hint.textContent = 'Lectura congelada — toma el pantallazo ahora';
    Object.assign(hint.style, {
      position: 'fixed', bottom: '80px', left: '50%',
      transform: 'translateX(-50%)',
      background: '#f0a500', color: '#111',
      padding: '8px 16px', borderRadius: '999px',
      fontSize: '13px', fontWeight: '600',
      zIndex: '200', whiteSpace: 'nowrap'
    });
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 3000);
  }

  // -----------------------------------------------------------
  // Error de cámara
  // -----------------------------------------------------------

  #showCameraError(status) {
    const wrap = this.#root.querySelector('#horizon-video-wrap');
    if (wrap.querySelector('.camera-error-msg')) return;
    const msg  = document.createElement('div');
    msg.className   = 'camera-error-msg';
    msg.textContent = status === 'unsupported'
      ? 'Este navegador no soporta acceso a la cámara.'
      : 'No se pudo acceder a la cámara. Verifica los permisos.';
    Object.assign(msg.style, {
      position: 'absolute', inset: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#111', color: '#f0a500',
      fontSize: '14px', textAlign: 'center', padding: '16px'
    });
    wrap.appendChild(msg);
  }

}
