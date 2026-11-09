# Dashboard de tareas DAW — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensión de Chrome minimalista que lista las tareas pendientes del campus, se actualiza con un botón, abre directamente el formulario de entrega y crea fichas y adjuntos nuevos en la carpeta DAW.

**Architecture:** Extensión MV3 sin empaquetar en `DAW/dashboard/`. Las funciones puras (`logica.js`, `markdown.js`) se prueban con `node --test`. Los módulos de navegador (`campus.js` lee Moodle con la sesión de Chrome; `carpeta.js` escribe con la File System Access API) los usa `app.js`, que pinta la interfaz.

**Tech Stack:** JavaScript con módulos ES, sin dependencias ni build. Chrome MV3, File System Access API, IndexedDB, `chrome.storage.local`. Node 24 para los tests.

**Spec:** `docs/superpowers/specs/2026-11-10-dashboard-design.md`

## Global Constraints

- Campus: `https://campus.digitechfp.com`. Única petición de permiso de host: `https://campus.digitechfp.com/*`.
- Nada de tokens ni contraseñas: solo la sesión de Chrome del usuario.
- Una ficha existente **nunca** se sobrescribe; se reconoce por el `id=` del campus que contiene.
- Formato de nombre de ficha: `AAAA-MM-DD - <nombre limpio, 70 caracteres máx.>.md` o `sin-fecha - …`, idéntico al generador anterior.
- Examen = `quiz`, o nombre que empieza por "Evaluación N" o contiene "examen" o "prueba".
- "Abierta todo el curso" = cierre en un año posterior a 2027; va en "Sin fecha" y nunca cuenta como vencida.
- Botón principal de cada tarjeta: **Entregar** → `…/mod/assign/view.php?id=N&action=editsubmission` (en un quiz, su `view.php`).
- Ruta de VS Code por defecto: `C:\Users\fabri\Desktop\DAW`, editable en ⚙ y guardada por portátil.
- El texto que viene del campus se inserta en la página solo con `textContent`, nunca con `innerHTML`.
- Sin dependencias npm.

## Review Focus

1. **Ficha renombrada o con nombre repetido:** la tarea se reconoce por su id y no se duplica. Dos tareas distintas con el mismo nombre de ficha reciben `… (id).md`. *Tests: `idDeFicha` y `rutaLibre`, Task 1.*
2. **Cierre en 2029/2032 o sin fecha:** sale en "Sin fecha", nunca como vencida ni como "hoy". *Tests: `estado` y `franja`, Task 1.*
3. **Adjunto con caracteres no válidos en Windows o con " (1)":** se guarda con un nombre limpio. *Test: `nombreArchivo`, Task 1.*
4. **Sesión del campus caducada:** aviso "Inicia sesión en el campus" y se conservan los datos anteriores. *Test: `esPaginaLogin`, Task 1; comprobación manual, Task 5.*
5. **Enunciado con HTML o `<script>`:** se ve como texto, no se ejecuta. *Test: `fichaMd` lo conserva literal, Task 2; comprobación manual de `textContent`, Task 5.*

---

## Estructura de archivos

```
dashboard/
├── package.json        {"type":"module"} para que Node cargue los .js como módulos
├── manifest.json       MV3
├── background.js       clic en el icono → abre dashboard.html
├── dashboard.html      estructura de la página
├── style.css           estilos minimalistas, claro y oscuro
├── logica.js           puro: módulos, fechas, clasificación, nombres, estados, agrupación
├── markdown.js         puro: ficha, README de módulo, PENDIENTES.md
├── campus.js           navegador: lee el campus → { fecha, cursos, tareas, fallos }
├── carpeta.js          navegador: elegir carpeta, permisos, leer y escribir, buscar fichas
├── app.js              navegador: estado, actualizar, volcar a carpeta, pintar, atajos
├── datos/              campus.json y marcas.json (los escribe la extensión)
└── tests/
    ├── logica.test.js
    └── markdown.test.js
```

**Modelo de tarea** (lo produce `campus.js` y lo consume todo lo demás):

```js
{
  id: '68288',              // id del módulo del curso (cmid), string
  curso: '761',             // id del curso, string
  cursoNombre: 'DAW - 0613. Desarrollo web en entorno servidor',
  mod: 'assign',            // 'assign' | 'quiz'
  nombre: 'Práctica Update',
  seccion: '1ª Evaluación',
  apertura: '2026-11-05T08:20:00.000Z', // ISO o null
  cierre: '2026-11-10T10:15:00.000Z',   // ISO o null
  entrega: 'Todavía no se han realizado envíos',
  calif: 'Sin calificar',
  enunciado: 'texto con saltos de línea',
  adjuntos: [{ nombre: 'practica_update.pdf', url: 'https://campus…/pluginfile.php/…' }],
  error: false              // true si no se pudo leer (solo dentro de campus.js y app.js)
}
```

---

