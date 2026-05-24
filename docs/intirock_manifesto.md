# RocaSolar – Documento de Dirección Creativa y Técnica

Este documento sirve como **manifesto operativo** y guía para cualquier desarrollador que participe en la creación de RocaSolar.

RocaSolar no es una app de entretenimiento ni un juguete de realidad aumentada genérico: es un **instrumento arqueoastronómico de campo**, diseñado para que una sola persona (el investigador) pueda, apoyando la espalda del teléfono contra una roca, explorar de manera inmediata qué fechas del año podrían estar marcadas por esa roca en relación con el Sol.

Este archivo define el **MVP**, su filosofía, sus límites, y el camino natural de evolución. Toda decisión de código debe respetar estas líneas.

---

## 1. Visión general

### 1.1 Qué es RocaSolar

RocaSolar es una **web app mobile‑first (PWA)** que transforma un teléfono en un **instrumento de medición arqueoastronómica**:

- El usuario apoya la **espalda del teléfono** contra una roca o superficie tallada.
- El **eje longitudinal del teléfono** (de abajo hacia la “cabeza” / cámara superior) define el **vector de medición principal**.
- La app mide **azimut** y **inclinación** de ese eje, toma la **posición geográfica** y el **año de referencia**, y calcula qué fechas del año el Sol ocupa una posición similar.
- La interfaz está diseñada para que **toda la información clave quepa en una sola pantalla** y pueda capturarse con un **pantallazo**.

### 1.2 Qué no es

- No es un instrumento de laboratorio ni una herramienta certificada de precisión milimétrica.
- No es (en el MVP) una app AR de cámara que superpone el Sol en la imagen del entorno.
- No es, en su primera etapa, una herramienta de registro masivo, sino un instrumento personal de investigación.

### 1.3 Público objetivo inicial

- Arqueólogos y arqueoastrónomos que trabajan en terreno.
- Investigadores de patrimonio, arquitectos, antropólogos.
- Entusiastas avanzados de arqueoastronomía andina.
- Guías turísticos especializados (fase posterior, no MVP).

---

## 2. Filosofía de diseño

### 2.1 Principios de UX

1. **Instrumento, no juguete**: La app debe sentirse como un sextante moderno o una brújula científica.
2. **Una sola pantalla principal**: El flujo principal de medición no debe exigir scroll; el pantallazo captura todo.
3. **Minimalismo interactivo**: Pocas acciones, pocos botones, jerarquía visual clara.
4. **Lectura inmediata**: Azimut, inclinación y fechas probables deben entenderse de un vistazo.
5. **MVP orientado a la fecha**: La prioridad es saber **en qué fecha** coincide el Sol, no a qué hora exacta.
6. **Honestidad sobre precisión**: La app puede usar datos GPS y sensores como están, declarando el margen de error, sin prometer exactitud de laboratorio.

### 2.2 Estética visual

- Paleta base: **antracita** (grafito oscuro) para fondos y superficies.
- Acento: **ámbar/dorado solar** para indicar dirección, estado “en vivo” y elementos clave.
- Tipografía: Sans serif moderna (Inter o equivalente), con jerarquía fuerte.
- Metáfora: panel de instrumento científico, no app “bonita” de marketing.

---

## 3. Alcance del MVP

### 3.1 Objetivo funcional

El MVP debe permitir que un usuario:

1. Abra RocaSolar en su teléfono (PWA).
2. Conceda permisos básicos de **orientación** y **GPS**.
3. Apoye la **espalda del teléfono** sobre una roca / superficie.
4. Vea, en tiempo real:
   - Azimut del eje longitudinal del teléfono.
   - Inclinación de ese eje (respecto al horizonte).
   - Dos fechas probables del año en las que el Sol coincide con esa dirección.
   - Año de referencia usado en el cálculo.
5. Ajuste el **año de referencia** con una rueda / slider, observando cómo cambian las fechas.
6. Congele la lectura en un momento dado.
7. Tome un **pantallazo** donde aparezcan todas estas variables visibles, para usarlo después como registro.

