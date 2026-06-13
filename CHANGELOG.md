# CHANGELOG

## 2026-06-13 — Checkpoint: Crosshair CSS funcional en iOS

### Problema resuelto
El crosshair (retícula) del Modo 2 (Visión de Horizonte) no se renderizaba
en iOS/Safari WebView. La causa raíz era una condición de carrera entre
`hidden = false` y `getBoundingClientRect()` en el mismo frame síncrono,
que devuelve `0×0` en móviles antes de que el browser complete el layout.

### Solución adoptada
Se reemplazó el `<canvas>` y la clase `Reticle` por un crosshair CSS puro:

- `<div id="horizon-reticle">` centrado con `position:absolute` +
  `transform:translate(-50%,-50%)`
- Círculo: `border-radius:50%`, `20×20px`
- Brazos: `::before` (horizontal) y `::after` (vertical), `14px` de largo,
  `4px` de hueco, toda la geometría en `px` absolutos (sin `%`)
- Sin dependencias de tamaño de contenedor, sin timing, sin `ResizeObserver`

### Archivos modificados
- `js/ui/screen-horizon-mode.js` — eliminados `Reticle`, `#resizeObs`,
  `#initReticle()`; `<canvas>` reemplazado por `<div>`
- `styles/main.css` — nuevas reglas `#horizon-reticle` con crosshair CSS
- `js/ui/reticle.js` — queda en el repo pero ya no se importa (puede
  eliminarse en un cleanup futuro)

### Estado de la app
- ✅ Modo 1 (Roca): funcional
- ✅ Modo 2 (Horizonte): funcional, crosshair visible en iOS
- ✅ GPS, sensores, lecturas de azimut/altitud: funcionales
- ✅ Candidatos astronómicos, rueda de año, congelar/capturar: funcionales