### Task 1: Lógica pura (`logica.js`)

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/logica.js`
- Test: `dashboard/tests/logica.test.js`

**Interfaces:**
- Produces: `CAMPUS`, `MODULOS`, `infoModulo(cursoId, nombreCompleto)`, `modDe(t)`, `parseFecha(etiqueta, texto) → Date|null`, `esExamen(t)`, `slug(s, n=70)`, `nombreFicha(t)`, `rutaFicha(t)`, `rutaLibre(ruta, id, ocupadas:Set)`, `idDeFicha(texto) → string|null`, `nombreArchivo(url)`, `estado(t, marcas, ahora) → 'hecha'|'entregada'|'vencida'|'pendiente'`, `franja(t, ahora) → 'hoy'|'manana'|'semana'|'despues'|'sinfecha'`, `cuentaAtras(cierre, ahora)`, `urgencia(t, ahora) → 'alta'|'media'|''`, `urlEntrega(t)`, `urlCampus(t)`, `esPaginaLogin(url)`, `fmt(fecha)`, `porCierre(a, b)`, `agrupar(tareas, marcas, ahora, filtro) → {hoy, manana, semana, despues, sinfecha, vencidas, entregadas}`

- [ ] **Step 1: Crear `dashboard/package.json`**

```json
{
  "name": "daw-dashboard",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 2: Escribir los tests que fallan** en `dashboard/tests/logica.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFecha, esExamen, slug, nombreFicha, rutaFicha, rutaLibre, idDeFicha, nombreArchivo,
  estado, franja, cuentaAtras, urlEntrega, esPaginaLogin, agrupar, infoModulo, fmt,
} from '../logica.js';

const T = (o = {}) => ({ id: '1', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Tarea', seccion: '',
  apertura: null, cierre: null, entrega: '', calif: '', enunciado: '', adjuntos: [], ...o });
const ahora = new Date(2026, 10, 10, 9, 0); // martes 10/11/2026 09:00

test('parseFecha lee fechas del campus en español', () => {
  const txt = 'Apertura: jueves, 5 de noviembre de 2026, 09:20 Cierre: martes, 10 de noviembre de 2026, 11:15';
  assert.deepEqual(parseFecha('Apertura', txt), new Date(2026, 10, 5, 9, 20));
  assert.deepEqual(parseFecha('Cierre', txt), new Date(2026, 10, 10, 11, 15));
  assert.deepEqual(parseFecha('Cierre', 'Cierre: miércoles, 18 de noviembre de 2026, 23:59'), new Date(2026, 10, 18, 23, 59));
  assert.equal(parseFecha('Cierre', 'Apertura: jueves, 5 de noviembre de 2026, 09:20'), null);
  assert.equal(parseFecha('Cierre', ''), null);
});

test('esExamen distingue exámenes de tareas', () => {
  assert.ok(esExamen(T({ mod: 'quiz', nombre: 'V&G Review' })));
  assert.ok(esExamen(T({ nombre: 'Evaluación 1B 20%' })));
  assert.ok(esExamen(T({ nombre: 'Prueba final' })));
  assert.ok(!esExamen(T({ nombre: 'Initial review of grammatical topics' })));
  assert.ok(!esExamen(T({ nombre: 'Ejercicios de Tarea Evaluados.' })));
});

test('nombreFicha coincide con las fichas ya generadas', () => {
  assert.equal(nombreFicha(T({ nombre: 'Práctica Update', cierre: new Date(2026, 10, 10, 11, 15).toISOString() })),
    '2026-11-10 - Práctica Update.md');
  assert.equal(nombreFicha(T({ mod: 'quiz', nombre: 'V&amp;G Review' })), 'sin-fecha - V&G Review.md');
  assert.equal(nombreFicha(T({ nombre: 'Unit 2. Past Tenses - Speaking and Grammar Exercises - Deadline: 13/11/2026',
    cierre: new Date(2026, 10, 13, 14, 0).toISOString() })),
    '2026-11-13 - Unit 2. Past Tenses - Speaking and Grammar Exercises - Deadline 131120.md');
  assert.equal(slug('Actividad evaluable 1: “Si tuviera que comprarme un coche…”'), 'Actividad evaluable 1 Si tuviera que comprarme un coche…');
});

test('rutaFicha separa Tareas y Examenes por módulo', () => {
  assert.equal(rutaFicha(T({ nombre: 'Práctica Insert' })), '0613-DWES-Entorno-Servidor/Tareas/sin-fecha - Práctica Insert.md');
  assert.equal(rutaFicha(T({ curso: '759', nombre: 'Evaluación 1 C 20%' })), '0612-DWEC-Entorno-Cliente/Examenes/sin-fecha - Evaluación 1 C 20%.md');
});

test('infoModulo genera una carpeta para módulos desconocidos', () => {
  const m = infoModulo('999', 'DAW - 0000. Módulo nuevo');
  assert.equal(m.titulo, '0000. Módulo nuevo');
  assert.equal(m.carpeta, '0000.-Módulo-nuevo');
});

test('idDeFicha y rutaLibre evitan duplicados (Review Focus 1)', () => {
  assert.equal(idDeFicha('- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68320\n'), '68320');
  assert.equal(idDeFicha('sin enlace'), null);
  const ocupadas = new Set(['A/Tareas/sin-fecha - P1.md']);
  assert.equal(rutaLibre('A/Tareas/sin-fecha - P1.md', '42', ocupadas), 'A/Tareas/sin-fecha - P1 (42).md');
  assert.equal(rutaLibre('A/Tareas/otra.md', '42', ocupadas), 'A/Tareas/otra.md');
});

test('nombreArchivo limpia nombres de adjuntos (Review Focus 3)', () => {
  assert.equal(nombreArchivo('https://x/pluginfile.php/1/mod_assign/introattachment/0/Pr%C3%A1ctica%20Insert.pdf?forcedownload=1'), 'Práctica Insert.pdf');
  assert.equal(nombreArchivo('https://x/a/Task%201.%20Professional%20Profile%20%282%29.pdf'), 'Task 1. Professional Profile.pdf');
  assert.equal(nombreArchivo('https://x/a/raro%3A%3Fnombre%2A.pdf'), 'raronombre.pdf');
});

test('estado: hecha > entregada > vencida > pendiente', () => {
  const pasada = new Date(2026, 10, 3).toISOString();
  assert.equal(estado(T({ id: '5', cierre: pasada }), { 5: '2026-11-04' }, ahora), 'hecha');
  assert.equal(estado(T({ entrega: 'Enviado para calificar', cierre: pasada }), {}, ahora), 'entregada');
  assert.equal(estado(T({ entrega: 'Todavía no se han realizado envíos', cierre: pasada }), {}, ahora), 'vencida');
  assert.equal(estado(T({ cierre: new Date(2026, 10, 13).toISOString() }), {}, ahora), 'pendiente');
});

test('cierres lejanos o sin fecha nunca vencen ni salen hoy (Review Focus 2)', () => {
  const lejos = T({ cierre: new Date(2032, 9, 24).toISOString() });
  assert.equal(estado(lejos, {}, ahora), 'pendiente');
  assert.equal(franja(lejos, ahora), 'sinfecha');
  assert.equal(franja(T(), ahora), 'sinfecha');
});

test('franja agrupa por cercanía', () => {
  assert.equal(franja(T({ cierre: new Date(2026, 10, 10, 11, 15).toISOString() }), ahora), 'hoy');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 11, 23, 59).toISOString() }), ahora), 'manana');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 13, 0, 0).toISOString() }), ahora), 'semana');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 20, 23, 59).toISOString() }), ahora), 'despues');
});

test('cuentaAtras es legible', () => {
  assert.equal(cuentaAtras(new Date(2026, 10, 10, 11, 15).toISOString(), ahora), 'hoy 11:15');
  assert.equal(cuentaAtras(new Date(2026, 10, 11, 23, 59).toISOString(), ahora), 'mañana 23:59');
  assert.equal(cuentaAtras(new Date(2026, 10, 13, 0, 0).toISOString(), ahora), 'en 3 días');
  assert.equal(cuentaAtras(new Date(2026, 10, 20, 23, 59).toISOString(), ahora), '20/11');
  assert.equal(cuentaAtras(new Date(2026, 10, 3).toISOString(), ahora), 'hace 7 días');
  assert.equal(cuentaAtras(null, ahora), 'sin fecha');
  assert.equal(cuentaAtras(new Date(2032, 0, 1).toISOString(), ahora), 'abierta');
});

test('urlEntrega abre el formulario de envío directamente', () => {
  assert.equal(urlEntrega(T({ id: '68288' })), 'https://campus.digitechfp.com/mod/assign/view.php?id=68288&action=editsubmission');
  assert.equal(urlEntrega(T({ id: '7', mod: 'quiz' })), 'https://campus.digitechfp.com/mod/quiz/view.php?id=7');
});

test('esPaginaLogin detecta la redirección al login (Review Focus 4)', () => {
  assert.ok(esPaginaLogin('https://campus.digitechfp.com/login/index.php'));
  assert.ok(!esPaginaLogin('https://campus.digitechfp.com/my/'));
});

test('agrupar filtra, clasifica y ordena', () => {
  const ts = [
    T({ id: 'a', nombre: 'Práctica Update', cierre: new Date(2026, 10, 10, 11, 15).toISOString() }),
    T({ id: 'b', nombre: 'Otra', cierre: new Date(2026, 10, 3).toISOString() }),
    T({ id: 'c', nombre: 'Hecha', entrega: 'Enviado para calificar' }),
    T({ id: 'd', nombre: 'Practica Insert', cierre: new Date(2026, 10, 10, 10, 0).toISOString() }),
  ];
  const g = agrupar(ts, {}, ahora, '');
  assert.deepEqual(g.hoy.map(t => t.id), ['d', 'a']);
  assert.deepEqual(g.vencidas.map(t => t.id), ['b']);
  assert.deepEqual(g.entregadas.map(t => t.id), ['c']);
  assert.deepEqual(agrupar(ts, {}, ahora, 'practica').hoy.map(t => t.id), ['d', 'a']); // sin tildes
  assert.deepEqual(agrupar(ts, {}, ahora, 'servidor').hoy.length, 2);                 // por módulo
});

test('fmt formatea fechas o devuelve una raya', () => {
  assert.equal(fmt(new Date(2026, 10, 10, 9, 5)), '10/11/2026 09:05');
  assert.equal(fmt(null), '—');
});
```

- [ ] **Step 3: Ejecutar los tests y ver que fallan**

Run: `cd dashboard && node --test`
Expected: FAIL con `Cannot find module '…/logica.js'`

- [ ] **Step 4: Implementar `dashboard/logica.js`**

```js
// Funciones puras del dashboard: sin navegador ni red.
export const CAMPUS = 'https://campus.digitechfp.com';

export const MODULOS = {
  '759': { carpeta: '0612-DWEC-Entorno-Cliente', titulo: '0612. Desarrollo web en entorno cliente', corto: 'Cliente', color: '#d4a000' },
  '761': { carpeta: '0613-DWES-Entorno-Servidor', titulo: '0613. Desarrollo web en entorno servidor', corto: 'Servidor', color: '#7c5cff' },
  '764': { carpeta: '0614-Despliegue-Aplicaciones', titulo: '0614. Despliegue de aplicaciones web', corto: 'Despliegue', color: '#0f9d8a' },
  '765': { carpeta: '0615-DIW-Diseno-Interfaces', titulo: '0615. Diseño de interfaces web', corto: 'Interfaces', color: '#e5487a' },
  '762': { carpeta: 'COM314-Ciberseguridad', titulo: 'COM314. Ciberseguridad', corto: 'Ciberseg.', color: '#e8590c' },
  '768': { carpeta: '0179-Ingles-Profesional', titulo: '0179. Inglés profesional', corto: 'Inglés', color: '#1c7ed6' },
  '767': { carpeta: '1708-Sostenibilidad', titulo: '1708. Sostenibilidad aplicada al sistema productivo', corto: 'Sostenib.', color: '#2f9e44' },
  '801': { carpeta: '1665-Digitalizacion', titulo: '1665. Digitalización aplicada al sistema productivo', corto: 'Digitaliz.', color: '#4c6ef5' },
  '766': { carpeta: '1710-IPE-II', titulo: '1710. Itinerario para la empleabilidad II', corto: 'IPE II', color: '#ae3ec9' },
  '820': { carpeta: 'Practicas-Empresa', titulo: 'Prácticas (estancia en empresa)', corto: 'Prácticas', color: '#868e96' },
  '760': { carpeta: 'Tutoria', titulo: 'Tutoría 2º', corto: 'Tutoría', color: '#868e96' },
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ANIO_ABIERTA = 2027; // cierres posteriores = carpeta abierta todo el curso
const pad = n => String(n).padStart(2, '0');
const aFecha = f => (f ? new Date(f) : null);
const inicioDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diasEntre = (a, b) => Math.round((inicioDia(b) - inicioDia(a)) / 864e5);
const normalizar = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function slug(s, n = 70) {
  const r = (s || '').replace(/[<>:"/\\|?*\u201c\u201d]/g, '').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').replace(/^[ .-]+|[ .-]+$/g, '');
  return r.slice(0, n).replace(/[ .-]+$/, '');
}

export function infoModulo(cursoId, nombreCompleto = '') {
  if (MODULOS[cursoId]) return MODULOS[cursoId];
  const titulo = nombreCompleto.replace(/^DAW(\/\w+)? - /, '') || `Módulo ${cursoId}`;
  return { carpeta: slug(titulo, 40).replace(/\s+/g, '-'), titulo, corto: titulo.slice(0, 10), color: '#868e96' };
}
export const modDe = t => infoModulo(t.curso, t.cursoNombre);

export function parseFecha(etiqueta, texto) {
  const re = new RegExp(`${etiqueta}:\\s*[^,\\d]+, (\\d{1,2}) de (\\p{L}+) de (\\d{4}), (\\d{1,2}):(\\d{2})`, 'u');
  const m = (texto || '').match(re);
  if (!m) return null;
  const mes = MESES.indexOf(m[2].toLowerCase());
  return mes < 0 ? null : new Date(+m[3], mes, +m[1], +m[4], +m[5]);
}

export const esExamen = t => t.mod === 'quiz' || /^evaluaci[oó]n \d|examen|prueba/i.test(t.nombre);

export function nombreFicha(t) {
  const c = aFecha(t.cierre);
  const pref = c ? `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}` : 'sin-fecha';
  return `${pref} - ${slug(t.nombre)}.md`;
}
export const rutaFicha = t => `${modDe(t).carpeta}/${esExamen(t) ? 'Examenes' : 'Tareas'}/${nombreFicha(t)}`;
export const rutaLibre = (ruta, id, ocupadas) => (ocupadas.has(ruta) ? ruta.replace(/\.md$/, ` (${id}).md`) : ruta);
export const idDeFicha = texto => (texto || '').match(/view\.php\?id=(\d+)/)?.[1] ?? null;

export function nombreArchivo(url) {
  const ultimo = decodeURIComponent(url.split('?')[0].split('/').pop() || 'archivo');
  return ultimo.replace(/ \(\d+\)(?=\.[^.]+$)/, '').replace(/[<>:"/\\|?*]/g, '').trim() || 'archivo';
}

export function estado(t, marcas = {}, ahora = new Date()) {
  if (marcas[t.id]) return 'hecha';
  if (/Enviado/.test(t.entrega || '')) return 'entregada';
  const c = aFecha(t.cierre);
  if (c && c.getFullYear() <= ANIO_ABIERTA && c < ahora) return 'vencida';
  return 'pendiente';
}

export function franja(t, ahora = new Date()) {
  const c = aFecha(t.cierre);
  if (!c || c.getFullYear() > ANIO_ABIERTA) return 'sinfecha';
  const d = diasEntre(ahora, c);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'manana';
  return d < 7 ? 'semana' : 'despues';
}

export function cuentaAtras(cierre, ahora = new Date()) {
  const c = aFecha(cierre);
  if (!c) return 'sin fecha';
  if (c.getFullYear() > ANIO_ABIERTA) return 'abierta';
  const d = diasEntre(ahora, c);
  const hora = `${pad(c.getHours())}:${pad(c.getMinutes())}`;
  if (d < 0) return `hace ${-d} ${d === -1 ? 'día' : 'días'}`;
  if (d === 0) return `hoy ${hora}`;
  if (d === 1) return `mañana ${hora}`;
  if (d < 7) return `en ${d} días`;
  return `${pad(c.getDate())}/${pad(c.getMonth() + 1)}`;
}

export function urgencia(t, ahora = new Date()) {
  const f = franja(t, ahora);
  return f === 'hoy' || f === 'manana' ? 'alta' : f === 'semana' ? 'media' : '';
}

export const urlCampus = t => `${CAMPUS}/mod/${t.mod}/view.php?id=${t.id}`;
export const urlEntrega = t => (t.mod === 'assign' ? `${urlCampus(t)}&action=editsubmission` : urlCampus(t));
export const esPaginaLogin = url => /\/login\/index\.php/.test(url || '');

export function fmt(f) {
  const d = aFecha(f);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '—';
}
export const porCierre = (a, b) => (a.cierre || '9999').localeCompare(b.cierre || '9999');

export function agrupar(tareas, marcas = {}, ahora = new Date(), filtro = '') {
  const g = { hoy: [], manana: [], semana: [], despues: [], sinfecha: [], vencidas: [], entregadas: [] };
  const f = normalizar(filtro.trim());
  for (const t of tareas) {
    const m = modDe(t);
    if (f && !normalizar(`${t.nombre} ${m.titulo} ${m.corto}`).includes(f)) continue;
    const e = estado(t, marcas, ahora);
    if (e === 'entregada' || e === 'hecha') g.entregadas.push(t);
    else if (e === 'vencida') g.vencidas.push(t);
    else g[franja(t, ahora)].push(t);
  }
  for (const k in g) g[k].sort(porCierre);
  g.vencidas.reverse();   // las más recientes primero
  g.entregadas.reverse();
  return g;
}
```

