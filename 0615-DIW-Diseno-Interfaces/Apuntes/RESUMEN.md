<!-- archivos:
CFGS FP - DAW - 001 - Diseño de interfaces web.pdf
CSS - Fuentes - Tokens de Diseño Tipográficos y Tipografía Fluida (Fluid Typography).pdf
Cursos CISCO.md
DigitechFP - Criterio calificativo.pdf
Introducción al diseño.pdf
-->
# Diseño de interfaces web — Resumen

> Hasta ahora se ha dado la **introducción al diseño** (las 5 claves y el color) y la **tipografía fluida con tokens**. Además, he resumido lo esencial de los 6 bloques de la guía (RA1-RA6) para que tengas una base de lo que vendrá.

## Cómo se evalúa (criterio del profesor)
| Por trimestre (cada uno 33 %) | Peso |
|---|---|
| **Examen o prueba** (al menos uno) | **60 %** |
| Presentaciones individuales o en grupo | 20 % |
| Proyectos y ejercicios prácticos | 20 % |

- **Todo es obligatorio**: si falta una entrega, se suspende el trimestre.
- **Una entrega tarde tiene como nota máxima un 5.**
- Solo se aceptan entregas durante el periodo lectivo, no en el de exámenes.

## 1. Introducción al diseño (lo que entra ya)
- **Diseño** viene del italiano *disegno* (designio): **prever la solución** a un problema. No es solo estética: en las apps internas de banca o de la Administración prima la **función**.
- **Interfaz**: vía de comunicación entre dos sistemas. La **interfaz de usuario** comunica personas y sistemas; si funciona sobre sistemas distribuidos, es una **interfaz web**.

### Las 5 claves del buen diseño
1. **Utilidad y valor**. Tres tipos de valor:
   - **Funcional**: resuelve necesidades (X sirve para opinar; Instagram, para mostrar gustos).
   - **Social**: la imagen que proyecta usarlo (compromiso político en X, estar en tendencia en Instagram).
   - **Emocional**: el vínculo con momentos de tu vida, que explica que sigas usándolo.
2. **Experiencia de uso**: satisfacción. Debe transmitir robustez, eficiencia y potencia, y a la vez sencillez, belleza y equilibrio.
3. **Resolución de problemas**: resolver mejor los problemas existentes o resolver problemas nuevos. Ejemplo: el **diseño adaptativo**, que recoloca el contenido según la pantalla.
4. **Durabilidad**: física (la estructura resiste) y cronológica (no queda desfasado).
5. **Anticipación de interacciones**: prever cómo lo usará la gente para evitar usos incorrectos.

### Color
- **Regla 60-30-10**: **60 %** color base (equilibrio), **30 %** secundario (equilibra con el base) y **10 %** de **acento** (llama la atención, por ejemplo en los botones de acción).
- **Combinaciones en el círculo cromático**:
  - **Análoga**: 3 colores contiguos; resultado armonioso.
  - **Complementaria**: 2 colores opuestos; máximo contraste (uno como principal y otro para los detalles).
  - **Monocromática**: un color en 3 tonos; resultado sobrio.
  - **Triádica**: 3 colores en triángulo; muy colorido.
- **Práctica 001**: analizar una app con las 5 claves y su colorimetría, y exponerla en unos 5 minutos con una presentación.