No se exige, en el MVP, almacenamiento persistente, cuentas de usuario, ni exportaciones avanzadas.

### 3.2 Entradas y salidas

**Entradas mínimas (MVP):**

- Azimut \(A\): dirección horizontal del eje del teléfono, en grados respecto al norte.
- Inclinación \(E\): ángulo del eje respecto al horizonte, en grados.
- Latitud \(arphi\) y longitud \(\lambda\): obtenidas por GPS del teléfono.
- Altitud \(h\): altura sobre el nivel del mar, obtenida por GPS (sin corrección adicional).
- Año \(Y\): seleccionable por el usuario, rango \(-2000\) a \(6000\).

**Salidas (MVP):**

- \(F_1\): primera fecha probable (día y mes) en el año \(Y\).
- \(F_2\): segunda fecha probable (día y mes) en el año \(Y\).
- Horarios referenciales aproximados para \(F_1\) y \(F_2\) (pueden mostrarse en pequeño).
- Indicador de precisión (por ejemplo: “Alta”, “Media”).
- Estado de sensores (sensores activos, GPS activo, precisión GPS aproximada en metros).

### 3.3 Decisiones de precisión

- **Fecha objetivo**: resolver coincidencias con precisión aproximada **±1 día**.
- **Altitud GPS**: se usa tal cual la reporta el dispositivo; errores habituales (±5–10 m) se consideran aceptables para el MVP.
- **Horizonte**: el horizonte geográfico no se modela en el MVP; se asume que el observador (el usuario) interpreta el horizonte visual.
- **Vector perpendicular** al plano de la roca: **no se utiliza** en el MVP (se reservará para futuras versiones).
- **Rango temporal**: el algoritmo de posición solar (SPA) se asume válido en el rango **-2000 a 6000**.

---

## 4. Arquitectura general

### 4.1 Stack recomendado

- **Front-end**: HTML + CSS + JavaScript (sin frameworks pesados en el MVP).
- **Tipo de app**: PWA (Progressive Web App) instalable en dispositivos móviles.
- **Sin backend** en el MVP: toda la lógica de cálculo y visualización corre en el cliente.
- **Algoritmo solar**: implementación del **NREL Solar Position Algorithm (SPA)** portado a JavaScript.

### 4.2 Estructura de carpetas (MVP)

Se propone la siguiente estructura (ajustable, pero mantener la separación de responsabilidades):

```text
rocasolar/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── icons/
│   └── ui/
├── styles/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   └── components.css
└── js/
    ├── app.js
    ├── sensors/
    │   ├── orientation-service.js
    │   ├── geolocation-service.js
    │   └── smoothing-filter.js
    ├── astronomy/
    │   ├── spa.js
    │   ├── solar-inverse-search.js
    │   └── year-wheel-engine.js
    ├── ui/
    │   ├── screen-live-measure.js
    │   ├── heading-gauge.js
    │   ├── date-candidates-view.js
    │   └── year-wheel.js
    ├── capture/
    │   └── screenshot.js
    └── utils/
        ├── math.js
        └── formatters.js
```

### 4.3 Roles de cada módulo

- `app.js`: punto de entrada, inicializa servicios, coordina estados y pantallas.
- `sensors/orientation-service.js`: abstrae la lectura de DeviceOrientation / sensores (heading, pitch, roll) y los expone como azimut e inclinación del eje del teléfono.
- `sensors/geolocation-service.js`: encapsula Geolocation API, proveyendo lat, lon y altitud con un estado de confiabilidad.
- `sensors/smoothing-filter.js`: filtros de suavizado (por ejemplo, media móvil) para reducir ruido en lecturas.
- `astronomy/spa.js`: implementación pura del NREL SPA; no debe conocer nada del DOM.
- `astronomy/solar-inverse-search.js`: algoritmo que, dado azimut, elevación, lat, lon, altitud y año, busca fechas donde la posición solar coincide dentro de un rango de error.
- `astronomy/year-wheel-engine.js`: lógica que controla el cambio de año (slider/rueda) y dispara recalculaciones.
- `ui/screen-live-measure.js`: composición de la pantalla principal; suscribe a servicios de sensores y astronomía.
- `ui/heading-gauge.js`: render del dial/rosa de orientación.
- `ui/date-candidates-view.js`: render de las dos fechas probables.
- `ui/year-wheel.js`: slider de año y su vínculo con el motor de cálculo.
- `capture/screenshot.js`: lógica para guiar al usuario a hacer un pantallazo útil (explicación visual, opcionalmente integrando APIs si se desea en futuro).
- `utils/math.js` y `utils/formatters.js`: funciones auxiliares (conversiones, formatos de grados, fechas, etc.).