- [ ] **Step 5: Ejecutar los tests y ver que pasan**

Run: `cd dashboard && node --test`
Expected: PASS, 15 tests

- [ ] **Step 6: Commit**

```bash
git add dashboard/package.json dashboard/logica.js dashboard/tests/logica.test.js
git commit -m "Dashboard: lógica pura de fechas, estados y nombres de fichas"
```

---

### Task 2: Generación de Markdown (`markdown.js`)

**Files:**
- Create: `dashboard/markdown.js`
- Test: `dashboard/tests/markdown.test.js`

**Interfaces:**
- Consumes: de `logica.js`: `CAMPUS`, `fmt`, `modDe`, `urlCampus`, `rutaFicha`, `estado`, `esExamen`, `agrupar`, `porCierre`
- Produces: `fichaMd(t, ruta, adjuntos:string[]) → string`, `readmeModulo(mod, curso:{id, aula}, tareas, marcas, ahora, rutas:{id→ruta}) → string`, `pendientesMd(tareas, marcas, ahora, rutas) → string`

- [ ] **Step 1: Escribir los tests que fallan** en `dashboard/tests/markdown.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fichaMd, readmeModulo, pendientesMd } from '../markdown.js';
import { MODULOS } from '../logica.js';

const ahora = new Date(2026, 10, 10, 9, 0);
const T = (o = {}) => ({ id: '68288', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Práctica Update',
  seccion: '1ª Evaluación', apertura: new Date(2026, 10, 5, 9, 20).toISOString(),
  cierre: new Date(2026, 10, 10, 11, 15).toISOString(), entrega: 'Todavía no se han realizado envíos',
  calif: 'Sin calificar', enunciado: 'Línea 1\nLínea 2', adjuntos: [], ...o });

test('fichaMd sigue el formato de las fichas existentes', () => {
  const md = fichaMd(T(), '0613-DWES-Entorno-Servidor/Tareas/2026-11-10 - Práctica Update.md', ['practica_update.pdf']);
  assert.ok(md.startsWith('# Práctica Update\n\n- **Módulo:** 0613. Desarrollo web en entorno servidor\n'));
  assert.ok(md.includes('- **Apertura:** 05/11/2026 09:20\n- **Cierre:** 10/11/2026 11:15\n'));
  assert.ok(md.includes('- **Estado de la entrega:** Todavía no se han realizado envíos\n- **Calificación:** Sin calificar\n'));
  assert.ok(md.includes('- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68288\n'));
  assert.ok(md.includes('## Enunciado\n\nLínea 1\nLínea 2\n'));
  assert.ok(md.includes('- [practica_update.pdf](2026-11-10%20-%20Pr%C3%A1ctica%20Update/practica_update.pdf)'));
  assert.ok(md.includes('carpeta `2026-11-10 - Práctica Update/`'));
});

test('fichaMd de un cuestionario no lleva estado de entrega', () => {
  const md = fichaMd(T({ mod: 'quiz', entrega: '', calif: '' }), 'X/Examenes/a.md', []);
  assert.ok(!md.includes('Estado de la entrega'));
  assert.ok(!md.includes('## Archivos adjuntos'));
});

test('fichaMd conserva literalmente el HTML del enunciado (Review Focus 5)', () => {
  const md = fichaMd(T({ enunciado: '<script>alert(1)</script> <?php echo $x; ?>' }), 'X/Tareas/a.md', []);
  assert.ok(md.includes('<script>alert(1)</script> <?php echo $x; ?>'));
});

test('readmeModulo lista tareas con iconos y enlaces relativos', () => {
  const ts = [T(), T({ id: '2', nombre: 'Vieja', cierre: new Date(2026, 9, 1).toISOString() }),
    T({ id: '3', nombre: 'Hecha | con barra', entrega: 'Enviado para calificar' })];
  const md = readmeModulo(MODULOS['761'], { id: '761', aula: 'https://teams.microsoft.com/meet/1' }, ts, {}, ahora,
    { 68288: '0613-DWES-Entorno-Servidor/Tareas/2026-11-10 - Práctica Update.md' });
  assert.ok(md.startsWith('# 0613. Desarrollo web en entorno servidor\n\n- **Campus:** https://campus.digitechfp.com/course/view.php?id=761\n- **Aula virtual (Teams):** https://teams.microsoft.com/meet/1\n'));
  assert.ok(md.includes('| ⏳ | 10/11/2026 11:15 | [Práctica Update](Tareas/2026-11-10%20-%20Pr%C3%A1ctica%20Update.md) |'));
  assert.ok(md.includes('| ❌ | 01/10/2026 00:00 | [Vieja]'));
  assert.ok(md.includes('[Hecha \\| con barra]'));
  assert.ok(md.indexOf('Vieja') < md.indexOf('Práctica Update')); // ordenado por cierre
});

test('pendientesMd separa próximas, sin fecha y vencidas, y respeta las marcas', () => {
  const ts = [T(), T({ id: '2', nombre: 'Vieja', cierre: new Date(2026, 9, 1).toISOString() }),
    T({ id: '3', nombre: 'Abierta', cierre: new Date(2032, 0, 1).toISOString() }),
    T({ id: '4', nombre: 'En papel', cierre: new Date(2026, 9, 2).toISOString() })];
  const md = pendientesMd(ts, { 4: '2026-11-01' }, ahora, {});
  const [proximas, resto] = md.split('## Sin fecha');
  assert.ok(proximas.includes('Práctica Update'));
  assert.ok(resto.split('## Vencidas')[0].includes('Abierta'));
  assert.ok(resto.split('## Vencidas')[1].includes('Vieja'));
  assert.ok(!md.includes('En papel'));
});
```

