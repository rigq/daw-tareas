// Interfaz del dashboard: estado, actualizar, volcar a la carpeta DAW y pintar.
import { CAMPUS, agrupar, cuentaAtras, urgencia, modDe, urlEntrega, urlCampus, rutaFicha, rutaLibre,
  nombreArchivo, infoModulo, clave, esDescargaValida, estaHecha, fusionarMarcas } from './logica.js';
import { fichaMd, readmeModulo, pendientesMd } from './markdown.js';
import { leerCampus, descargar, archivosDeCarpeta } from './campus.js';
import { parseMd, inline, agruparApuntes, sinResumir, tipoApunte, rutaApunte } from './apuntes.js';
import { MODULOS } from './logica.js';
import * as fs from './carpeta.js';

const $ = s => document.querySelector(s);
const RUTA_POR_DEFECTO = 'C:\\Users\\fabri\\Desktop\\DAW';
const app = { datos: null, marcas: {}, carpeta: null, ruta: RUTA_POR_DEFECTO, filtro: '', ocupado: false,
  vista: 'tareas', modulo: '761' };
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
  const nuevosApuntes = await volcarApuntes(c, datos.apuntes || []);
  return `${fichas} ${fichas === 1 ? 'ficha nueva' : 'fichas nuevas'}, ${adjuntos} ${adjuntos === 1 ? 'adjunto' : 'adjuntos'}, ` +
    `${nuevosApuntes} ${nuevosApuntes === 1 ? 'apunte nuevo' : 'apuntes nuevos'}.`;
}