---

## 5. Detalle del modelo de medición

### 5.1 Estructura `Measurement`

Cualquier medición en RocaSolar (MVP) debe representarse con una estructura explícita. Por ejemplo:

```js
const measurement = {
  azimuth: Number,           // grados 0–360, desde el norte, sentido horario
  elevation: Number,         // grados del eje respecto al horizonte
  lat: Number,               // grados de latitud
  lon: Number,               // grados de longitud
  altitude: Number,          // metros sobre el nivel del mar (según GPS)
  year: Number,              // año de referencia
  createdAt: Date            // momento de la medición (hora local)
};
```

### 5.2 Limitaciones explícitas

- `altitude` viene directamente del GPS del teléfono. No se corrige en el MVP.
- `year` se puede cambiar en tiempo real mediante un slider/rueda.
- El MVP no almacena múltiple mediciones; el objeto `measurement` puede ser una **estructura en memoria** que se actualiza constantemente.

---

## 6. Cálculo astronómico inverso (visión)

### 6.1 Idea general

El motor principal debe ser capaz de responder a esta pregunta:

> “Dado un azimut \(A\), elevación \(E\), ubicación (lat, lon, altitud) y un año \(Y\), ¿en qué fechas del año el Sol pasa por esa dirección?”

### 6.2 Estrategia aproximada (MVP)

1. Para un año \(Y\), iterar sobre los días \(d = 1\dots 365/366\).
2. Para cada día, muestrear horas entre una ventana razonable (por ejemplo 06:00–18:00, cada 10–15 minutos).
3. Usar SPA para obtener \(A_s\) (azimut solar) y \(E_s\) (elevación solar) para cada muestra.
4. Calcular diferencias:
   - \(|A_s - A| \leq \Delta A\)
   - \(|E_s - E| \leq \Delta E\)

   donde \(\Delta A\) y \(\Delta E\) son tolerancias (p. ej. 1–2°).
5. Si se cumplen ambas, registrar esa muestra como coincidencia candidata.
6. Después de explorar el año:
   - Agrupar coincidencias por fecha.
   - Seleccionar las **dos fechas** con mejor score (menor suma de errores angulares o mayor número de coincidencias).

### 6.3 Importante

- Este buscador debe estar **separado** del rendering.
- Debe ser **parametrizable** en tolerancias, rango horario y resolución temporal (para futuras versiones).
- En el MVP, la prioridad es mantener tiempos de respuesta aceptables en móviles (idealmente < 200–300 ms por recalculación de año).

---

## 7. Interfaz principal (layout)

### 7.1 Orden visual

En una sola pantalla (sin scroll), los elementos deben organizarse en este orden de lectura:

1. **Cabecera**:
   - Logo / icono.
   - Nombre: “RocaSolar”.
   - Subtítulo: “Instrumento arqueoastronómico”.

2. **Estado**:
   - Chips resumen: `Sensores`, `GPS`, `Año`.

3. **Coincidencias probables** (zona superior):
   - Título: “Coincidencias probables”.
   - Dos tarjetas una al lado de la otra:
     - Fecha 1 (día y mes).
     - Fecha 2 (día y mes).
     - Score (“Alta”, “Media”).

4. **Bloque de medición + año + acciones** (zona media):
   - Columna izquierda:
     - Azimut e inclinación (en grande, formato numérico).
     - Precisión y año actual.
     - Panel de “base temporal” con slider de año.
   - Columna derecha:
     - Botón “Congelar lectura”.
     - Botón “Capturar pantalla”.