- [ ] **Step 2: Ejecutar los tests y ver que fallan**

Run: `cd dashboard && node --test`
Expected: FAIL con `Cannot find module '…/markdown.js'`

- [ ] **Step 3: Implementar `dashboard/markdown.js`**

```js
// Genera los Markdown de la carpeta DAW. Puro: recibe datos, devuelve texto.
import { CAMPUS, fmt, modDe, urlCampus, rutaFicha, estado, esExamen, agrupar, porCierre } from './logica.js';

const enlace = ruta => ruta.split('/').map(encodeURIComponent).join('/');
const celda = s => (s || '').replace(/\|/g, '\\|');
const ICONO = { entregada: '✅', hecha: '✅', pendiente: '⏳', vencida: '❌' };

export function fichaMd(t, ruta, adjuntos = []) {
  const carpeta = ruta.split('/').pop().replace(/\.md$/, '');
  const L = [`# ${t.nombre}`, '', `- **Módulo:** ${modDe(t).titulo}`, `- **Sección:** ${t.seccion || '—'}`,
    `- **Apertura:** ${fmt(t.apertura)}`, `- **Cierre:** ${fmt(t.cierre)}`];
  if (t.mod === 'assign') L.push(`- **Estado de la entrega:** ${t.entrega || '—'}`, `- **Calificación:** ${t.calif || '—'}`);
  L.push(`- **En el campus:** ${urlCampus(t)}`, '', '## Enunciado', '', t.enunciado || '_Sin descripción en el campus._', '');
  if (adjuntos.length) L.push('## Archivos adjuntos', '', ...adjuntos.map(n => `- [${n}](${enlace(`${carpeta}/${n}`)})`), '');
  L.push('## Mi solución', '', `_Guarda tu código y notas en la carpeta \`${carpeta}/\`, junto a los adjuntos._`, '');
  return L.join('\n');
}

export function readmeModulo(mod, curso, tareas, marcas, ahora, rutas = {}) {
  const L = [`# ${mod.titulo}`, '', `- **Campus:** ${CAMPUS}/course/view.php?id=${curso.id}`];
  if (curso.aula) L.push(`- **Aula virtual (Teams):** ${curso.aula}`);
  const grupos = [['Exámenes y evaluaciones', tareas.filter(esExamen)], ['Tareas', tareas.filter(t => !esExamen(t))]];
  for (const [titulo, grupo] of grupos) {
    if (!grupo.length) continue;
    L.push('', `## ${titulo}`, '', '| | Cierre | Nombre | Entrega | Calificación |', '|---|---|---|---|---|');
    for (const t of [...grupo].sort(porCierre)) {
      const rel = (rutas[t.id] || rutaFicha(t)).split('/').slice(1).join('/');
      L.push(`| ${ICONO[estado(t, marcas, ahora)]} | ${fmt(t.cierre)} | [${celda(t.nombre)}](${enlace(rel)}) | ${t.entrega || '—'} | ${t.calif || '—'} |`);
    }
  }
  L.push('', '## Apuntes', '', 'Ver [Apuntes/README.md](Apuntes/README.md)', '',
    'Leyenda: ✅ entregada o hecha · ⏳ pendiente · ❌ vencida sin entregar', '');
  return L.join('\n');
}