// Descarga a <módulo>/Apuntes los recursos que no se conocían y los archivos nuevos de las carpetas del campus.
// Nunca sobrescribe: si ya existe un archivo con ese nombre, se deja.
async function volcarApuntes(c, apuntes) {
  const conocidos = JSON.parse((await fs.leer(c, 'dashboard/datos/apuntes.json')) || '{}');
  let nuevos = 0;
  for (const a of apuntes) {
    const mod = infoModulo(a.curso, a.cursoNombre);
    try {
      if (a.tipo === 'resource') {
        if (conocidos[a.id]) continue;
        const f = await descargar(a.url);
        if (!f) continue;
        const ruta = rutaApunte(mod.carpeta, f.nombre);
        if (!await fs.existe(c, ruta)) { await fs.escribir(c, ruta, f.blob); nuevos++; }
        conocidos[a.id] = ruta;
      } else {
        for (const f of await archivosDeCarpeta(a.url)) {
          const ruta = rutaApunte(mod.carpeta, f.nombre, a.nombre);
          if (await fs.existe(c, ruta)) continue;
          const d = await descargar(f.url);
          if (d) { await fs.escribir(c, ruta, d.blob); nuevos++; }
        }
      }
    } catch (e) { if (e.codigo === 'SIN_SESION') throw e; /* un apunte que falla no detiene el resto */ }
  }
  await fs.escribir(c, 'dashboard/datos/apuntes.json', JSON.stringify(conocidos, null, 1));
  return nuevos;
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
  for (const b of document.querySelectorAll('#pestanas button')) b.classList.toggle('activa', b.dataset.vista === app.vista);
  $('#lista').hidden = app.vista !== 'tareas';
  $('#apuntes').hidden = app.vista !== 'apuntes';
  $('#buscar').placeholder = app.vista === 'apuntes' ? 'Buscar apuntes  ( / )' : 'Buscar tareas  ( / )';
  if (app.vista === 'apuntes') { pintarApuntes().catch(e => aviso(e.message, 'error')); return; }
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

// ---------- apuntes ----------

const INLINE = { b: 'strong', i: 'em', code: 'code' };
// Negrita y cursiva pueden contener `código` u otros estilos: se procesan de nuevo por dentro.
const pintarInline = partes => partes.map(p => (p.t === 'text' ? p.v
  : p.t === 'code' ? el('code', {}, p.v) : el(INLINE[p.t], {}, ...pintarInline(inline(p.v)))));

function pintarMd(texto) {
  const caja = el('article', { class: 'resumen' });
  for (const b of parseMd(texto)) {
    if (b.tipo === 'h') caja.append(el(`h${b.nivel}`, {}, ...pintarInline(b.inline)));
    else if (b.tipo === 'p') caja.append(el('p', {}, ...pintarInline(b.inline)));
    else if (b.tipo === 'quote') caja.append(el('blockquote', {}, ...pintarInline(b.inline)));
    else if (b.tipo === 'code') caja.append(el('pre', {}, el('code', {}, b.texto)));
    else if (b.tipo === 'ul' || b.tipo === 'ol') caja.append(el(b.tipo, {}, ...b.items.map(i => el('li', {}, ...pintarInline(i)))));
    else if (b.tipo === 'table') caja.append(el('table', {}, ...b.filas.map(f => el('tr', {}, ...f.map(c => el('td', {}, ...pintarInline(c)))))));
  }
  return caja;
}

const TIPOS_MIME = { pdf: 'application/pdf', texto: 'text/plain;charset=utf-8' };

async function abrirApunte(carpetaMod, ruta) {
  const f = await fs.archivo(app.carpeta, `${carpetaMod}/Apuntes/${ruta}`);
  const tipo = tipoApunte(f.name);
  const blob = TIPOS_MIME[tipo] ? new Blob([f], { type: TIPOS_MIME[tipo] }) : f;
  const url = URL.createObjectURL(blob);
  if (tipo === 'pdf' || tipo === 'imagen' || tipo === 'texto') abrirExterno(url);
  else el('a', { href: url, download: f.name }).click(); // Office y otros: se abren con su programa
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function pintarApuntes() {
  const lista = $('#modulos'), cont = $('#contenido-apuntes');
  const c = app.carpeta;
  if (!c || !await fs.tienePermiso(c)) {
    lista.replaceChildren();
    cont.replaceChildren(el('p', { class: 'vacio' }, 'Los apuntes se leen de tu carpeta DAW. '),
      el('p', { style: 'text-align:center' }, el('button', { class: 'primario', onclick: async () => {
        if (c && await fs.tienePermiso(c, true)) { await cargarDeCarpeta(); pintar(); return; }
        try { app.carpeta = await fs.elegirCarpeta(); await cargarDeCarpeta(); pintar(); }
        catch (e) { if (e.name !== 'AbortError') aviso(e.message, 'error'); }
      } }, c ? 'Dar acceso a la carpeta DAW' : 'Elegir carpeta DAW')));
    return;
  }
  const modulos = Object.entries(MODULOS);
  const info = await Promise.all(modulos.map(async ([id, m]) => {
    const archivos = await fs.listarApuntes(c, m.carpeta);
    const resumen = await fs.leer(c, `${m.carpeta}/Apuntes/RESUMEN.md`);
    return { id, m, archivos, resumen, pendientes: sinResumir(archivos, resumen) };
  }));
  lista.replaceChildren(...info.filter(x => x.archivos.length).map(({ id, m, resumen, pendientes }) =>
    el('button', { class: id === app.modulo ? 'activa' : '', onclick: () => { app.modulo = id; almacen.set('modulo', id); pintar(); } },
      el('span', { class: 'punto', style: `--c:${m.color}` }), m.corto,
      resumen && pendientes.length ? el('span', { class: 'pend', title: 'Apuntes nuevos sin resumir' }, `+${pendientes.length}`) : null)));

  const sel = info.find(x => x.id === app.modulo && x.archivos.length) || info.find(x => x.archivos.length);
  if (!sel) { cont.replaceChildren(el('p', { class: 'vacio' }, 'No hay apuntes todavía.')); return; }
  const f = app.filtro.trim().toLowerCase();
  const grupos = agruparApuntes(sel.archivos.filter(a => !f || a.ruta.toLowerCase().includes(f)));
  cont.replaceChildren(...[
    el('h2', {}, sel.m.titulo),
    sel.resumen && sel.pendientes.length
      ? el('p', { class: 'chip' }, `${sel.pendientes.length} apuntes nuevos sin resumir: pídele a Claude «actualiza los resúmenes».`) : null,
    sel.resumen ? pintarMd(sel.resumen) : el('p', { class: 'chip' }, 'Todavía no hay resumen de esta asignatura.'),
    el('div', { class: 'archivos' }, el('h2', {}, `Archivos · ${grupos.reduce((n, g) => n + g.archivos.length, 0)}`),
      ...grupos.flatMap(g => [g.grupo ? el('h3', {}, g.grupo) : null,
        ...g.archivos.map(a => {
          const nombre = a.ruta.split('/').pop();
          return el('button', { title: 'Abrir', onclick: () => abrirApunte(sel.m.carpeta, a.ruta).catch(e => aviso(e.message, 'error')) },
            nombre.replace(/\.[^.]+$/, ''), el('span', { class: 'ext' }, (nombre.match(/\.([^.]+)$/)?.[1] || '')));
        })]))].filter(Boolean)); // replaceChildren no descarta null: se filtra aquí
}

function cambiarVista(v) {
  app.vista = v;
  almacen.set('vista', v);
  pintar();
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
  app.vista = (await almacen.get('vista')) || 'tareas';
  app.modulo = (await almacen.get('modulo')) || app.modulo;
  if (app.carpeta && await fs.tienePermiso(app.carpeta)) await cargarDeCarpeta();
  pintar();

  for (const b of document.querySelectorAll('#pestanas button')) b.addEventListener('click', () => cambiarVista(b.dataset.vista));
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
    if (e.key === '1') cambiarVista('tareas');
    if (e.key === '2') cambiarVista('apuntes');
  });
  setInterval(() => app.datos && ($('#actualizado').textContent = hace(app.datos.fecha)), 60000);
  if (!app.carpeta) aviso('Primer uso: elige la carpeta DAW en ⚙ y pulsa Actualizar.');
}

iniciar();