## 2. Tipografía fluida y tokens (CSS)
- **Tokens de diseño**: valores centralizados como **variables CSS** en `:root` (`--s`, `--m`, `--xl`…). Forman una *escala tipográfica basada en tokens*, como en un *design system*.
- **Tipografía fluida**: el texto escala de forma continua con el ancho de pantalla gracias a **`clamp(mín, preferido, máx)`**, combinando `rem` y `vw`, sin saltos de media query.
- **Escala modular**: cada nivel multiplica al anterior por un ratio. Se usa un ratio pequeño en móvil (**1.125-1.2**) y la **escala áurea (1.618)** en escritorio, porque en móvil 1.618 desbordaría los `h1`.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --s:  clamp(1rem, 0.95rem + 0.25vw, 1.125rem);   /* base / párrafo */
  --m:  clamp(1.15rem, 1rem + 0.8vw, 1.5rem);      /* h4 */
  --xl: clamp(1.6rem, 1.2rem + 2vw, 2.5rem);       /* h2 */
  --xxl: clamp(2rem, 1.4rem + 3vw, 3.25rem);       /* h1 */
  --leading-tight: 1.15;  --leading-normal: 1.5;   /* interlineado */
}
h1 { font-size: var(--xxl); line-height: var(--leading-tight); }
p  { font-size: var(--s);   line-height: var(--leading-normal); }
```
- `1rem` = el tamaño de letra raíz (16 px por defecto). Usa **`rem`** para los tamaños y `line-height` sin unidad (por ejemplo 1.5).

## 3. Lo esencial de cada bloque de la guía (para lo que viene)

### RA1 · Planificación
- **UI frente a UX**: UI es la interfaz visual; UX es la experiencia completa.
- **Principios de composición**: equilibrio, contraste, alineación, proximidad, repetición, espacio en blanco, jerarquía visual y consistencia.
- **Tipografía**: serif o sans-serif, jerarquía, peso, interlineado, longitud de línea (unos 60-75 caracteres).
- **Prototipado, de menos a más detalle**: boceto → **wireframe** (estructura) → **mockup** (aspecto visual) → **prototipo** navegable. Herramientas: Figma o Penpot.
- **Guía de estilo** (colores, tipografías, componentes, estados) → **design system** (tokens y componentes reutilizables).

### RA2 · CSS
- **Especificidad** (de menos a más): elemento < clase, atributo o pseudoclase < `#id` < estilo *inline* < `!important` (evítalo).
- **Modelo de caja**: `content` + `padding` + `border` + `margin`. Con `box-sizing: border-box`, el `width` incluye el padding y el borde.
- **Flexbox** (una dimensión): `display:flex; justify-content; align-items; gap; flex-wrap`.
- **Grid** (dos dimensiones): `display:grid; grid-template-columns: repeat(3, 1fr); gap`.
- **Responsive**:
  - *mobile first* (estilos base para móvil y luego `@media (min-width: 768px)`);
  - `<meta name="viewport" content="width=device-width, initial-scale=1">`;
  - unidades relativas: `rem`, `em`, `%`, `vw`, `vh`.
- **Frameworks** (Bootstrap, Tailwind) y **Sass/SCSS** (variables, anidamiento, mixins; se compila a CSS). La metodología **BEM** se escribe `bloque__elemento--modificador`.

### RA3-RA4 · Multimedia
- **Formatos de imagen**:
  - **JPG**: con pérdida, para fotos.
  - **PNG**: sin pérdida, con transparencia.
  - **GIF**: animación y 256 colores.
  - **SVG**: vectorial.
  - **WebP** y **AVIF**: formatos modernos, ligeros.
- **Licencias**: copyright, **Creative Commons**, dominio público; atribuye siempre.
- **HTML**: `<img alt>`, `<picture>` y `srcset` (imágenes responsive), `<audio>` y `<video controls poster>` con `<track>` para los subtítulos; `loading="lazy"`.
- **CSS**: `transition`, `transform` y `@keyframes` para las animaciones.

### RA5 · Accesibilidad
- Normas **W3C → WAI → WCAG**.
- Los **4 principios POUR**: **P**erceptible, **O**perable, **C**omprensible (*Understandable*), **R**obusto.
- **Niveles de conformidad**: A, **AA** (el habitual) y AAA.
- **Prácticas clave**:
  - `alt` en las imágenes (vacío si son decorativas);
  - contraste suficiente;
  - no transmitir información **solo** con el color;
  - navegación por teclado con el foco visible;
  - cada campo de formulario con su `<label>`;
  - HTML semántico (`header`, `nav`, `main`, `footer`) y ARIA solo cuando haga falta.
- **Herramientas**: Lighthouse, WAVE, axe. La accesibilidad también ayuda al **SEO técnico** (títulos, encabezados, URLs claras).

### RA6 · Usabilidad
- **Usabilidad**: eficacia, eficiencia, satisfacción, facilidad de aprendizaje y prevención de errores.
- **Heurísticas de Nielsen** (las más citadas): visibilidad del estado, coincidencia con el mundo real, control y libertad del usuario, consistencia, prevención de errores, reconocer mejor que recordar, flexibilidad, diseño minimalista, ayuda para recuperarse de los errores, ayuda y documentación.
- **Evaluación**: evaluación heurística, test con usuarios, pruebas *cross-browser* y *cross-device*.

## Lo más importante para el examen
1. Las **5 claves del buen diseño** y los **3 tipos de valor**, con un ejemplo de cada uno.
2. La **regla 60-30-10** y las **4 combinaciones de color** (análoga, complementaria, monocromática, triádica).
3. **Tipografía fluida**: qué hace `clamp()`, por qué se combinan `rem` y `vw`, qué son los tokens y por qué el ratio cambia entre móvil y escritorio.
4. Diferencias entre wireframe, mockup y prototipo, y entre UI y UX.
5. Ten en cuenta que **el examen vale el 60 %** y que una entrega fuera de plazo tiene como máximo un 5.