export function pendientesMd(tareas, marcas, ahora, rutas = {}) {
  const g = agrupar(tareas, marcas, ahora);
  const cab = ['| Cierre | Módulo | Tarea |', '|---|---|---|'];
  const fila = t => {
    const m = modDe(t);
    return `| ${fmt(t.cierre)} | ${m.titulo.split('. ').slice(1).join('. ') || m.titulo} | [${celda(t.nombre)}](${enlace(rutas[t.id] || rutaFicha(t))}) |`;
  };
  return ['# Pendientes', '', `_Generado por el dashboard el ${fmt(ahora)}._`, '',
    '## Próximas entregas (sin entregar)', '', ...cab, ...[...g.hoy, ...g.manana, ...g.semana, ...g.despues].map(fila), '',
    '## Sin fecha o abiertas todo el curso', '', ...cab, ...g.sinfecha.map(fila), '',
    '## Vencidas sin entrega', '', 'Si la entregaste en papel o en clase, márcala como hecha (✓) en el dashboard.', '',
    ...cab, ...g.vencidas.map(fila), ''].join('\n');
}
```

- [ ] **Step 4: Ejecutar los tests y ver que pasan**

Run: `cd dashboard && node --test`
Expected: PASS, 20 tests

- [ ] **Step 5: Commit**

```bash
git add dashboard/markdown.js dashboard/tests/markdown.test.js
git commit -m "Dashboard: generación de fichas, README de módulo y PENDIENTES"
```

---

### Task 3: Módulos de navegador (`campus.js`, `carpeta.js`)

**Files:**
- Create: `dashboard/campus.js`
- Create: `dashboard/carpeta.js`

**Interfaces:**
- Consumes: de `logica.js`: `CAMPUS`, `parseFecha`, `esPaginaLogin`, `idDeFicha`
- Produces:
  - `campus.js`: `class ErrorCampus extends Error { codigo: 'SIN_SESION'|'SIN_CONEXION'|'HTTP' }`; `leerCampus(alProgresar(hechas, total)) → Promise<{ fecha: ISO, cursos: [{id, nombre, aula}], tareas: Tarea[] }>`. Las tareas que no se pudieron leer llevan `{ id, curso, error: true }`.
  - `carpeta.js`: `carpetaGuardada() → handle|undefined`, `elegirCarpeta() → handle`, `tienePermiso(h, pedir=false) → bool`, `leer(h, ruta) → string|null`, `existe(h, ruta) → bool`, `escribir(h, ruta, contenido: string|Blob)`, `crearCarpeta(h, ruta)`, `fichasExistentes(h) → Map<id, ruta>`

Estos módulos solo funcionan en Chrome (DOMParser, fetch con cookies, File System Access). Se verifican en la Task 5.

- [ ] **Step 1: Implementar `dashboard/campus.js`**

```js
// Lee el campus con la sesión de Chrome del usuario. Solo navegador.
import { CAMPUS, parseFecha, esPaginaLogin } from './logica.js';

export class ErrorCampus extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
const SIN_SESION = () => new ErrorCampus('SIN_SESION', 'Inicia sesión en el campus y vuelve a pulsar Actualizar.');

async function pedir(url, opciones = {}) {
  let r;
  try { r = await fetch(url, { credentials: 'include', ...opciones }); }
  catch { throw new ErrorCampus('SIN_CONEXION', 'No se pudo conectar con el campus.'); }
  if (esPaginaLogin(r.url)) throw SIN_SESION();
  if (!r.ok) throw new ErrorCampus('HTTP', `El campus respondió con un error ${r.status}.`);
  return r;
}
const pagina = async url => new DOMParser().parseFromString(await (await pedir(url)).text(), 'text/html');
const limpio = s => (s || '').replace(/\s+/g, ' ').trim();
const absoluta = href => new URL(href, CAMPUS).href;

