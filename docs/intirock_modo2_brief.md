# IntiRock – Modo 2: Visión de Horizonte
## Brief de Desarrollo

---

## 1. Contexto

IntiRock ya implementa el **Modo 1**: el usuario apoya la espalda del teléfono sobre una roca o tallado y obtiene las fechas del año en que el Sol se alinea con ese plano. Es una medición de orientación de superficie.

El **Modo 2** es conceptualmente distinto. No mide el plano de una roca: mide una **dirección en el paisaje**, específicamente hacia un elemento del horizonte (cerro, portada arquitectónica, formación rocosa), para determinar en qué fechas del año el Sol sale o se pone en esa dirección exacta desde ese punto de observación.

Esto corresponde a la tradición científica conocida como **astronomía de horizonte** (*horizon astronomy*), que es uno de los métodos centrales de la arqueoastronomía andina y mesoamericana. Los observadores antiguos elegían puntos de observación elevados desde los cuales dos o más ejes del horizonte coincidían con eventos solares significativos (solsticios, equinoccios, fechas ceremoniales).

---

## 2. Qué mide el Modo 2

El usuario observa desde un punto elevado (típicamente la cima de un cerro u otro elemento arquitectónico o natural) hacia un objetivo en el horizonte: otro cerro, una portada, una roca o cualquier elemento que forme parte del sistema de alineación.

La medición involucra tres variables:

- **Azimut (A)**: dirección horizontal del objetivo, en grados respecto al norte geográfico.
- **Altitud angular (h)**: ángulo de elevación del objetivo sobre el horizonte plano, en grados. Nunca se asume cero, ya que el objetivo puede estar a varios grados sobre o bajo el horizonte aparente.
- **Posición del observador**: latitud, longitud y altitud sobre el nivel del mar (GPS del teléfono).

Con estos tres datos, el motor astronómico calcula la **declinación solar equivalente** a esa dirección, usando la fórmula estándar de arqueoastronomía:

\[
D = \arcsin(\cos L \cdot \cos A \cdot \cos h + \sin h \cdot \sin L)
\]

donde \(L\) es la latitud del observador, \(A\) el azimut y \(h\) la altitud angular del objetivo. La declinación \(D\) resultante se cruza con la tabla de declinación solar del año de referencia elegido para obtener las fechas candidatas.

Típicamente el resultado son **dos fechas simétricas** respecto al solsticio más cercano (antes y después), que tienen la misma declinación solar. Ambas son igualmente válidas; el investigador interpreta cuál es relevante según el contexto del sitio.

---

## 3. Diferencia con el Modo 1

| Dimensión | Modo 1 | Modo 2 |
|---|---|---|
| Pregunta central | ¿Hacia dónde apunta esta superficie? | ¿Qué fecha marca este punto del horizonte? |
| Objeto de estudio | El tallado o plano de la roca | El paisaje como calendario |
| Gesto del usuario | Espalda del teléfono apoyada en la roca | Cámara apuntando al objetivo lejano |
| Vector medido | Eje longitudinal del teléfono | Eje óptico de la cámara |
| Altitud angular | Inclinación de la superficie de la roca | Altitud angular del cerro u objetivo en el horizonte |
| Tradición científica | Orientación de estructuras | Astronomía de horizonte |
| Resultado típico | 2 fechas de alineación del plano | 2 fechas simétricas respecto al solsticio |

---

## 4. Interfaz del Modo 2

### 4.1 Feed de cámara en vivo

La pantalla muestra el **feed en tiempo real de la cámara trasera** del teléfono como fondo. El usuario apunta el teléfono hacia el objetivo en el horizonte mientras ve el entorno real en pantalla.

### 4.2 Retícula central (target)

Sobre el feed de cámara se superpone una **retícula fija** en el centro óptico de la pantalla. La retícula indica exactamente la dirección hacia la que apunta el eje óptico del teléfono, que es el vector que se usa para el cálculo. No es decorativa: es el instrumento de precisión del modo.

La retícula debe ser:
- Fija en el centro geométrico de la pantalla.
- Visualmente clara sobre cualquier fondo (usar color de alto contraste con borde o sombra).
- Simple: una cruz con círculo central, sin adornos que distraigan.

### 4.3 Datos en pantalla

Superpuestos sobre el feed de cámara (en overlay semitransparente), deben ser visibles en tiempo real:

