# Checkpoint 01 — MVP Base
**Fecha:** 2026-05-24
**Estado:** Desplegado en GitHub Pages

---

## ¿Qué teníamos al empezar?

Repo vacío con solo `README.md` y `docs/`.

---

## Árbol implementado

```
intirock/
├── index.html                          ✅
├── manifest.webmanifest                ✅
├── docs/
│   ├── intirock_manifesto.md            (preexistente)
│   ├── intirock_agent_guide.md          (preexistente)
│   └── checkpoints/
│       └── checkpoint-01.md               ✅ (este archivo)
├── assets/
│   └── icons/
│       └── icon-192.png                   ❌ pendiente
├── styles/
│   ├── tokens.css                       ✅
│   ├── base.css                         ✅
│   └── main.css                         ✅
└── js/
    ├── app.js                           ✅
    ├── sensors/
    │   ├── orientation-service.js         ✅
    ├──   geolocation-service.js          ✅
    │   └── smoothing-filter.js            ❌ pendiente
    └── astronomy/
        ├── spa.js                         ✅
        └── solar-inverse-search.js        ✅
```

**Nota:** `sw.js` (service worker) y `smoothing-filter.js` quedaron fuera del MVP base
por no ser bloqueantes para la primera prueba de campo.

---

## Decisiones tomadas en esta sesión

### Árbol
- Se eligió **Opción A** (mínimo de archivos): `main.css` fusiona layout y componentes.
- Se eliminaron del MVP: `heading-gauge.js`, `date-candidates-view.js`,
  `capture/screenshot.js`, `year-wheel-engine.js`, `utils/` como archivos separados.
  Toda esa lógica vive en `app.js` y `live-screen.js` hasta que el código crezca.

### Comportamiento sin coincidencia solar
- Si `solarInverseSearch` no encuentra ninguna fecha que calce con el azimut+elevación
  dentro de la tolerancia, devuelve `[]`.
- La UI muestra `—` en las tarjetas. **No hay fallback a fecha más cercana.**
- Arqueológicamente correcto: una roca que no calza no es un marcador solar.

### Tolerancias del buscador inverso
- Azimut: ±2.0°
- Elevación: ±2.5° (más permisiva porque el horizonte visual varía)
- Resolución temporal: cada 10 minutos
- Ventana horaria: 05:00–20:00 UT
- Todos los parámetros son sobrescribibles desde la llamada, sin tocar el módulo.

### SPA
- Implementación completa de NREL SPA (Reda & Andreas 2008).
- `deltaT = 0` por defecto (válido para MVP; se puede afinar con tablas históricas).
- Tablas VSOP87 completas: L0–L5, B0–B1, R0–R4 + 63 filas de nutación.

### Sensores
- iOS 13+: permiso explícito gestionado con overlay nativo en `app.js`.
- Usa `deviceorientationabsolute` cuando está disponible; fallback a `deviceorientation`.
- Si GPS no reporta altitud, se usa `0` (no rompe el SPA).

### Captura
- En el MVP el botón "Capturar pantalla" congela la lectura y muestra un toast
  indicando al usuario que tome el pantallazo manualmente.

---

## Pins para próximas sesiones

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | Crear `assets/icons/icon-192.png` (icono real de Intirock) | Media |
| 2 | Probar en teléfono real y ajustar tolerancias si es necesario | Alta |
| 3 | Agregar `smoothing-filter.js` para suavizar el ruido del sensor | Media |
| 4 | Agregar `sw.js` (service worker) para que la PWA funcione offline | Media |
| 5 | Verificar comportamiento del azimut en iOS vs Android (convención alpha) | Alta |
| 6 | Ajustar ventana horaria UT según zona horaria del usuario | Baja |
| 7 | Evaluar si `deltaT` histórico mejora precisión en años lejanos | Baja |

---

## URL de la app

https://redpatrimonio.github.io/intirock/