function aTexto(el) {
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
  c.querySelectorAll('li').forEach(b => b.prepend('- '));
  c.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,tr,pre').forEach(b => b.append('\n'));
  return c.textContent.replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function enParalelo(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function leerTarea(item) {
  const doc = await pagina(item.url);
  const fechas = limpio(doc.querySelector('[data-region="activity-dates"], .activity-dates')?.textContent);
  const filas = [...doc.querySelectorAll('.submissionstatustable tr')].map(tr => limpio(tr.textContent));
  const fila = p => (filas.find(f => f.startsWith(p)) || '').slice(p.length).trim();
  const vistos = new Set();
  const adjuntos = [...doc.querySelectorAll('.activity-description a[href*="pluginfile"], #intro a[href*="pluginfile"]')]
    .map(a => ({ nombre: limpio(a.textContent), url: absoluta(a.getAttribute('href')) }))
    .filter(a => !vistos.has(a.url) && vistos.add(a.url));
  const cierre = parseFecha('Cierre', fechas) || parseFecha('Vencimiento', fechas);
  return {
    id: item.id, curso: item.curso, cursoNombre: item.cursoNombre, mod: item.mod,
    nombre: item.nombre.replace(/&amp;/g, '&'), seccion: item.seccion,
    apertura: parseFecha('Apertura', fechas)?.toISOString() ?? null, cierre: cierre?.toISOString() ?? null,
    entrega: fila('Estado de la entrega'), calif: fila('Estado de la calificación'),
    enunciado: aTexto(doc.querySelector('.activity-description, #intro')), adjuntos, error: false,
  };
}

export async function leerCampus(alProgresar = () => {}) {
  const portada = await (await pedir(`${CAMPUS}/my/`)).text();
  const sesskey = portada.match(/"sesskey":"([^"]+)"/)?.[1];
  if (!sesskey) throw SIN_SESION();

  const ajax = async (methodname, args) => {
    const r = await pedir(`${CAMPUS}/lib/ajax/service.php?sesskey=${sesskey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ index: 0, methodname, args }]),
    });
    const [res] = await r.json();
    if (res.error) {
      if (/login|sesskey/i.test(res.exception?.errorcode || '')) throw SIN_SESION();
      throw new ErrorCampus('HTTP', res.exception?.message || 'Error del campus.');
    }
    return res.data;
  };

  const { courses } = await ajax('core_course_get_enrolled_courses_by_timeline_classification',
    { offset: 0, limit: 0, classification: 'all', sort: 'fullname' });
  const cursos = [], items = [];
  for (const c of courses) {
    const curso = { id: String(c.id), nombre: c.fullname, aula: null };
    cursos.push(curso);
    const st = JSON.parse(await ajax('core_courseformat_get_state', { courseid: c.id }));
    const seccionDe = {};
    for (const s of st.section) for (const cm of s.cmlist) seccionDe[cm] = s.title;
    for (const m of st.cm) {
      if (!m.uservisible) continue;
      if (m.module === 'url' && /aula virtual/i.test(m.name)) {
        try { curso.aula = (await pagina(m.url)).querySelector('.urlworkaround a')?.getAttribute('href') || null; } catch (e) { if (e.codigo === 'SIN_SESION') throw e; }
      }
      if (m.module === 'assign' || m.module === 'quiz') {
        items.push({ id: String(m.id), curso: curso.id, cursoNombre: c.fullname, mod: m.module,
          nombre: m.name, url: m.url, seccion: seccionDe[m.id] || '' });
      }
    }
  }

  let hechas = 0;
  alProgresar(0, items.length);
  const tareas = await enParalelo(items, 6, async item => {
    try { return await leerTarea(item); }
    catch (e) { if (e.codigo === 'SIN_SESION') throw e; return { id: item.id, curso: item.curso, error: true }; }
    finally { alProgresar(++hechas, items.length); }
  });
  return { fecha: new Date().toISOString(), cursos, tareas };
}
```

- [ ] **Step 2: Implementar `dashboard/carpeta.js`**

```js
// Acceso a la carpeta DAW con la File System Access API. Solo navegador.
import { idDeFicha } from './logica.js';

function idb(modo, accion) {
  return new Promise((resolver, rechazar) => {
    const abrir = indexedDB.open('daw-dashboard', 1);
    abrir.onupgradeneeded = () => abrir.result.createObjectStore('kv');
    abrir.onerror = () => rechazar(abrir.error);
    abrir.onsuccess = () => {
      const tx = abrir.result.transaction('kv', modo);
      const req = accion(tx.objectStore('kv'));
      tx.oncomplete = () => resolver(req.result);
      tx.onerror = () => rechazar(tx.error);
    };
  });
}

export const carpetaGuardada = () => idb('readonly', s => s.get('carpeta'));

export async function elegirCarpeta() {
  const h = await window.showDirectoryPicker({ id: 'daw', mode: 'readwrite' });
  await idb('readwrite', s => s.put(h, 'carpeta'));
  return h;
}

export async function tienePermiso(h, pedir = false) {
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission(o)) === 'granted') return true;
  return pedir && (await h.requestPermission(o)) === 'granted';
}

async function directorio(h, partes, crear) {
  for (const p of partes) h = await h.getDirectoryHandle(p, { create: crear });
  return h;
}
const partir = ruta => { const p = ruta.split('/'); return [p.slice(0, -1), p.at(-1)]; };

export async function leer(h, ruta) {
  try {
    const [dirs, nombre] = partir(ruta);
    return await (await (await directorio(h, dirs, false)).getFileHandle(nombre)).getFile().then(f => f.text());
  } catch { return null; }
}

export async function existe(h, ruta) {
  try { const [dirs, nombre] = partir(ruta); await (await directorio(h, dirs, false)).getFileHandle(nombre); return true; }
  catch { return false; }
}

export async function escribir(h, ruta, contenido) {
  const [dirs, nombre] = partir(ruta);
  const w = await (await (await directorio(h, dirs, true)).getFileHandle(nombre, { create: true })).createWritable();
  await w.write(contenido);
  await w.close();
}

export const crearCarpeta = (h, ruta) => directorio(h, ruta.split('/'), true);

export async function fichasExistentes(h) {
  const mapa = new Map();
  for await (const [nombreMod, mod] of h.entries()) {
    if (mod.kind !== 'directory' || nombreMod.startsWith('.')) continue;
    for (const sub of ['Tareas', 'Examenes']) {
      let dir;
      try { dir = await mod.getDirectoryHandle(sub); } catch { continue; }
      for await (const [nombre, f] of dir.entries()) {
        if (f.kind !== 'file' || !nombre.endsWith('.md') || nombre === 'README.md') continue;
        const id = idDeFicha(await (await f.getFile()).text());
        if (id) mapa.set(id, `${nombreMod}/${sub}/${nombre}`);
      }
    }
  }
  return mapa;
}
```

- [ ] **Step 3: Comprobar que los módulos cargan sin errores de sintaxis**

Run: `cd dashboard && node --check campus.js && node --check carpeta.js && node --test`
Expected: sin salida de `--check`; los tests siguen pasando (20)

- [ ] **Step 4: Commit**

```bash
git add dashboard/campus.js dashboard/carpeta.js
git commit -m "Dashboard: lectura del campus y acceso a la carpeta DAW"
```

---

### Task 4: Interfaz y extensión (`manifest.json`, `background.js`, `dashboard.html`, `style.css`, `app.js`)

**Files:**
- Create: `dashboard/manifest.json`, `dashboard/background.js`, `dashboard/dashboard.html`, `dashboard/style.css`, `dashboard/app.js`

**Interfaces:**
- Consumes: todo lo producido en las Tasks 1–3.
- Produces: la extensión instalable.

- [ ] **Step 1: `dashboard/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Tareas DAW",
  "version": "1.0.0",
  "description": "Tus tareas pendientes del campus Digitech FP, a un clic de entregarlas.",
  "action": { "default_title": "Tareas DAW" },
  "background": { "service_worker": "background.js" },
  "permissions": ["storage"],
  "host_permissions": ["https://campus.digitechfp.com/*"]
}
```

- [ ] **Step 2: `dashboard/background.js`**

```js
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }));
```

- [ ] **Step 3: `dashboard/dashboard.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tareas DAW</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Tareas DAW</h1>
    <span id="actualizado"></span>
    <input id="buscar" type="search" placeholder="Buscar  ( / )" aria-label="Buscar tareas">
    <button id="actualizar" class="primario" title="Actualizar (R)">Actualizar</button>
    <button id="abrir-ajustes" class="icono" title="Ajustes" aria-label="Ajustes">⚙</button>
  </header>
  <progress id="progreso" hidden></progress>
  <div id="aviso" role="status" hidden></div>
  <main id="lista"></main>

  <dialog id="ajustes">
    <h2>Ajustes</h2>
    <p>Carpeta DAW (para crear fichas y adjuntos): <strong id="nombre-carpeta">sin elegir</strong></p>
    <button id="elegir-carpeta">Elegir carpeta DAW</button>
    <label>Ruta de la carpeta en este portátil (para abrirla en VS Code)
      <input id="ruta" type="text" spellcheck="false">
    </label>
    <form method="dialog"><button class="primario">Listo</button></form>
  </dialog>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 4: `dashboard/style.css`**

```css
:root {
  --fondo: #f7f7f8; --tarjeta: #ffffff; --texto: #1d1d1f; --suave: #6e6e73; --borde: #e3e3e6;
  --acento: #2b6cff; --acento-texto: #ffffff; --rojo: #d92d20; --naranja: #c4670a;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root { --fondo: #141416; --tarjeta: #1e1e21; --texto: #f2f2f4; --suave: #9a9aa2; --borde: #2e2e33;
    --acento: #5b8cff; --rojo: #ff6b5e; --naranja: #f0a04b; color-scheme: dark; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px;
  padding: 12px max(16px, calc(50% - 380px)); background: var(--fondo); border-bottom: 1px solid var(--borde); }
h1 { font-size: 17px; margin: 0; }
#actualizado { color: var(--suave); font-size: 13px; margin-right: auto; }
#buscar { width: 180px; padding: 6px 10px; border: 1px solid var(--borde); border-radius: 8px;
  background: var(--tarjeta); color: var(--texto); }
button { font: inherit; cursor: pointer; border: 1px solid var(--borde); background: var(--tarjeta);
  color: var(--texto); border-radius: 8px; padding: 6px 12px; }
button:disabled { opacity: .5; cursor: wait; }
button.primario { background: var(--acento); color: var(--acento-texto); border-color: transparent; font-weight: 600; }
button.icono { padding: 6px 9px; background: transparent; border-color: transparent; color: var(--suave); }
button.icono:hover, button.icono.activo { color: var(--texto); background: var(--borde); }
#progreso { display: block; width: 100%; height: 3px; border: 0; }
#aviso { margin: 12px max(16px, calc(50% - 380px)); padding: 10px 14px; border-radius: 8px;
  background: var(--tarjeta); border: 1px solid var(--borde); }
#aviso.error { border-color: var(--rojo); }
#aviso a { color: var(--acento); margin-left: 6px; }
main { max-width: 760px; margin: 0 auto; padding: 8px 16px 64px; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--suave); margin: 24px 0 8px; }
.vacio { color: var(--suave); text-align: center; padding: 40px 0; }
.tarjeta { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center;
  background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 10px; padding: 10px 12px; margin-bottom: 6px; }
.tarjeta:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.tarjeta.hecha { opacity: .6; }
.titulo { min-width: 0; }
.modulo { font-size: 12px; color: var(--suave); display: flex; align-items: center; gap: 6px; }
.punto { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex: none; }
.nombre { margin: 2px 0 0; font-size: 15px; font-weight: 500; overflow-wrap: anywhere; }
.cierre { font-size: 13px; color: var(--suave); }
.cierre.alta { color: var(--rojo); font-weight: 600; }
.cierre.media { color: var(--naranja); }
.acciones { display: flex; align-items: center; gap: 2px; grid-row: 1 / span 2; grid-column: 2; }
.detalle { grid-column: 1 / -1; border-top: 1px solid var(--borde); margin-top: 8px; padding-top: 10px;
  white-space: pre-wrap; font-size: 14px; }
.detalle ul { margin: 8px 0 0; padding-left: 18px; white-space: normal; }
.detalle a { color: var(--acento); }
details { margin-top: 24px; }
summary { cursor: pointer; color: var(--suave); font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
dialog { border: 1px solid var(--borde); border-radius: 12px; background: var(--tarjeta); color: var(--texto); max-width: 440px; }
dialog label { display: block; margin: 16px 0; font-size: 14px; }
dialog input { display: block; width: 100%; margin-top: 6px; padding: 6px 10px; border: 1px solid var(--borde);
  border-radius: 8px; background: var(--fondo); color: var(--texto); }
@media (max-width: 560px) {
  header { flex-wrap: wrap; }
  #buscar { order: 9; width: 100%; }
}
```

- [ ] **Step 5: `dashboard/app.js`**

```js
// Interfaz del dashboard: estado, actualizar, volcar a la carpeta DAW y pintar.
import { CAMPUS, agrupar, cuentaAtras, urgencia, modDe, urlEntrega, urlCampus, rutaFicha, rutaLibre,
  nombreArchivo, infoModulo } from './logica.js';
import { fichaMd, readmeModulo, pendientesMd } from './markdown.js';
import { leerCampus } from './campus.js';
import * as fs from './carpeta.js';

const $ = s => document.querySelector(s);
const RUTA_POR_DEFECTO = 'C:\\Users\\fabri\\Desktop\\DAW';
const app = { datos: null, marcas: {}, carpeta: null, ruta: RUTA_POR_DEFECTO, filtro: '', ocupado: false };
const almacen = {
  get: async k => (await chrome.storage.local.get(k))[k],
  set: (k, v) => chrome.storage.local.set({ [k]: v }),
};

function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  e.append(...hijos.filter(h => h != null && h !== false)); // strings → nodos de texto (nunca HTML)
  return e;
}

function aviso(texto, tipo = '', enlace = null) {
  const a = $('#aviso');
  a.hidden = !texto;
  a.className = tipo;
  a.replaceChildren(texto, enlace ? el('a', { href: enlace.url, target: '_blank' }, enlace.texto) : '');
}

function hace(fecha) {
  const min = Math.round((Date.now() - new Date(fecha)) / 60000);
  if (min < 1) return 'actualizado ahora';
  if (min < 60) return `actualizado hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `actualizado hace ${h} h` : `actualizado hace ${Math.round(h / 24)} días`;
}

const rutaDe = t => app.datos?.rutas?.[t.id] || rutaFicha(t);

// ---------- acciones ----------

function abrirExterno(url) {
  el('a', { href: url, target: '_blank', rel: 'noopener' }).click();
}

async function abrirCarpeta(t) {
  const ruta = rutaDe(t).replace(/\.md$/, '');
  if (app.carpeta && await fs.tienePermiso(app.carpeta, true)) await fs.crearCarpeta(app.carpeta, ruta);
  const abs = `${app.ruta.replace(/\\/g, '/').replace(/\/$/, '')}/${ruta}`;
  el('a', { href: `vscode://file/${encodeURI(abs)}` }).click();
}

async function alternarHecha(t) {
  if (app.marcas[t.id]) delete app.marcas[t.id];
  else app.marcas[t.id] = new Date().toISOString();
  await almacen.set('marcas', app.marcas);
  if (app.carpeta && await fs.tienePermiso(app.carpeta)) {
    await fs.escribir(app.carpeta, 'dashboard/datos/marcas.json', JSON.stringify(app.marcas, null, 1));
  }
  pintar();
}

async function volcar(c, datos) {
  const existentes = await fs.fichasExistentes(c);
  const ocupadas = new Set(existentes.values());
  let fichas = 0, adjuntos = 0;
  for (const t of datos.tareas) {
    if (existentes.has(t.id)) continue; // nunca se sobrescribe una ficha existente
    const ruta = rutaLibre(rutaFicha(t), t.id, ocupadas);
    ocupadas.add(ruta);
    const dir = ruta.replace(/\.md$/, '');
    const nombres = [];
    for (const a of t.adjuntos) {
      const n = nombreArchivo(a.url);
      try {
        if (!await fs.existe(c, `${dir}/${n}`)) {
          const r = await fetch(a.url, { credentials: 'include' });
          if (!r.ok) continue;
          await fs.escribir(c, `${dir}/${n}`, await r.blob());
          adjuntos++;
        }
        nombres.push(n);
      } catch { /* adjunto que falla: se omite y la ficha se crea igualmente */ }
    }
    await fs.escribir(c, ruta, fichaMd(t, ruta, nombres));
    existentes.set(t.id, ruta);
    fichas++;
  }
  datos.rutas = Object.fromEntries(existentes);
  const ahora = new Date();
  for (const curso of datos.cursos) {
    const mod = infoModulo(curso.id, curso.nombre);
    const ts = datos.tareas.filter(t => t.curso === curso.id);
    await fs.escribir(c, `${mod.carpeta}/README.md`, readmeModulo(mod, curso, ts, app.marcas, ahora, datos.rutas));
  }
  await fs.escribir(c, 'PENDIENTES.md', pendientesMd(datos.tareas, app.marcas, ahora, datos.rutas));
  await fs.escribir(c, 'dashboard/datos/campus.json', JSON.stringify(datos, null, 1));
  return `${fichas} ${fichas === 1 ? 'ficha nueva' : 'fichas nuevas'}, ${adjuntos} ${adjuntos === 1 ? 'adjunto' : 'adjuntos'}.`;
}

async function actualizar() {
  if (app.ocupado) return;
  app.ocupado = true;
  $('#actualizar').disabled = true;
  const barra = $('#progreso');
  barra.hidden = false;
  barra.removeAttribute('value');
  aviso('');
  try {
    const conCarpeta = app.carpeta ? await fs.tienePermiso(app.carpeta, true) : false;
    const nuevos = await leerCampus((hechas, total) => { barra.max = total || 1; barra.value = hechas; });
    const previas = new Map((app.datos?.tareas || []).map(t => [t.id, t]));
    const fallos = nuevos.tareas.filter(t => t.error).length;
    nuevos.tareas = nuevos.tareas.map(t => (t.error ? previas.get(t.id) : t)).filter(Boolean);
    nuevos.rutas = app.datos?.rutas || {};
    app.datos = nuevos;
    const resumen = conCarpeta ? await volcar(app.carpeta, nuevos) : 'Elige la carpeta DAW en ⚙ para crear fichas.';
    await almacen.set('datos', app.datos);
    aviso(`Listo. ${resumen}${fallos ? ` ${fallos} tareas no se pudieron leer (se mantienen los datos anteriores).` : ''}`);
    setTimeout(() => { if ($('#aviso').textContent.startsWith('Listo.')) aviso(''); }, 6000);
  } catch (e) {
    const enlace = e.codigo === 'SIN_SESION' ? { url: `${CAMPUS}/login/index.php`, texto: 'Abrir el campus' } : null;
    aviso(e.message || String(e), 'error', enlace);
  } finally {
    app.ocupado = false;
    $('#actualizar').disabled = false;
    barra.hidden = true;
    pintar();
  }
}

// ---------- pintar ----------

function tarjeta(t, ahora, hecha) {
  const m = modDe(t);
  const marcada = Boolean(app.marcas[t.id]);
  const detalle = el('div', { class: 'detalle', hidden: '' }, t.enunciado || 'Sin descripción en el campus.',
    t.adjuntos?.length ? el('ul', {}, ...t.adjuntos.map(a => el('li', {}, el('a', { href: a.url, target: '_blank' }, a.nombre || nombreArchivo(a.url))))) : null,
    el('p', {}, el('a', { href: urlCampus(t), target: '_blank' }, 'Ver en el campus')));
  const verEnunciado = el('button', { class: 'icono', title: 'Enunciado', 'aria-label': 'Enunciado',
    onclick: () => { detalle.hidden = !detalle.hidden; verEnunciado.classList.toggle('activo', !detalle.hidden); } }, '📄');
  const entregar = () => abrirExterno(urlEntrega(t));
  return el('article', { class: `tarjeta${hecha ? ' hecha' : ''}`, tabindex: '0',
      onkeydown: e => { if (e.key === 'Enter' && e.target.tagName === 'ARTICLE') entregar(); } },
    el('div', { class: 'titulo' },
      el('div', { class: 'modulo' }, el('span', { class: 'punto', style: `--c:${m.color}` }), m.corto),
      el('p', { class: 'nombre' }, t.nombre)),
    el('div', { class: 'acciones' },
      el('button', { class: 'primario', onclick: entregar }, t.mod === 'quiz' ? 'Hacer' : 'Entregar'),
      verEnunciado,
      el('button', { class: 'icono', title: 'Abrir carpeta en VS Code', 'aria-label': 'Carpeta', onclick: () => abrirCarpeta(t) }, '📁'),
      el('button', { class: 'icono', title: marcada ? 'Desmarcar' : 'Marcar como hecha', 'aria-label': 'Hecha', onclick: () => alternarHecha(t) }, marcada ? '↺' : '✓')),
    el('div', { class: `cierre ${hecha ? '' : urgencia(t, ahora)}` }, cuentaAtras(t.cierre, ahora)),
    detalle);
}

function pintar() {
  const lista = $('#lista');
  lista.replaceChildren();
  if (!app.datos) {
    lista.append(el('p', { class: 'vacio' }, 'Pulsa Actualizar para leer el campus.'));
    return;
  }
  $('#actualizado').textContent = hace(app.datos.fecha);
  const ahora = new Date();
  const g = agrupar(app.datos.tareas, app.marcas, ahora, app.filtro);
  const titulos = { hoy: 'Hoy', manana: 'Mañana', semana: 'Esta semana', despues: 'Más adelante', sinfecha: 'Sin fecha' };
  let hay = false;
  for (const [k, titulo] of Object.entries(titulos)) {
    if (!g[k].length) continue;
    hay = true;
    lista.append(el('h2', {}, `${titulo} · ${g[k].length}`), ...g[k].map(t => tarjeta(t, ahora, false)));
  }
  if (!hay) lista.append(el('p', { class: 'vacio' }, app.filtro ? 'Nada coincide con la búsqueda.' : 'Nada pendiente. 🎉'));
  for (const [titulo, grupo, hecha] of [['Vencidas sin entregar', g.vencidas, false], ['Entregadas', g.entregadas, true]]) {
    if (!grupo.length) continue;
    lista.append(el('details', {}, el('summary', {}, `${titulo} · ${grupo.length}`),
      ...grupo.map(t => tarjeta(t, ahora, hecha))));
  }
}

// ---------- ajustes y arranque ----------

async function pintarAjustes() {
  $('#nombre-carpeta').textContent = app.carpeta ? app.carpeta.name : 'sin elegir';
  $('#ruta').value = app.ruta;
}

async function cargarDeCarpeta() {
  const d = await fs.leer(app.carpeta, 'dashboard/datos/campus.json');
  if (d) { const x = JSON.parse(d); if (!app.datos || x.fecha > app.datos.fecha) app.datos = x; }
  const m = await fs.leer(app.carpeta, 'dashboard/datos/marcas.json');
  if (m) app.marcas = JSON.parse(m);
}

async function iniciar() {
  app.datos = (await almacen.get('datos')) || null;
  app.marcas = (await almacen.get('marcas')) || {};
  app.ruta = (await almacen.get('ruta')) || RUTA_POR_DEFECTO;
  app.carpeta = (await fs.carpetaGuardada()) || null;
  if (app.carpeta && await fs.tienePermiso(app.carpeta)) await cargarDeCarpeta();
  pintar();

  $('#actualizar').addEventListener('click', actualizar);
  $('#buscar').addEventListener('input', e => { app.filtro = e.target.value; pintar(); });
  $('#abrir-ajustes').addEventListener('click', () => { pintarAjustes(); $('#ajustes').showModal(); });
  $('#ruta').addEventListener('change', e => { app.ruta = e.target.value.trim() || RUTA_POR_DEFECTO; almacen.set('ruta', app.ruta); });
  $('#elegir-carpeta').addEventListener('click', async () => {
    try { app.carpeta = await fs.elegirCarpeta(); await cargarDeCarpeta(); pintarAjustes(); pintar(); }
    catch (e) { if (e.name !== 'AbortError') aviso(e.message, 'error'); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input') || $('#ajustes').open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); actualizar(); }
    if (e.key === '/') { e.preventDefault(); $('#buscar').focus(); }
  });
  setInterval(() => app.datos && ($('#actualizado').textContent = hace(app.datos.fecha)), 60000);
  if (!app.carpeta) aviso('Primer uso: elige la carpeta DAW en ⚙ y pulsa Actualizar.');
}

iniciar();
```

- [ ] **Step 6: Comprobar sintaxis y tests**

Run: `cd dashboard && node --check app.js && node --check background.js && node -e "JSON.parse(require('fs').readFileSync('manifest.json'))" && node --test`
Expected: sin errores; 20 tests en verde

- [ ] **Step 7: Commit**

```bash
git add dashboard/manifest.json dashboard/background.js dashboard/dashboard.html dashboard/style.css dashboard/app.js
git commit -m "Dashboard: interfaz minimalista y extensión de Chrome"
```

---

### Task 5: Instalación, prueba real y documentación

**Files:**
- Modify: `README.md` (sección "Dashboard")
- Create: `dashboard/datos/.gitkeep`

- [ ] **Step 1: Documentar la instalación** añadiendo esto al final de `README.md`:

```markdown
## Dashboard de tareas

Extensión de Chrome en [`dashboard/`](dashboard/) con tus pendientes ordenadas por urgencia.

**Instalar (una vez por portátil):**
1. Chrome → `chrome://extensions` → activa **Modo de desarrollador**.
2. **Cargar descomprimida** → elige la carpeta `DAW/dashboard`.
3. Fija el icono "Tareas DAW" en la barra y púlsalo.
4. ⚙ → **Elegir carpeta DAW** (la carpeta del repo) y comprueba la ruta para VS Code.

**Usar:** inicia sesión en el campus en Chrome y pulsa **Actualizar** (o `R`).
**Entregar** abre directamente el formulario de envío. 📄 enunciado · 📁 carpeta en VS Code · ✓ marcar como hecha (en papel o en clase).
Al terminar, `git add . && git commit -m "..." && git push` para llevar las fichas nuevas y las marcas al otro portátil.

Tests: `cd dashboard && node --test`
```

- [ ] **Step 2: Instalación en Chrome (la hace el usuario)**: cargar la extensión descomprimida, elegir la carpeta DAW y pulsar **Actualizar** con la sesión del campus iniciada.
Expected: el aviso dice "Listo. N fichas nuevas, M adjuntos." y la lista empieza por "Hoy" o "Mañana".

- [ ] **Step 3: Verificar que no se ha sobrescrito ninguna ficha**

Run: `git status --short`
Expected: solo `M` en `*/README.md`, `PENDIENTES.md`, y nuevos `dashboard/datos/campus.json` y las fichas de tareas que no existían. **Ningún** `M` en `*/Tareas/*.md` ni en `*/Examenes/*.md`.

- [ ] **Step 4: Comprobaciones manuales** (Review Focus 4 y 5)
  - **Entregar** en una tarea abre `…view.php?id=N&action=editsubmission` con el formulario de subida.
  - 📁 abre la carpeta de la tarea en VS Code (Chrome pide permiso para abrir `vscode://` la primera vez).
  - ✓ mueve la tarea a "Entregadas" y crea `dashboard/datos/marcas.json`.
  - Cerrar sesión en el campus y pulsar Actualizar → aviso "Inicia sesión en el campus…" con enlace; la lista anterior sigue visible.
  - Un enunciado con código PHP (DWES, "Práctica Arrays $GET") se ve como texto en 📄.

- [ ] **Step 5: Commit y push**

```bash
git add README.md dashboard/datos/.gitkeep dashboard/datos PENDIENTES.md */README.md */Tareas */Examenes
git commit -m "Dashboard: instrucciones de instalación y primera sincronización"
git push
```
