// Interfaz del dashboard: estado, actualizar, volcar a la carpeta DAW y pintar.
import { CAMPUS, agrupar, cuentaAtras, urgencia, modDe, urlEntrega, urlCampus, rutaFicha, rutaLibre,
  nombreArchivo, infoModulo, clave, esDescargaValida, estaHecha, fusionarMarcas } from './logica.js';
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

// Fusiona las marcas locales con dashboard/datos/marcas.json (que viaja por git) y guarda en ambos sitios.
async function sincronizarMarcas(c) {
  const enCarpeta = await fs.leer(c, 'dashboard/datos/marcas.json');
  app.marcas = fusionarMarcas(app.marcas, enCarpeta ? JSON.parse(enCarpeta) : {});
  await almacen.set('marcas', app.marcas);
  await fs.escribir(c, 'dashboard/datos/marcas.json', JSON.stringify(app.marcas, null, 1));
}

async function alternarHecha(t) {
  app.marcas[t.id] = { hecha: !estaHecha(app.marcas, t.id), t: new Date().toISOString() };
  await almacen.set('marcas', app.marcas);
  if (app.carpeta && await fs.tienePermiso(app.carpeta)) await sincronizarMarcas(app.carpeta);
  pintar();
}

async function volcar(c, datos) {
  const existentes = await fs.fichasExistentes(c);
  const ocupadas = new Set([...existentes.values()].map(clave));
  let fichas = 0, adjuntos = 0;
  for (const t of datos.tareas) {
    if (existentes.has(t.id)) continue; // nunca se sobrescribe una ficha existente
    let ruta, intento = 0;
    do { ruta = rutaLibre(rutaFicha(t), t.id, intento++); }
    while (ocupadas.has(clave(ruta)) || await fs.existe(c, ruta)); // ni fichas conocidas ni archivos ajenos
    ocupadas.add(clave(ruta));
    const dir = ruta.replace(/\.md$/, '');
    const nombres = [];
    for (const a of t.adjuntos) {
      const n = nombreArchivo(a.url);
      try {
        if (!await fs.existe(c, `${dir}/${n}`)) {
          const r = await fetch(a.url, { credentials: 'include' });
          if (!r.ok || !esDescargaValida(r.url, r.headers.get('content-type'), n)) continue; // p. ej. sesión caducada
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
    if (conCarpeta) await sincronizarMarcas(app.carpeta);
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
  const marcada = estaHecha(app.marcas, t.id);
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
  await sincronizarMarcas(app.carpeta); // fusiona, nunca reemplaza
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