- **Azimut** del eje óptico (grados, respecto al norte).
- **Altitud angular** del eje óptico (grados sobre/bajo el horizonte).
- **Fechas candidatas** (resultado del cálculo, actualizadas en tiempo real mientras el usuario mueve el teléfono).
- **Año de referencia** activo.
- **Indicador de GPS** (activo / sin señal).

### 4.4 Controles

- **Congelar lectura**: detiene todos los valores y el feed de cámara en el estado actual. Permite al usuario leer el resultado con calma sin mantener el teléfono quieto.
- **Capturar pantalla**: indica al usuario cómo tomar un pantallazo útil con toda la información visible.
- **Rueda de año**: mismo slider del Modo 1, para ajustar el año de referencia y ver cómo cambian las fechas.

### 4.5 Estabilidad de la medición

Dado que el usuario opera el teléfono en la mano o sobre un trípode apuntando a distancia, el **filtro de suavizado** de los sensores es crítico en este modo. Los valores de azimut y altitud angular deben suavizarse suficientemente para que las fechas no "parpadeen" con micro-movimientos, pero con una respuesta rápida cuando el usuario cambia intencionalmente de dirección.

---

## 5. Flujo principal del usuario (Modo 2)

1. El usuario selecciona **"Modo 2: Visión de Horizonte"** desde el selector de modos.
2. La app pide permiso de cámara (si no lo tiene ya).
3. Se activa el feed de cámara trasera con la retícula central superpuesta.
4. El usuario apunta hacia el elemento del horizonte (cerro, portada, formación) y centra el objetivo en la retícula.
5. Observa en tiempo real el azimut, la altitud angular y las fechas candidatas que se actualizan.
6. Ajusta el año de referencia con la rueda si es necesario.
7. Cuando está conforme con la lectura, presiona **"Congelar lectura"**.
8. Lee el resultado con calma y toma un pantallazo para documentar.

---

## 6. Datos de la medición (estructura)

Cada medición del Modo 2 genera la siguiente estructura:

```js
const horizonMeasurement = {
  mode: 'horizon',
  azimuth: Number,         // grados 0–360, norte geográfico
  horizonAltitude: Number, // grados de elevación del objetivo sobre el horizonte
  declination: Number,     // declinación solar calculada (resultado intermedio)
  lat: Number,
  lon: Number,
  altitude: Number,        // msnm del observador (GPS)
  year: Number,
  dates: [                 // fechas candidatas
    { month: Number, day: Number, score: Number },
    { month: Number, day: Number, score: Number }
  ],
  frozenAt: Date           // null si no se ha congelado
};
```

---

## 7. Selector de modos

Ambos modos son independientes y se accede a ellos mediante un **selector simple y visible** en la interfaz principal.

Para el MVP, el selector puede ser:
- Dos botones o tabs en la parte superior o inferior de la pantalla: **"Modo Roca"** y **"Modo Horizonte"**.
- Al cambiar de modo, la pantalla cambia completamente (layout distinto para cada uno).
- No se mezclan datos entre modos; cada uno opera de forma independiente.

Etiquetas sugeridas (breves y claras):
- Modo 1: **"Roca"** o **"Plano"**
- Modo 2: **"Horizonte"** o **"Visión"**

---

## 8. Lo que NO incluye el MVP del Modo 2

- No hay anotaciones ni almacenamiento persistente de mediciones (fase posterior).
- No hay exportación de datos (CSV, KML, JSON) – fase posterior.
- No hay integración con modelos digitales de terreno (DEM) para cálculo automático de altitud del horizonte – fase posterior.
- No hay overlay de trayectoria solar sobre el feed de cámara (AR avanzado) – fase posterior.
- No hay cálculo de otras estrellas ni cuerpos celestes – decisión del investigador con sus propias herramientas.

---

## 9. Consideraciones técnicas

- **Permiso de cámara**: requiere `getUserMedia({ video: { facingMode: 'environment' } })` en el navegador.
- **Orientación del teléfono**: en Modo 2 el teléfono está vertical (apuntando horizontalmente), lo que requiere calibrar correctamente el eje de pitch/roll para obtener la altitud angular real del eje óptico.
- **Declinación magnética**: el azimut debe corregirse por la declinación magnética local (diferencia entre norte magnético y norte geográfico) para obtener un azimut verdadero. Esto ya debe estar implementado en el servicio de orientación del Modo 1.
- **Rendimiento**: el feed de cámara + overlay + cálculo continuo en tiempo real debe mantenerse fluido en móviles de gama media; priorizar eficiencia en el bucle de actualización.

