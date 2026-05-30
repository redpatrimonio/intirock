# Checkpoint — Modo 2 layout funcional
**Fecha:** 2026-05-30  
**Commit base:** `0296371acf9e277d30273b5c617daa9cccc79a24`

---

## Estado del proyecto

Ambos modos funcionan y se alternan correctamente en dispositivo real.

### Modo 1 (Roca)
- Layout completo visible: chips de sensores, candidatos, medición + slider de año, dial, footer.
- Al cambiar a Modo 2, desaparece completamente.
- Al volver desde Modo 2, reaparece correctamente.

### Modo 2 (Horizonte)
- Cámara visible y a pantalla completa dentro del área de contenido.
- Overlay de azimut, altitud, chips GPS/sensores/año operativos.
- Controles inferiores (slider de año, Congelar, Capturar) visibles.
- Al volver a Modo 1, se apaga completamente.

---

## Fixes aplicados en esta sesión

### 1. `js/ui/screen-horizon-mode.js`
- **DOM duplicado en mount() repetido** — envuelto `#buildDOM()` y `#attachEvents()` en `if (!this.#root)`.
- Reset del estado `frozen` al remontar.
- `#showCameraError()` protegido contra mensajes duplicados con clase `.camera-error-msg`.

### 2. `index.html`
- Footer corregido: `&#xB110;` → `&plusmn;` (±10 m).
- Agregado wrapper `#screens` alrededor de `#screen-rock` y `#screen-horizon-container`.
- `#screen-horizon-container` arranca con atributo `hidden`.
- `#footer` movido fuera de `#screens`.

### 3. `styles/main.css`
- Eliminado `display: contents` en `#screen-rock` — reemplazado por el modelo de dos páginas absolutas.
- `#screens`: `position: relative; flex: 1` — ocupa el espacio entre selector y footer.
- `#screen-rock` y `#screen-horizon-container`: `position: absolute; inset: 0` — cada modo ocupa exactamente `#screens`.
- `#screen-horizon`: `position: absolute; inset: 0` — cadena de alturas explícita para que el video reciba altura real.
- `[hidden]` con `display: none !important` — gana sobre `display: flex` declarado.
- `#dial-section`: `flex: 1; overflow: hidden` — llena el espacio sobrante sin desbordarse.

### 4. `js/ui/reticle.js`
- `resize()`: agregado `setTransform(1, 0, 0, 1, 0, 0)` antes de `scale(dpr, dpr)` para evitar acumulación de escala en rotaciones de pantalla.

### 5. `js/app.js`
- `switchMode()`: `ui.horizonContainer.hidden = false` antes de `mount()`, y `hidden = true` al volver a Modo 1.

---

## Arquitectura de layout (modelo final)

```
#app  (flex column, height: 100dvh)
  #header            (flex-shrink: 0)
  #mode-selector     (flex-shrink: 0)
  #screens           (position: relative, flex: 1)
    #screen-rock                  (position: absolute, inset: 0)
    #screen-horizon-container     (position: absolute, inset: 0)
      #screen-horizon             (position: absolute, inset: 0)
        #horizon-video-wrap       (flex: 1)
          <video>
          <canvas reticle>
          #horizon-overlay
        #horizon-controls         (flex-shrink: 0)
        #horizon-hint             (flex-shrink: 0)
  #footer            (flex-shrink: 0)
```

---

## Pendiente / próximos pasos

- Verificar lecturas reales de azimut y altitud angular en campo con dispositivo físico.
- Validar que `orientation-service-horizon.js` mapea correctamente el eje `gamma` del giroscopio para altitud angular en distintos modelos de teléfono.
- Prueba de rotación de pantalla (landscape) para confirmar que `Reticle.resize()` no acumula escala.