5. **Dial** (zona inferior):
   - Rosa de orientación / dial circular.
   - Aguja indicando la dirección del eje.
   - Notas cortas (“Apoya la espalda del teléfono sobre la roca y gíralo para explorar la coincidencia solar”).

6. **Pie** (opcional):
   - Nota breve sobre margen de error (ej. “Altitud GPS aproximada; errores ±10 m no afectan la fecha ±1 día en este modo”).

### 7.2 Restricciones visuales

- Ningún bloque debe exigir scroll vertical en dispositivos móviles típicos (por ejemplo, 360×640 px como baseline). Ajustar tamaños tipográficos y paddings en consecuencia.
- Los números clave (azimut y fechas) deben ser visibles incluso en condiciones de luz intensa.

---

## 8. Decisiones de futuro (para que el código lo anticipe)

Aunque el MVP es acotado, la arquitectura debe dejar espacio para crecer:

### 8.1 Futuras extensiones previstas

- Registro de múltiples mediciones y almacenamiento local (IndexedDB).
- Exportación de datos (JSON, CSV, KML).
- Integración con proyectos como RedPatrimonio.
- Uso del vector perpendicular al plano de la roca (normal) para medir orientación del plano.
- Modo AR con cámara (añadir capa de visualización sobre el entorno real).
- Integración con GNSS externos y altímetros especializados.

### 8.2 Implicaciones para los desarrolladores

- El código debe evitar **mezclar lógica de cálculo con DOM** para facilitar reutilización en futuras plataformas (por ejemplo, una app nativa con el mismo núcleo).
- Es preferible usar **módulos puros** para cálculo y sensores, y mantener la UI como capa aparte.
- Evitar dependencias innecesarias; si se usan librerías, deben ser fáciles de reemplazar.

---

## 9. Rol del equipo y estilo de trabajo

### 9.1 Rol del “director creativo y de desarrollo”

- Define la **visión funcional** y la **experiencia de uso**.
- Valida cada cambio de arquitectura que afecte el flujo de medición.
- Asegura que las decisiones técnicas respeten el carácter de **instrumento arqueoastronómico**.

### 9.2 Rol de los desarrolladores

- Implementar la lógica de sensores y cálculo con fidelidad a esta especificación.
- Proponer mejoras técnicas siempre que no alteren el flujo central del MVP.
- Documentar claramente cualquier decisión que afecte precisión, rendimiento o UX.

### 9.3 Estilo de código

- Modulares, con funciones puras donde sea posible.
- Comentarios breves y funcionales (evitar novelas en comentarios).
- Nombres descriptivos (ej. `solarInverseSearch`, `orientationService`, `yearWheelEngine`).

---

## 10. Checklist del MVP

Antes de considerar el MVP "completo", este checklist debe estar en verde:

1. **Sensores**
   - [ ] Se pueden leer orientación y ubicación en dispositivos móviles.
   - [ ] La app indica claramente si tiene permisos y si los sensores están activos.

2. **Cálculo**
   - [ ] SPA implementado en JS y verificado con algunos ejemplos conocidos.
   - [ ] Motor inverso devuelve dos fechas coherentes para pruebas controladas.

3. **Interfaz**
   - [ ] Una sola pantalla principal sin scroll en móviles estándar.
   - [ ] Azimut, inclinación, fechas, año y botones visibles simultáneamente.

4. **Rendimiento**
   - [ ] Cambiar el año con la rueda responde en < 300 ms.
   - [ ] El cálculo en vivo no bloquea la interfaz.

5. **Comunicación de precisión**
   - [ ] Existe un texto breve que explica que la altitud GPS es aproximada.
   - [ ] La app declara que es una herramienta de exploración, no de laboratorio.

6. **Captura**
   - [ ] El pantallazo típico incluye toda la información clave sin cortar nada.

---

Este documento debe acompañar cualquier desarrollo y servir como referencia viva: si el flujo de la app se aleja de este manifiesto, debe discutirse con el "creador" antes de implementarse.
