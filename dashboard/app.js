// Interfaz del dashboard: estado, actualizar, volcar a la carpeta DAW y pintar.
import { CAMPUS, agrupar, cuentaAtras, urgencia, modDe, urlEntrega, urlCampus, rutaFicha, rutaLibre,
  nombreArchivo, infoModulo, clave, esDescargaValida, estaHecha, fusionarMarcas, fmt, esExamen, porCierre, estado } from './logica.js';
import { fichaMd, readmeModulo, pendientesMd } from './markdown.js';
import { leerCampus, descargar, archivosDeCarpeta } from './campus.js';
import { parseMd, inline, agruparApuntes, sinResumir, tipoApunte, rutaApunte } from './apuntes.js';
import { MODULOS } from './logica.js';
import * as fs from './carpeta.js';
import { planDeHoy, duracion, esfuerzoDe, minutosDe, NOMBRE_ESFUERZO, SIGUIENTE_ESFUERZO, novedades, acumular,
  fusionarLectura, puntuar, proximaClase, cuandoEmpieza, examenes, diasHasta, anillos, resumenSemana, generarIcs,
  requisitos, promptClaude, clasesDelDia, mediasPorAsignatura } from './plan.js';
import { extraerTarjetas, sesionDeRepaso, responder, pendientesDeRepaso, buscarEnResumenes } from './estudio.js';
import { pintarInicio, pararInicio, inicioCambiado, pintarFondo, anadirFondos, quitarFondos } from './inicio.js';
import { pintarBaos, editarTarea, editarIdea, baosCambiado } from './baos.js';

const $ = s => document.querySelector(s);
const RUTA_POR_DEFECTO = 'C:\\Users\\fabri\\Desktop\\DAW';
const app = { datos: null, marcas: {}, carpeta: null, ruta: RUTA_POR_DEFECTO, filtro: '', ocupado: false,
  vista: 'inicio', modulo: '761', disposicion: 'lista',
  esfuerzos: {}, minutosHoy: 180, novedades: [], novedadesVistas: '',
  horario: [], foco: {}, repaso: {}, repasoDia: {}, checklist: {}, semanaOffset: 0, resumenes: null, repasoPendientes: null };
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
  $('#actualizar').classList.add('girando');
  const barra = $('#progreso');
  barra.hidden = false;
  barra.removeAttribute('value');
  aviso('');
  try {
    const conCarpeta = app.carpeta ? await fs.tienePermiso(app.carpeta, true) : false;
    const leidos = await leerCampus((hechas, total) => { barra.max = total || 1; barra.value = hechas; });
    const prev = app.datos;
    const { fallos, ...nuevos } = fusionarLectura(prev, leidos);
    app.datos = nuevos;
    app.novedades = acumular(app.novedades, novedades(prev, nuevos));
    await almacen.set('novedades', app.novedades);
    if (conCarpeta) await sincronizarMarcas(app.carpeta);
    const resumen = conCarpeta ? await volcar(app.carpeta, nuevos) : 'Elige la carpeta DAW en Ajustes para crear fichas.';
    await almacen.set('datos', app.datos);
    aviso(`Listo. ${resumen}${fallos ? ` ${fallos} tareas no se pudieron leer (se mantienen los datos anteriores).` : ''}`);
    setTimeout(() => { if ($('#aviso').textContent.startsWith('Listo.')) aviso(''); }, 6000);
  } catch (e) {
    const enlace = e.codigo === 'SIN_SESION' ? { url: `${CAMPUS}/login/index.php`, texto: 'Abrir el campus' } : null;
    aviso(e.message || String(e), 'error', enlace);
  } finally {
    app.ocupado = false;
    $('#actualizar').disabled = false;
    $('#actualizar').classList.remove('girando');
    barra.hidden = true;
    pintar();
  }
}

// ---------- pintar ----------

// Iconos de trazo (24×24). Se construyen con createElementNS: nunca se inyecta HTML.
const ICONOS = {
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 8h.01',
  carpeta: 'M3 6h6l2 2h10v11H3z',
  hoy: 'M7 3v3M17 3v3M4 8h16M5 5h14v15H5zM9 13h2v2H9z',
  semana: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  todas: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  vencidas: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v6M12 16.5h.01',
  chevron: 'M9 6l6 6-6 6',
  foco: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 11.5v1',
  reloj: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  campana: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  examen: 'M7 3h10v18H7zM10 8h4M10 12h4M10 16h2',
  tarjetas: 'M4 7h13v12H4zM7 4h13v12',
  atras: 'M15 6l-6 6 6 6',
  claude: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
};
function icono(nombre) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', ICONOS[nombre]);
  svg.append(p);
  return svg;
}

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Una fila al estilo de Recordatorios. estado: '' (pendiente), 'vencida' o 'hecha'.
function fila(t, ahora, estado = '') {
  const m = modDe(t);
  const marcada = estado === 'hecha' || estaHecha(app.marcas, t.id);
  const urg = estado || urgencia(t, ahora);
  const detalle = el('div', { class: 'detalle', hidden: '' },
    el('p', { class: 'enunciado' }, t.enunciado || 'Sin descripción en el campus.'),
    t.adjuntos?.length ? el('ul', {}, ...t.adjuntos.map(a => el('li', {}, el('a', { href: a.url, target: '_blank' }, a.nombre || nombreArchivo(a.url))))) : null,
    el('div', { class: 'enlaces' },
      el('a', { href: urlCampus(t), target: '_blank' }, 'Ver en el campus'),
      el('button', { class: 'enlace', onclick: () => abrirCarpeta(t) }, icono('carpeta'), 'Abrir carpeta en VS Code'),
      marcada ? null : el('button', { class: 'enlace', onclick: () => abrirFoco(t) }, icono('foco'), 'Modo foco'),
      marcada ? null : el('button', { class: 'enlace', onclick: () => empezarConClaude(t) }, icono('claude'), 'Empezar con Claude')),
    marcada ? null : checklist(t));
  const info = el('button', { class: 'info', title: 'Detalles', 'aria-label': 'Detalles', 'aria-expanded': 'false',
    onclick: () => {
      detalle.hidden = !detalle.hidden;
      info.setAttribute('aria-expanded', String(!detalle.hidden));
      li.classList.toggle('abierta', !detalle.hidden);
    } }, icono('info'));
  const check = el('button', { class: 'check', role: 'checkbox', 'aria-checked': String(marcada), style: `--c:${m.color}`,
    title: marcada ? 'Desmarcar' : 'Marcar como hecha', 'aria-label': marcada ? 'Desmarcar' : 'Marcar como hecha',
    onclick: () => {
      check.setAttribute('aria-checked', String(!marcada));
      setTimeout(() => alternarHecha(t), sinMovimiento() ? 0 : 280); // deja ver cómo se rellena el círculo
    } });
  const cuando = cuentaAtras(t.cierre, ahora);
  const li = el('li', { class: `fila ${urg}${marcada ? ' marcada' : ''}`, tabindex: '-1', 'data-id': t.id },
    check,
    el('div', { class: 'texto' },
      el('p', { class: 'nombre' }, t.nombre),
      el('p', { class: 'meta' },
        el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
        el('span', { class: 'cuando', title: t.cierre ? fmt(t.cierre) : '' }, cuando === 'sin fecha' ? 'Sin fecha' : cuando),
        marcada ? null : chipEsfuerzo(t))),
    el('button', { class: 'capsula', onclick: () => abrirExterno(urlEntrega(t)) }, t.mod === 'quiz' ? 'Hacer' : 'Entregar'),
    info,
    detalle);
  return li;
}

function grupo(id, titulo, tareas, ahora, estado) {
  return el('section', { class: 'grupo', id },
    el('h2', {}, titulo, el('span', { class: 'n' }, String(tareas.length))),
    el('ul', { class: 'lista' }, ...tareas.map(t => fila(t, ahora, estado))));
}

// Fichas de resumen arriba, como las listas inteligentes de Recordatorios.
function fichas(g) {
  // El destino se busca al pulsar: en el panel y en la lista existen secciones distintas.
  const ir = candidatos => {
    const s = candidatos.map(i => document.getElementById(i)).find(Boolean);
    if (!s) return;
    if (s.tagName === 'DETAILS') s.open = true;
    s.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' });
    s.classList.remove('resaltado');
    void s.offsetWidth; // reinicia la animación
    s.classList.add('resaltado');
  };
  const pendientes = g.hoy.length + g.manana.length + g.semana.length + g.despues.length + g.sinfecha.length;
  const semana = g.manana.length + g.semana.length;
  const datos = [
    ['hoy', 'Hoy', g.hoy.length, 'var(--rojo)', ['g-hoy']],
    ['semana', 'Esta semana', semana, 'var(--naranja)', ['g-manana', 'g-semana', 'g-hoy']],
    ['todas', 'Pendientes', pendientes, 'var(--azul)', ['g-hoy', 'g-manana', 'g-semana', 'g-despues', 'g-sinfecha']],
    ['vencidas', 'Vencidas', g.vencidas.length, 'var(--gris)', ['g-vencidas']],
  ];
  return el('nav', { class: 'fichas', 'aria-label': 'Resumen' }, ...datos.map(([ico, nombre, n, color, destino]) =>
    el('button', { class: 'ficha', style: `--c:${color}`, ...(n ? {} : { disabled: '' }), onclick: () => ir(destino) },
      el('span', { class: 'ficha-ico' }, icono(ico)),
      el('b', {}, String(n)),
      el('span', { class: 'ficha-nombre' }, nombre))));
}


// ---------- esfuerzo ----------

// Chip con la duración estimada; al pulsarlo pasa por corta → media → larga.
function chipEsfuerzo(t) {
  const e = esfuerzoDe(t, app.esfuerzos);
  return el('button', { class: `esfuerzo e-${e}`, title: `Esfuerzo: ${NOMBRE_ESFUERZO[e].toLowerCase()}. Pulsa para cambiarlo.`,
    onclick: ev => { ev.stopPropagation(); cambiarEsfuerzo(t); } }, icono('reloj'), duracion(minutosDe(t, app.esfuerzos)));
}
function cambiarEsfuerzo(t) {
  app.esfuerzos = { ...app.esfuerzos, [t.id]: SIGUIENTE_ESFUERZO[esfuerzoDe(t, app.esfuerzos)] };
  almacen.set('esfuerzos', app.esfuerzos);
  pintar();
}

// ---------- plan de hoy ----------

function cambiarTiempoHoy(delta) {
  app.minutosHoy = Math.min(10 * 60, Math.max(30, app.minutosHoy + delta));
  almacen.set('minutosHoy', app.minutosHoy);
  pintar();
}

function bloquePlan(g, ahora) {
  const p = planDeHoy(g, app.esfuerzos, app.minutosHoy);
  const filaPlan = ({ t, min }, i, extra) => {
    const m = modDe(t);
    return el('li', { class: `paso ${urgencia(t, ahora)}${extra ? ' extra' : ''}`, tabindex: '-1', 'data-id': t.id },
      extra ? el('span', { class: 'paso-n' }) : el('span', { class: 'paso-n' }, String(i + 1)),
      el('div', { class: 'texto' },
        el('p', { class: 'nombre' }, t.nombre),
        el('p', { class: 'meta' }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
          el('span', { class: 'cuando' }, cuentaAtras(t.cierre, ahora)), chipEsfuerzo(t))),
      el('button', { class: `capsula${!extra && i === 0 ? ' principal' : ''}`, onclick: () => abrirFoco(t) },
        !extra && i === 0 ? 'Empezar' : 'Enfocar'));
  };
  const sobrecarga = p.cargaSemana > app.minutosHoy * 5;
  return el('section', { class: 'bloque plan', id: 'g-plan' },
    el('div', { class: 'plan-cab' },
      el('div', {}, el('h2', {}, 'Plan de hoy'),
        el('p', { class: `plan-resumen${sobrecarga ? ' aviso-carga' : ''}` },
          p.hoy.length ? `${duracion(p.minutosHoy)} de trabajo. Esta semana: ${duracion(p.cargaSemana)}${sobrecarga ? ', va cargada' : ''}.`
            : 'Nada pendiente.')),
      el('div', { class: 'tiempo', title: 'Tiempo que tienes hoy para tareas' },
        el('button', { 'aria-label': 'Menos tiempo', onclick: () => cambiarTiempoHoy(-30) }, '−'),
        el('span', {}, duracion(app.minutosHoy)),
        el('button', { 'aria-label': 'Más tiempo', onclick: () => cambiarTiempoHoy(30) }, '+'))),
    p.hoy.length ? el('ol', { class: 'pasos' }, ...p.hoy.map((x, i) => filaPlan(x, i, false)),
      ...(p.extra.length ? [el('li', { class: 'pasos-sep' }, 'Si te sobra tiempo'), ...p.extra.map((x, i) => filaPlan(x, i, true))] : []))
      : el('p', { class: 'bloque-vacio' }, 'Hoy no tienes nada. Aprovecha para adelantar o descansar.'));
}

// ---------- novedades ----------

function bloqueNovedades() {
  const nuevas = app.novedades.filter(n => n.fecha > (app.novedadesVistas || ''));
  if (!nuevas.length || app.filtro.trim()) return null;
  const ICONO = { nueva: 'todas', fecha: 'reloj', nota: 'hoy', apunte: 'carpeta' };
  return el('section', { class: 'novedades', 'aria-label': 'Novedades' },
    el('div', { class: 'nov-cab' },
      el('span', { class: 'ficha-ico', style: '--c:var(--azul)' }, icono('campana')),
      el('h2', {}, `Novedades desde la última vez`, el('span', { class: 'n' }, String(nuevas.length))),
      el('button', { class: 'capsula', onclick: () => {
        app.novedadesVistas = new Date().toISOString();
        almacen.set('novedadesVistas', app.novedadesVistas);
        pintar();
      } }, 'Visto')),
    el('ul', {}, ...nuevas.slice(0, 6).map(n => el('li', { class: `nov-${n.tipo}` }, icono(ICONO[n.tipo] || 'info'), n.texto)),
      nuevas.length > 6 ? el('li', { class: 'nov-mas' }, `y ${nuevas.length - 6} más`) : null));
}

// ---------- disposición en panel (todo de un vistazo) ----------

function bloque(id, titulo, tareas, ahora, estado, vacio) {
  return el('section', { class: 'bloque', id },
    el('h2', {}, titulo, el('span', { class: 'n' }, String(tareas.length))),
    tareas.length ? el('ul', { class: 'lista' }, ...tareas.map(t => fila(t, ahora, estado)))
      : el('p', { class: 'bloque-vacio' }, vacio));
}

// Barras por asignatura: pendientes en su color y vencidas en rojo. Pulsar una filtra por ella.
function porAsignatura(g) {
  const cuenta = new Map();
  const sumar = (t, k) => {
    const m = modDe(t);
    const c = cuenta.get(m.corto) || { m, pend: 0, venc: 0 };
    c[k]++;
    cuenta.set(m.corto, c);
  };
  for (const t of [...g.hoy, ...g.manana, ...g.semana, ...g.despues, ...g.sinfecha]) sumar(t, 'pend');
  for (const t of g.vencidas) sumar(t, 'venc');
  const filas = [...cuenta.values()].sort((a, b) => b.pend - a.pend || b.venc - a.venc);
  const max = Math.max(1, ...filas.map(f => f.pend + f.venc));
  const filtrar = corto => { $('#buscar').value = corto; app.filtro = corto; pintar(); };
  const medias = mediasPorAsignatura(app.datos?.tareas || []);
  return el('section', { class: 'bloque asignaturas', id: 'g-asignaturas' },
    el('h2', {}, 'Por asignatura'),
    filas.length ? el('ul', { class: 'barras' }, ...filas.map(({ m, pend, venc }) => el('li', {},
      el('button', { title: `Ver solo ${m.titulo}`, onclick: () => filtrar(m.corto) },
        el('span', { class: 'asig' }, el('span', { class: 'punto', style: `--c:${m.color}` }), m.corto),
        el('span', { class: 'pista' },
          el('span', { class: 'b-pend', style: `--c:${m.color};width:${(pend / max) * 100}%` }),
          el('span', { class: 'b-venc', style: `width:${(venc / max) * 100}%` })),
        el('span', { class: 'cifras' }, String(pend), venc ? el('small', {}, ` +${venc}`) : null),
        el('span', { class: `nota-media${medias[m.corto] ? '' : ' sin'}`, title: medias[m.corto] ? `Media de ${medias[m.corto].n} notas` : 'Sin notas todavía' },
          medias[m.corto] ? medias[m.corto].media.toFixed(1).replace('.', ',') : '–')))))
      : el('p', { class: 'bloque-vacio' }, 'Nada pendiente.'),
    el('p', { class: 'leyenda' }, el('i', { class: 'l-pend' }), 'pendientes', el('i', { class: 'l-venc' }), 'vencidas'));
}

function pintarPanel(g, ahora) {
  return el('div', { class: 'panel' },
    bloqueNovedades(),
    el('div', { class: 'panel-cima' }, bloquePlan(g, ahora),
      el('div', { class: 'columna-ahora' }, bloqueAnillos(g, ahora), bloqueAhora(ahora)), fichas(g)),
    el('div', { class: 'bloques' },
      bloque('g-hoy', 'Hoy y mañana', [...g.hoy, ...g.manana], ahora, '', 'Nada para hoy ni mañana.'),
      bloque('g-semana', 'Esta semana', g.semana, ahora, '', 'Semana libre.'),
      bloque('g-despues', 'Más adelante y sin fecha', [...g.despues, ...g.sinfecha], ahora, '', 'Nada más adelante.'),
      porAsignatura(g),
      bloque('g-vencidas', 'Vencidas sin entregar', g.vencidas, ahora, 'vencida', 'Ninguna vencida.'),
      bloque('g-entregadas', 'Entregadas', g.entregadas, ahora, 'hecha', 'Aún no hay entregas.')));
}

// Alto disponible para las dos filas de bloques: lo que queda bajo la cabecera, el aviso y la fila de arriba.
function ajustarAlto() {
  const b = document.querySelector('.bloques');
  if (!b) return;
  const arriba = b.getBoundingClientRect().top + scrollY;
  document.documentElement.style.setProperty('--alto-cima', `${Math.round(arriba + 16 + 34)}px`); // hueco entre filas + margen inferior
}
addEventListener('resize', ajustarAlto);

function alternarDisposicion() {
  app.disposicion = app.disposicion === 'panel' ? 'lista' : 'panel';
  almacen.set('disposicion', app.disposicion);
  const cambiar = () => pintar();
  if (document.startViewTransition && !sinMovimiento() && document.visibilityState === 'visible') document.startViewTransition(cambiar).ready.catch(() => {});
  else cambiar();
}

// Repinta conservando la fila seleccionada con el teclado (repintar crea filas nuevas).
function pintar() {
  const sel = document.activeElement?.closest?.('#lista .fila, #lista .paso');
  const id = sel?.dataset.id, tipo = sel?.classList.contains('paso') ? 'paso' : 'fila';
  pintarTodo();
  if (id) document.querySelector(`#lista .${tipo}[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
}

function pintarTodo() {
  const panel = app.disposicion === 'panel';
  document.documentElement.dataset.disposicion = app.disposicion;
  document.body.classList.toggle('modo-panel', panel && app.vista === 'tareas');
  const bd = $('#cambiar-disposicion');
  bd.hidden = app.vista !== 'tareas';
  bd.title = panel ? 'Ver como lista (D)' : 'Ver como panel (D)';
  bd.setAttribute('aria-label', panel ? 'Ver como lista' : 'Ver como panel');
  const modo = modoDe(app.vista);
  aplicarModo(modo);
  $('#lista').hidden = app.vista !== 'tareas';
  $('#apuntes').hidden = app.vista !== 'apuntes';
  $('#semana').hidden = app.vista !== 'semana';
  $('#inicio').hidden = app.vista !== 'inicio';
  $('#baos').hidden = modo !== 'baos';
  $('#titulo-vista').textContent = MODOS[modo].titulo(app.vista);
  $('#subtitulo-vista').textContent = MODOS[modo].subtitulo || '';
  $('#buscar').placeholder = { apuntes: 'Buscar en apuntes y resúmenes', baos: 'Buscar en Dr. Baos', ideas: 'Buscar ideas' }[app.vista] || 'Buscar tareas';
  document.body.classList.toggle('modo-semana', app.vista === 'semana');
  document.body.classList.toggle('modo-ancho', modo !== 'grado');
  $('#actualizado').textContent = app.datos && modo === 'grado' ? hace(app.datos.fecha).replace(/^a/, 'A') : '';
  // El aviso de primer uso es del grado: no ensuciar Inicio ni Dr. Baos.
  if (!app.carpeta) {
    if (modo === 'grado') { if ($('#aviso').hidden) aviso(PRIMER_USO); }
    else if ($('#aviso').textContent === PRIMER_USO) aviso('');
  }
  if (app.vista !== 'inicio') pararInicio();
  if (app.vista === 'inicio') { pintarInicio($('#inicio'), { datos: app.datos, marcas: app.marcas, irA: cambiarVista }).catch(e => aviso(e.message, 'error')); return; }
  if (modo === 'baos') { pintarBaos($('#baos'), { filtro: app.filtro, vista: app.vista }).catch(e => aviso(e.message, 'error')); return; }
  if (app.vista === 'apuntes') { pintarApuntes().catch(e => aviso(e.message, 'error')); return; }
  if (app.vista === 'semana') { pintarSemana(); return; }
  const lista = $('#lista');
  lista.replaceChildren();
  if (!app.datos) {
    lista.append(el('p', { class: 'vacio' }, 'Pulsa Actualizar para leer el campus.'));
    return;
  }
  const ahora = new Date();
  const g = agrupar(app.datos.tareas, app.marcas, ahora, app.filtro);
  if (panel) { lista.append(pintarPanel(g, ahora)); ajustarAlto(); return; }
  const titulos = { hoy: 'Hoy', manana: 'Mañana', semana: 'Esta semana', despues: 'Más adelante', sinfecha: 'Sin fecha' };
  const secciones = [];
  for (const [k, titulo] of Object.entries(titulos)) if (g[k].length) secciones.push(grupo(`g-${k}`, titulo, g[k], ahora));
  if (!secciones.length) secciones.push(el('p', { class: 'vacio' }, app.filtro ? 'Nada coincide con la búsqueda.' : 'Nada pendiente.'));
  for (const [id, titulo, tareas, estado] of [['g-vencidas', 'Vencidas sin entregar', g.vencidas, 'vencida'], ['g-entregadas', 'Entregadas', g.entregadas, 'hecha']]) {
    if (!tareas.length) continue;
    secciones.push(el('details', { class: 'grupo', id },
      el('summary', {}, icono('chevron'), titulo, el('span', { class: 'n' }, String(tareas.length))),
      el('ul', { class: 'lista' }, ...tareas.map(t => fila(t, ahora, estado)))));
  }
  lista.append(...secciones);
  if (!app.filtro.trim()) {
    lista.prepend(...[bloqueNovedades(), fichas(g), el('div', { class: 'fila-ahora' }, bloqueAnillos(g, ahora), bloqueAhora(ahora)),
      bloquePlan(g, ahora)].filter(Boolean));
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
  const enResumenes = f ? await resultadosResumenes(app.filtro) : null;
  const nTarjetas = sel.resumen ? extraerTarjetas(sel.id, sel.resumen).length : 0;
  cont.replaceChildren(...[
    enResumenes,
    el('div', { class: 'apuntes-cab' }, el('h2', {}, sel.m.titulo),
      nTarjetas ? el('button', { class: 'capsula principal', onclick: () => abrirRepaso(sel.id) }, icono('tarjetas'), `Repasar (${nTarjetas} tarjetas)`) : null),
    sel.resumen && sel.pendientes.length
      ? el('p', { class: 'chip' }, `${sel.pendientes.length} apuntes nuevos sin resumir: pídele a Claude «actualiza los resúmenes».`) : null,
    sel.resumen ? pintarMd(sel.resumen) : el('p', { class: 'chip' }, 'Todavía no hay resumen de esta asignatura.'),
    el('div', { class: 'archivos' }, el('h2', {}, 'Archivos', el('span', { class: 'n' }, String(grupos.reduce((n, g) => n + g.archivos.length, 0)))),
      ...grupos.flatMap(g => [g.grupo ? el('h3', {}, g.grupo) : null,
        ...g.archivos.map(a => {
          const nombre = a.ruta.split('/').pop();
          return el('button', { title: 'Abrir', onclick: () => abrirApunte(sel.m.carpeta, a.ruta).catch(e => aviso(e.message, 'error')) },
            nombre.replace(/\.[^.]+$/, ''), el('span', { class: 'ext' }, (nombre.match(/\.([^.]+)$/)?.[1] || '')));
        })]))].filter(Boolean)); // replaceChildren no descarta null: se filtra aquí
}

// ---------- modos: cada uno con sus pestañas y su estética ----------
const PRIMER_USO = 'Primer uso: elige la carpeta DAW en Ajustes (la rueda de arriba a la derecha) y pulsa Actualizar.';
const MODOS = {
  inicio: { nombre: 'Inicio', desc: 'Tu día de un vistazo', vistas: { inicio: 'Inicio' }, titulo: () => 'Riga Hub' },
  baos: { nombre: 'Dr. Baos', desc: 'Clínica Dental · cliente', vistas: { baos: 'Tablero', ideas: 'Ideas' },
    titulo: () => 'Dr. Baos', subtitulo: 'Clínica Dental · Majadahonda · Argés' },
  grado: { nombre: 'Grado', desc: 'DAW · tareas, semana y apuntes', vistas: { tareas: 'Tareas', semana: 'Semana', apuntes: 'Apuntes' },
    titulo: v => ({ tareas: 'Tareas', semana: 'Semana', apuntes: 'Apuntes' })[v] },
};
const modoDe = v => Object.keys(MODOS).find(m => v in MODOS[m].vistas) || 'inicio';
let vistasModo = {}; // última pestaña usada en cada modo

function aplicarModo(modo) {
  document.documentElement.dataset.modo = modo;
  try { localStorage.setItem('modo', modo); } catch {}
  $('#nombre-modo').textContent = MODOS[modo].nombre;
  document.title = { inicio: 'Riga Hub', baos: 'Dr. Baos · Riga Hub', grado: 'Grado · Riga Hub' }[modo];
  const nav = $('#pestanas');
  const vistas = Object.entries(MODOS[modo].vistas);
  if (nav.dataset.modo !== modo) {
    nav.dataset.modo = modo;
    nav.replaceChildren(...(vistas.length > 1 ? vistas.map(([v, n], i) =>
      el('button', { 'data-vista': v, title: `${n} (${i + 1})`, onclick: () => cambiarVista(v) }, n)) : []));
  }
  for (const b of nav.querySelectorAll('button')) b.classList.toggle('activa', b.dataset.vista === app.vista);
}

function cambiarVista(v) {
  app.vista = v;
  vistasModo[modoDe(v)] = v;
  almacen.set('vista', v);
  almacen.set('vistasModo', vistasModo);
  window.scrollTo({ top: 0 });
  pintar();
}

function cambiarModo(m) {
  cerrarMenuModos();
  if (modoDe(app.vista) === m) return;
  const v = vistasModo[m] in MODOS[m].vistas ? vistasModo[m] : Object.keys(MODOS[m].vistas)[0];
  if (document.startViewTransition && !sinMovimiento() && document.visibilityState === 'visible') document.startViewTransition(() => cambiarVista(v)).ready.catch(() => {});
  else cambiarVista(v);
}

function abrirMenuModos() {
  const menu = $('#menu-modos'), actual = modoDe(app.vista);
  menu.replaceChildren(el('p', { class: 'menu-titulo' }, 'Modo'), ...Object.entries(MODOS).map(([id, m], i) =>
    el('button', { class: 'opcion-modo', role: 'menuitemradio', 'aria-checked': String(id === actual), onclick: () => cambiarModo(id) },
      el('span', { class: `muestra muestra-${id}`, 'aria-hidden': 'true' }, el('i'), el('i'), el('i')),
      el('span', {}, el('b', {}, m.nombre), el('small', {}, m.desc)),
      el('kbd', {}, String(i + 1)))));
  menu.hidden = false;
  $('#boton-modo').setAttribute('aria-expanded', 'true');
  (menu.querySelector('[aria-checked="true"]') || menu.querySelector('button')).focus();
}
function cerrarMenuModos() {
  if ($('#menu-modos').hidden) return;
  $('#menu-modos').hidden = true;
  $('#boton-modo').setAttribute('aria-expanded', 'false');
}
function teclaMenuModos(e) {
  const ops = [...$('#menu-modos').querySelectorAll('.opcion-modo')];
  const i = ops.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); cerrarMenuModos(); $('#boton-modo').focus(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); ops[(i + 1) % ops.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ops[(i - 1 + ops.length) % ops.length].focus(); }
  else if (/^[1-9]$/.test(e.key) && ops[e.key - 1]) { e.preventDefault(); ops[e.key - 1].click(); }
}

// ---------- copia de seguridad (Inicio y Dr. Baos viven solo en este Chrome) ----------
const CLAVES_COPIA = ['baos', 'inicio'];

async function exportarCopia() {
  const datos = { app: 'rigatony-dash', fecha: new Date().toISOString(), ...(await chrome.storage.local.get(CLAVES_COPIA)) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  el('a', { href: url, download: `rigatony-dash-${new Date().toISOString().slice(0, 10)}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importarCopia(e) {
  const archivo = e.target.files?.[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    const datos = JSON.parse(await archivo.text());
    if (datos.app !== 'rigatony-dash') throw new Error('Ese archivo no es una copia de Rigatony Dash.');
    const nuevo = Object.fromEntries(CLAVES_COPIA.filter(k => datos[k]).map(k => [k, datos[k]]));
    if (!confirm(`Esto sustituye ${Object.keys(nuevo).join(' y ')} de este Chrome por la copia del ${new Date(datos.fecha).toLocaleDateString('es-ES')}. ¿Seguir?`)) return;
    await chrome.storage.local.set(nuevo);
    location.reload();
  } catch (err) { aviso(err.message, 'error'); }
}

// ---------- ajustes y arranque ----------

async function pintarAjustes() {
  $('#nombre-carpeta').textContent = app.carpeta ? app.carpeta.name : 'sin elegir';
  $('#ruta').value = app.ruta;
  pintarHorario();
}

async function cargarDeCarpeta() {
  const d = await fs.leer(app.carpeta, 'dashboard/datos/campus.json');
  if (d) { const x = JSON.parse(d); if (!app.datos || x.fecha > app.datos.fecha) app.datos = x; }
  await sincronizarMarcas(app.carpeta); // fusiona, nunca reemplaza
}

// ---------- modo foco: una sola tarea y un temporizador ----------

const POMODORO = 25 * 60;
const foco = { t: null, total: POMODORO, restante: POMODORO, corriendo: false, intervalo: null, segundos: 0, titulo: document.title };
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const hoyISO = () => new Date().toLocaleDateString('sv'); // AAAA-MM-DD local

async function guardarMinutosFoco() {
  if (foco.segundos < 60) return;
  const registro = (await almacen.get('foco')) || {};
  registro[hoyISO()] = (registro[hoyISO()] || 0) + Math.round(foco.segundos / 60);
  foco.segundos = 0;
  await almacen.set('foco', registro);
}

function pintarReloj() {
  $('#foco-reloj').textContent = mmss(foco.restante);
  $('#foco-anillo').style.setProperty('--p', String(1 - foco.restante / foco.total));
  $('#foco-pausa').textContent = foco.corriendo ? 'Pausa' : foco.restante === foco.total ? 'Empezar' : 'Seguir';
  document.title = foco.corriendo ? `${mmss(foco.restante)} · ${foco.t?.nombre || 'Foco'}` : foco.titulo;
}

function arrancarReloj(si = !foco.corriendo) {
  foco.corriendo = si && foco.restante > 0;
  clearInterval(foco.intervalo);
  if (foco.corriendo) {
    foco.intervalo = setInterval(() => {
      foco.restante--; foco.segundos++;
      if (foco.restante <= 0) {
        foco.restante = 0;
        arrancarReloj(false);
        guardarMinutosFoco();
        chrome.notifications?.create(`foco|${Date.now()}`, { type: 'basic', iconUrl: 'icons/icon128.png',
          title: 'Pomodoro terminado', message: `${foco.t?.nombre || ''}. Descansa 5 minutos.` });
      }
      pintarReloj();
    }, 1000);
  }
  pintarReloj();
}

function abrirFoco(t) {
  const m = modDe(t);
  const ahora = new Date();
  foco.t = t;
  foco.total = foco.restante = POMODORO;
  const enunciado = el('div', { class: 'foco-enunciado', hidden: '' }, t.enunciado || 'Sin descripción en el campus.');
  $('#foco-contenido').replaceChildren(
    el('p', { class: 'foco-meta' }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
      el('span', { class: `cuando ${urgencia(t, ahora)}` }, cuentaAtras(t.cierre, ahora))),
    el('h2', { id: 'foco-nombre' }, t.nombre),
    el('div', { id: 'foco-anillo', class: 'anillo' }, el('span', { id: 'foco-reloj' }, mmss(foco.restante))),
    el('div', { class: 'foco-controles' },
      el('button', { id: 'foco-pausa', class: 'capsula principal', onclick: () => arrancarReloj() }, 'Pausa'),
      el('button', { class: 'capsula', onclick: () => { foco.total += 300; foco.restante += 300; pintarReloj(); } }, '+5 min'),
      el('button', { class: 'capsula', onclick: () => { foco.total = foco.restante = POMODORO; arrancarReloj(false); } }, 'Reiniciar')),
    el('div', { class: 'foco-acciones' },
      el('button', { class: 'enlace', onclick: () => abrirExterno(urlEntrega(t)) }, icono('todas'), t.mod === 'quiz' ? 'Hacer en el campus' : 'Entregar'),
      el('button', { class: 'enlace', onclick: () => abrirCarpeta(t) }, icono('carpeta'), 'Abrir carpeta'),
      el('button', { class: 'enlace', onclick: () => empezarConClaude(t) }, icono('claude'), 'Empezar con Claude'),
      el('button', { class: 'enlace', onclick: e => { enunciado.hidden = !enunciado.hidden; e.currentTarget.classList.toggle('activo', !enunciado.hidden); } },
        icono('info'), 'Enunciado')),
    enunciado,
    checklist(t),
    el('div', { class: 'foco-pie' },
      el('button', { class: 'texto', onclick: cerrarFoco }, 'Salir'),
      el('button', { class: 'capsula hecha', onclick: () => terminarYSeguir(t) }, 'Hecha, siguiente')));
  $('#foco').hidden = false;
  document.body.classList.add('con-foco');
  arrancarReloj(true);
  $('#foco-pausa').focus();
}

async function cerrarFoco() {
  arrancarReloj(false);
  await guardarMinutosFoco();
  $('#foco').hidden = true;
  document.body.classList.remove('con-foco');
  document.title = foco.titulo;
  foco.t = null;
}

async function terminarYSeguir(t) {
  await guardarMinutosFoco();
  if (!estaHecha(app.marcas, t.id)) await alternarHecha(t);
  const g = agrupar(app.datos?.tareas || [], app.marcas, new Date());
  const siguiente = planDeHoy(g, app.esfuerzos, app.minutosHoy).hoy[0]?.t;
  if (siguiente) abrirFoco(siguiente);
  else { await cerrarFoco(); aviso('Plan de hoy completado. Buen trabajo.'); }
}

// ---------- paleta de comandos (Ctrl+K) ----------

const paleta = { items: [], sel: 0 };

function comandos() {
  const ahora = new Date();
  const g = agrupar(app.datos?.tareas || [], app.marcas, ahora);
  const tareas = [...g.hoy, ...g.manana, ...g.semana, ...g.despues, ...g.sinfecha, ...g.vencidas].map(t => {
    const m = modDe(t);
    return { tipo: 'Tarea', texto: t.nombre, buscar: `${t.nombre} ${m.corto} ${m.titulo}`, sub: `${m.corto}, ${cuentaAtras(t.cierre, ahora)}`,
      color: m.color, accion: e => (e?.shiftKey ? abrirFoco(t) : e?.altKey ? abrirCarpeta(t) : abrirExterno(urlEntrega(t))) };
  });
  const cmd = (texto, accion, sub = '') => ({ tipo: 'Comando', texto, buscar: texto, sub, accion });
  const pc = proximaClase(app.horario, ahora);
  const unirse = pc && aulaDe(pc.curso)
    ? [cmd(`Unirse a la clase de ${cursoDe(pc.curso).corto}`, () => abrirExterno(aulaDe(pc.curso)), cuandoEmpieza(pc.inicio, ahora))] : [];
  return [
    ...unirse,
    ...tareas,
    cmd('Empezar el plan de hoy', () => {
      const t = planDeHoy(g, app.esfuerzos, app.minutosHoy).hoy[0]?.t;
      if (t) abrirFoco(t); else aviso('No hay nada pendiente para hoy.');
    }, 'Modo foco'),
    cmd('Actualizar desde el campus', actualizar, 'R'),
    cmd(app.disposicion === 'panel' ? 'Ver como lista' : 'Ver como panel', () => { if (app.vista !== 'tareas') cambiarVista('tareas'); alternarDisposicion(); }, 'D'),
    cmd('Cambiar entre claro y oscuro', () => $('#cambiar-tema').click(), 'T'),
    ...Object.entries(MODOS).map(([id, m]) => cmd(`Modo ${m.nombre}`, () => cambiarModo(id), 'M')),
    cmd('Dr. Baos: nueva tarea', () => { cambiarVista('baos'); editarTarea(); }, 'N'),
    cmd('Dr. Baos: nueva idea', () => { cambiarVista('ideas'); editarIdea(); }),
    cmd('Dr. Baos: ideas', () => cambiarVista('ideas')),
    cmd('Ir a Tareas', () => cambiarVista('tareas')),
    cmd('Ir a Semana', () => cambiarVista('semana')),
    cmd('Ir a Apuntes', () => cambiarVista('apuntes')),
    cmd('Inicio: añadir foto de fondo', anadirFondos),
    cmd('Copia de seguridad: exportar Inicio y Dr. Baos', exportarCopia),
    cmd('Copia de seguridad: importar', () => $('#importar-archivo').click()),
    cmd('Repasar tarjetas de hoy', () => abrirRepaso(), 'Repaso'),
    cmd('Tu semana: resumen', abrirResumenSemana),
    cmd('Exportar entregas al calendario (.ics)', descargarIcs),
    cmd('Horario de clases', () => abrirAjustes('horario')),
    cmd('Ajustes', () => abrirAjustes()),
    cmd('Atajos de teclado', () => $('#atajos').showModal(), '?'),
    ...Object.entries(MODULOS).map(([id, m]) => ({ tipo: 'Apuntes', texto: `Apuntes de ${m.corto}`, buscar: `apuntes ${m.corto} ${m.titulo}`,
      sub: m.titulo, color: m.color, accion: () => { app.modulo = id; almacen.set('modulo', id); cambiarVista('apuntes'); } })),
  ];
}

function pintarPaleta() {
  const q = $('#paleta-buscar').value;
  const todos = comandos();
  paleta.items = (q.trim()
    ? todos.map(c => ({ c, p: puntuar(q, c.buscar) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p).map(x => x.c)
    : todos.filter(c => c.tipo !== 'Apuntes')).slice(0, 9);
  paleta.sel = Math.min(paleta.sel, Math.max(0, paleta.items.length - 1));
  $('#paleta-lista').replaceChildren(...(paleta.items.length ? paleta.items.map((c, i) =>
    el('li', { role: 'option', id: `pal-${i}`, 'aria-selected': String(i === paleta.sel), class: i === paleta.sel ? 'sel' : '',
      onmousemove: () => { if (paleta.sel !== i) { paleta.sel = i; pintarPaleta(); } },
      onclick: e => ejecutarPaleta(i, e) },
      el('span', { class: 'punto', style: `--c:${c.color || 'var(--texto-3)'}` }),
      el('span', { class: 'pal-texto' }, c.texto, c.sub ? el('small', {}, c.sub) : null),
      el('span', { class: 'pal-tipo' }, c.tipo)))
    : [el('li', { class: 'pal-vacio' }, 'Sin resultados')]));
  $('#paleta-buscar').setAttribute('aria-activedescendant', paleta.items.length ? `pal-${paleta.sel}` : '');
}

function abrirPaleta() {
  if ($('#paleta').open) return;
  if (!$('#foco').hidden) cerrarFoco();
  $('#paleta-buscar').value = '';
  paleta.sel = 0;
  pintarPaleta();
  $('#paleta').showModal();
  $('#paleta-buscar').focus();
}

function ejecutarPaleta(i, e) {
  const c = paleta.items[i];
  if (!c) return;
  $('#paleta').close();
  c.accion(e);
}

// ---------- teclado ----------

// Filas visibles (lista, panel y plan) en orden de pantalla.
const filasVisibles = () => [...document.querySelectorAll('#lista .fila, #lista .paso')]
  .filter(f => f.offsetParent && !f.closest('details:not([open])'));

function moverSeleccion(paso) {
  const filas = filasVisibles();
  if (!filas.length) return;
  const actual = filas.indexOf(document.activeElement?.closest('.fila, .paso'));
  const siguiente = filas[actual < 0 ? 0 : Math.min(filas.length - 1, Math.max(0, actual + paso))];
  siguiente.focus();
  siguiente.scrollIntoView({ block: 'nearest', behavior: sinMovimiento() ? 'auto' : 'smooth' });
}

const tareaDe = filaEl => app.datos?.tareas?.find(t => t.id === filaEl?.dataset.id);

function teclaEnFila(e) {
  const f = document.activeElement?.closest('.fila, .paso');
  const t = tareaDe(f);
  if (!f || !t || (e.target instanceof Element && e.target.matches('button') && e.key === 'Enter')) return false;
  const k = e.key.toLowerCase();
  if (e.key === 'Enter') f.querySelector('.capsula')?.click();
  else if (k === 'x') { const c = f.querySelector('.check'); if (c) c.click(); else alternarHecha(t); }
  else if (k === 'o') abrirCarpeta(t);
  else if (k === 'i') f.querySelector('.info')?.click();
  else if (k === 'f') abrirFoco(t);
  else if (k === 'e') cambiarEsfuerzo(t);
  else if (k === 'c') empezarConClaude(t);
  else return false;
  return true;
}

function alPulsarTecla(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPaleta(); return; }
  if (!$('#repaso').hidden) {
    if (e.key === 'Escape') cerrarRepaso();
    else if (e.key === ' ' && !repaso.visto && repaso.i < repaso.cola.length) { e.preventDefault(); repaso.visto = true; pintarTarjeta(); }
    else if (repaso.visto && (e.key === '1' || e.key === '2')) contestar(e.key === '2');
    return;
  }
  const destino = e.target instanceof Element ? e.target : document.body;
  if (!$('#foco').hidden) {
    if (e.key === 'Escape') cerrarFoco();
    else if (e.key === ' ' && !destino.matches('button')) { e.preventDefault(); arrancarReloj(); }
    return;
  }
  if (!$('#menu-modos').hidden) { teclaMenuModos(e); return; }
  if (destino.matches('input, textarea') || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (teclaEnFila(e)) { e.preventDefault(); return; }
  const k = e.key;
  if (app.vista === 'tareas' && (k === 'j' || k === 'ArrowDown')) { e.preventDefault(); moverSeleccion(1); }
  else if (app.vista === 'tareas' && (k === 'k' || k === 'ArrowUp')) { e.preventDefault(); moverSeleccion(-1); }
  else if ((k === 'r' || k === 'R') && modoDe(app.vista) === 'grado') { e.preventDefault(); actualizar(); }
  else if (k === '/' && app.vista !== 'inicio') { e.preventDefault(); $('#buscar').focus(); }
  else if (k === 'm' || k === 'M') { e.preventDefault(); abrirMenuModos(); }
  else if (/^[1-9]$/.test(k)) { const v = Object.keys(MODOS[modoDe(app.vista)].vistas)[k - 1]; if (v) cambiarVista(v); }
  else if ((k === 'n' || k === 'N') && modoDe(app.vista) === 'baos') { e.preventDefault(); app.vista === 'ideas' ? editarIdea() : editarTarea(); }
  else if ((k === 'd' || k === 'D') && app.vista === 'tareas') alternarDisposicion();
  else if (k === '?') $('#atajos').showModal();
}

// ---------- lo próximo: clase, examen y repaso ----------

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const cursoDe = id => {
  const c = app.datos?.cursos?.find(x => x.id === id);
  return infoModulo(id, c?.nombre || '');
};
const aulaDe = id => app.datos?.cursos?.find(c => c.id === id)?.aula || null;
const cursosConocidos = () => {
  const ids = new Set([...(app.datos?.cursos || []).map(c => c.id), ...Object.keys(MODULOS)]);
  return [...ids].map(id => ({ id, m: cursoDe(id) })).sort((a, b) => a.m.corto.localeCompare(b.m.corto, 'es'));
};

function bloqueAhora(ahora) {
  const items = [];
  const pc = proximaClase(app.horario, ahora);
  if (pc) {
    const m = cursoDe(pc.curso), aula = aulaDe(pc.curso);
    items.push(el('li', { class: pc.enCurso ? 'ahora-en-curso' : '' },
      el('span', { class: 'ficha-ico', style: `--c:${m.color}` }, icono('video')),
      el('div', { class: 'texto' }, el('p', { class: 'nombre' }, pc.enCurso ? `En clase: ${m.corto}` : `Clase de ${m.corto}`),
        el('p', { class: 'meta' }, pc.enCurso ? `hasta las ${pc.fin.toTimeString().slice(0, 5)}` : cuandoEmpieza(pc.inicio, ahora))),
      aula ? el('button', { class: `capsula${pc.enCurso || pc.inicio - ahora < 15 * 6e4 ? ' principal' : ''}`, onclick: () => abrirExterno(aula) }, 'Unirse')
        : el('span', { class: 'meta' }, 'sin enlace')));
  } else {
    items.push(el('li', {}, el('span', { class: 'ficha-ico', style: '--c:var(--gris)' }, icono('video')),
      el('div', { class: 'texto' }, el('p', { class: 'nombre' }, 'Tu horario de clases'),
        el('p', { class: 'meta' }, 'Añádelo para ver aquí la próxima clase')),
      el('button', { class: 'capsula', onclick: () => abrirAjustes('horario') }, 'Añadir')));
  }
  const ex = examenes(app.datos?.tareas || [], app.marcas, ahora)[0];
  if (ex) {
    const m = modDe(ex), d = diasHasta(ex.cierre, ahora);
    items.push(el('li', { class: d <= 2 ? 'alta' : d <= 7 ? 'media' : '' },
      el('span', { class: 'ficha-ico', style: '--c:var(--naranja)' }, icono('examen')),
      el('div', { class: 'texto' }, el('p', { class: 'nombre' }, ex.nombre),
        el('p', { class: 'meta' }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
          el('span', { class: 'cuando' }, d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`))),
      el('button', { class: 'capsula', onclick: () => abrirRepaso(Object.keys(MODULOS).find(k => MODULOS[k].corto === m.corto)) }, 'Repasar')));
  }
  if (app.carpeta) {
    const n = app.repasoPendientes;
    items.push(el('li', {},
      el('span', { class: 'ficha-ico', style: '--c:var(--azul)' }, icono('tarjetas')),
      el('div', { class: 'texto' }, el('p', { class: 'nombre' }, 'Repaso de hoy'),
        el('p', { class: 'meta' }, n == null ? 'Tarjetas de tus resúmenes' : n ? `${n} ${n === 1 ? 'tarjeta toca' : 'tarjetas tocan'} hoy, más nuevas` : 'Al día: solo tarjetas nuevas')),
      el('button', { class: 'capsula', onclick: () => abrirRepaso() }, 'Repasar')));
  }
  return el('section', { class: 'bloque ahora', id: 'g-ahora' }, el('h2', {}, 'Lo próximo'), el('ul', { class: 'ahora-lista' }, ...items));
}

// ---------- anillos ----------

const OBJETIVO_REPASO = 15;

function svgAnillos(valores) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'svg-anillos');
  svg.setAttribute('aria-hidden', 'true');
  valores.forEach(({ p, color }, i) => {
    const r = 52 - i * 15, c = 2 * Math.PI * r;
    for (const fondo of [true, false]) {
      const circ = document.createElementNS(ns, 'circle');
      for (const [k, v] of Object.entries({ cx: 60, cy: 60, r, fill: 'none', 'stroke-width': 12, 'stroke-linecap': 'round', stroke: color })) circ.setAttribute(k, v);
      if (fondo) circ.setAttribute('opacity', '.18');
      else {
        circ.setAttribute('stroke-dasharray', String(c));
        circ.setAttribute('stroke-dashoffset', String(c * (1 - Math.min(1, Math.max(0.001, p)))));
        circ.setAttribute('transform', 'rotate(-90 60 60)');
        if (p <= 0) circ.setAttribute('opacity', '0');
      }
      svg.append(circ);
    }
  });
  return svg;
}

function bloqueAnillos(g, ahora) {
  const plan = planDeHoy(g, app.esfuerzos, app.minutosHoy);
  const r = anillos({ marcas: app.marcas, foco: app.foco, pendientesHoy: plan.hoy.length, ahora });
  const repaso = app.repasoDia[ahora.toLocaleDateString('sv')] || 0;
  const filas = [
    ['var(--rojo)', 'Entregas', `${r.entregas.hechas}/${r.entregas.objetivo}`, r.entregas.hechas / r.entregas.objetivo],
    ['var(--verde)', 'Foco', `${r.foco.minutos}/${r.foco.objetivo} min`, r.foco.minutos / r.foco.objetivo],
    ['var(--azul)', 'Repaso', `${repaso}/${OBJETIVO_REPASO}`, repaso / OBJETIVO_REPASO],
  ];
  return el('section', { class: 'bloque anillos', id: 'g-anillos' },
    el('h2', {}, 'Tu día'),
    el('div', { class: 'anillos-cuerpo' },
      svgAnillos(filas.map(([color, , , p]) => ({ color, p }))),
      el('ul', { class: 'anillos-leyenda' }, ...filas.map(([color, nombre, valor]) =>
        el('li', { style: `--c:${color}` }, el('span', { class: 'nombre-anillo' }, nombre), el('b', {}, valor))),
        el('li', { class: 'racha' }, r.racha ? `Racha: ${r.racha} ${r.racha === 1 ? 'día' : 'días'}` : 'Empieza tu racha hoy'))),
    el('button', { class: 'enlace ver-semana', onclick: abrirResumenSemana }, 'Ver tu semana'));
}

// ---------- horario (ajustes) ----------

function abrirAjustes(seccion) {
  pintarAjustes();
  $('#ajustes').showModal();
  if (seccion === 'horario') $('#horario-filas').scrollIntoView({ block: 'center' });
}

function guardarHorario() {
  almacen.set('horario', app.horario);
  pintar();
}

function pintarHorario() {
  const cursos = cursosConocidos();
  const filas = app.horario.map((c, i) => {
    const cambiar = (k, v) => { app.horario[i] = { ...app.horario[i], [k]: v }; guardarHorario(); };
    return el('div', { class: 'celda clase-fila' },
      el('select', { 'aria-label': 'Asignatura', onchange: e => cambiar('curso', e.target.value) },
        ...cursos.map(({ id, m }) => { const o = el('option', { value: id }, m.corto); o.selected = id === c.curso; return o; })),
      el('select', { 'aria-label': 'Día', onchange: e => cambiar('dia', Number(e.target.value)) },
        ...DIAS.slice(1).map((d, j) => { const o = el('option', { value: String(j + 1) }, d.slice(0, 3)); o.selected = j + 1 === Number(c.dia); return o; })),
      el('input', { type: 'time', value: c.inicio || '16:00', 'aria-label': 'Empieza', onchange: e => cambiar('inicio', e.target.value) }),
      el('span', { class: 'guion' }, '–'),
      el('input', { type: 'time', value: c.fin || '18:00', 'aria-label': 'Termina', onchange: e => cambiar('fin', e.target.value) }),
      el('button', { class: 'quitar', 'aria-label': 'Quitar clase', title: 'Quitar', onclick: () => { app.horario.splice(i, 1); guardarHorario(); pintarHorario(); } }, '×'));
  });
  $('#horario-filas').replaceChildren(...filas,
    el('button', { class: 'celda accion', onclick: () => {
      const ultima = app.horario.at(-1);
      app.horario.push({ curso: ultima?.curso || cursos[0]?.id || '761', dia: ultima ? Math.min(5, Number(ultima.dia) + 1) : 1, inicio: ultima?.inicio || '16:00', fin: ultima?.fin || '18:00' });
      guardarHorario(); pintarHorario();
    } }, 'Añadir clase'));
}

// ---------- vista semana ----------

const lunesDe = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const mismoDia = (a, b) => a.toDateString() === b.toDateString();
const hora = d => d.toTimeString().slice(0, 5);

function descargarIcs() {
  const ics = generarIcs(app.datos?.tareas || [], app.marcas, new Date(), urlEntrega);
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  el('a', { href: url, download: 'entregas-daw.ics' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  aviso('Calendario descargado: ábrelo o impórtalo en Google Calendar (Configuración > Importar).');
}

function pintarSemana() {
  const ahora = new Date();
  const lunes = lunesDe(ahora); lunes.setDate(lunes.getDate() + app.semanaOffset * 7);
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const fmtDia = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const tareas = (app.datos?.tareas || []).filter(t => t.cierre);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  const ir = n => { app.semanaOffset = n; pintar(); };
  $('#semana').replaceChildren(
    el('div', { class: 'semana-cab' },
      el('div', { class: 'semana-nav' },
        el('button', { class: 'boton-barra', 'aria-label': 'Semana anterior', onclick: () => ir(app.semanaOffset - 1) }, icono('atras')),
        el('button', { class: 'boton-barra', 'aria-label': 'Semana siguiente', onclick: () => ir(app.semanaOffset + 1) }, icono('chevron')),
        el('h2', {}, `${fmtDia(lunes)} – ${fmtDia(domingo)}`),
        app.semanaOffset ? el('button', { class: 'capsula', onclick: () => ir(0) }, 'Hoy') : null),
      el('button', { class: 'capsula', onclick: descargarIcs, title: 'Descarga las entregas pendientes en un archivo .ics' }, 'Exportar al calendario')),
    el('div', { class: 'semana-grid' }, ...dias.map(d => {
      const clases = clasesDelDia(app.horario, d);
      const delDia = tareas.filter(t => mismoDia(new Date(t.cierre), d)).sort(porCierre);
      const carga = delDia.filter(t => estado(t, app.marcas, ahora) === 'pendiente').reduce((n, t) => n + minutosDe(t, app.esfuerzos), 0);
      return el('section', { class: `dia${mismoDia(d, ahora) ? ' hoy' : ''}${d < lunesDe(ahora) || (d < ahora && !mismoDia(d, ahora)) ? ' pasado' : ''}` },
        el('h3', {}, el('span', {}, d.toLocaleDateString('es-ES', { weekday: 'short' })), el('b', {}, String(d.getDate()))),
        el('div', { class: 'eventos' },
          ...clases.map(c => {
            const m = cursoDe(c.curso), aula = aulaDe(c.curso);
            return el('div', { class: 'ev clase', style: `--c:${m.color}` },
              el('small', {}, `${hora(c.inicio)}–${hora(c.fin)}`), el('span', {}, m.corto),
              aula ? el('button', { class: 'enlace', onclick: () => abrirExterno(aula) }, 'Unirse') : null);
          }),
          ...delDia.map(t => {
            const m = modDe(t), e = estado(t, app.marcas, ahora);
            return el('button', { class: `ev tarea ${e}${esExamen(t) ? ' examen' : ''}`, style: `--c:${m.color}`,
              title: `${t.nombre} (${m.corto})`, onclick: () => (e === 'pendiente' ? abrirFoco(t) : abrirExterno(urlCampus(t))) },
              el('small', {}, `${esExamen(t) ? 'Examen · ' : ''}${hora(new Date(t.cierre))}`), el('span', {}, t.nombre));
          }),
          !clases.length && !delDia.length ? el('p', { class: 'dia-libre' }, 'Libre') : null),
        carga ? el('p', { class: 'dia-carga' }, icono('reloj'), duracion(carga)) : null);
    })));
}

// ---------- empezar con Claude ----------

async function empezarConClaude(t) {
  const ruta = rutaDe(t).replace(/\.md$/, '');
  const abs = `${app.ruta.replace(/\\/g, '/').replace(/\/$/, '')}/${ruta}`;
  try { await navigator.clipboard.writeText(promptClaude(t, abs)); }
  catch { aviso('No se pudo copiar la instrucción al portapapeles.', 'error'); return; }
  await abrirCarpeta(t);
  aviso('Instrucción para Claude copiada. En VS Code, abre Claude Code y pégala (Ctrl+V).');
}

// ---------- antes de entregar ----------

function checklist(t) {
  const reqs = requisitos(t.enunciado);
  if (!reqs.length) return null;
  const hechos = new Set(app.checklist[t.id] || []);
  return el('div', { class: 'checklist' },
    el('p', { class: 'checklist-titulo' }, `Antes de entregar (${hechos.size}/${reqs.length})`),
    ...reqs.map((r, i) => {
      const caja = el('input', { type: 'checkbox', onchange: e => {
        const s = new Set(app.checklist[t.id] || []);
        if (e.target.checked) s.add(i); else s.delete(i);
        app.checklist = { ...app.checklist, [t.id]: [...s] };
        almacen.set('checklist', app.checklist);
        e.target.closest('.checklist').querySelector('.checklist-titulo').textContent = `Antes de entregar (${s.size}/${reqs.length})`;
      } });
      caja.checked = hechos.has(i);
      return el('label', {}, caja, el('span', {}, r));
    }));
}

// ---------- resumen de la semana ----------

const claveSemana = d => lunesDe(d).toLocaleDateString('sv');

function abrirResumenSemana() {
  const ahora = new Date();
  const r = resumenSemana({ tareas: app.datos?.tareas || [], marcas: app.marcas, foco: app.foco, esfuerzos: app.esfuerzos, ahora });
  const ra = anillos({ marcas: app.marcas, foco: app.foco, ahora }).racha;
  const dato = (n, etiqueta) => el('div', { class: 'dato' }, el('b', {}, n), el('span', {}, etiqueta));
  $('#resumen-cuerpo').replaceChildren(
    el('div', { class: 'datos' },
      dato(String(r.hechas), r.hechas === 1 ? 'tarea hecha' : 'tareas hechas'),
      dato(duracion(r.minutosFoco || 0), 'de foco'),
      dato(String(ra), ra === 1 ? 'día de racha' : 'días de racha')),
    el('p', { class: 'seccion-titulo' }, `Próximos 7 días: ${r.proximas.length} ${r.proximas.length === 1 ? 'entrega' : 'entregas'}, unas ${duracion(r.cargaProxima)}`),
    r.proximas.length ? el('div', { class: 'celdas' }, ...r.proximas.map(t => {
      const m = modDe(t);
      return el('p', { class: 'celda' }, el('span', {}, t.nombre), el('small', { style: `color:${m.color}` }, `${m.corto}, ${cuentaAtras(t.cierre, ahora)}`));
    })) : el('p', { class: 'seccion-pie' }, 'Nada en los próximos 7 días.'));
  almacen.set('resumenVisto', claveSemana(ahora));
  if (!$('#resumen-semana').open) $('#resumen-semana').showModal();
}

// ---------- estudio: resúmenes, búsqueda y tarjetas ----------

async function cargarResumenes() {
  if (app.resumenes) return app.resumenes;
  if (!app.carpeta || !await fs.tienePermiso(app.carpeta)) return [];
  app.resumenes = (await Promise.all(Object.entries(MODULOS).map(async ([id, m]) =>
    ({ id, m, texto: await fs.leer(app.carpeta, `${m.carpeta}/Apuntes/RESUMEN.md`) })))).filter(r => r.texto);
  return app.resumenes;
}

async function tarjetasDe(ids) {
  const rs = await cargarResumenes();
  return rs.filter(r => !ids || ids.includes(r.id)).flatMap(r => extraerTarjetas(r.id, r.texto));
}

async function actualizarConteoRepaso() {
  const t = await tarjetasDe();
  const n = t.length ? pendientesDeRepaso(t, app.repaso, new Date()) : null;
  if (n !== app.repasoPendientes) { app.repasoPendientes = n; if (app.vista === 'tareas') pintar(); }
}

const repaso = { cola: [], i: 0, visto: false, aciertos: 0 };

async function abrirRepaso(modulo) {
  const todas = await tarjetasDe(modulo ? [modulo] : null);
  if (!todas.length) { aviso(app.carpeta ? 'No hay tarjetas: los resúmenes aún no tienen tablas ni términos en negrita.' : 'Elige la carpeta DAW en Ajustes para repasar tus resúmenes.'); return; }
  repaso.cola = sesionDeRepaso(todas, app.repaso, new Date(), 10);
  repaso.i = 0; repaso.aciertos = 0; repaso.visto = false;
  repaso.modulo = modulo;
  $('#repaso').hidden = false;
  document.body.classList.add('con-foco');
  pintarTarjeta();
}

function cerrarRepaso() {
  $('#repaso').hidden = true;
  document.body.classList.remove('con-foco');
  actualizarConteoRepaso();
  pintar();
}

function pintarTarjeta() {
  const caja = $('#repaso-contenido');
  if (repaso.i >= repaso.cola.length) {
    caja.replaceChildren(
      el('p', { class: 'foco-meta' }, 'Repaso terminado'),
      el('h2', {}, repaso.cola.length ? `${repaso.aciertos} de ${repaso.cola.length} bien` : 'No hay tarjetas para hoy'),
      el('p', { class: 'repaso-fin' }, repaso.cola.length ? 'Las que fallaste volverán mañana; las que sabías, dentro de unos días.' : 'Vuelve mañana.'),
      el('div', { class: 'foco-pie' }, el('span'), el('button', { class: 'capsula principal', onclick: cerrarRepaso }, 'Cerrar')));
    return;
  }
  const t = repaso.cola[repaso.i], m = MODULOS[t.modulo] || cursoDe(t.modulo);
  const nivel = app.repaso[t.id]?.caja;
  caja.replaceChildren(
    el('p', { class: 'foco-meta' }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
      el('span', {}, `${repaso.i + 1} de ${repaso.cola.length}`), el('span', {}, nivel ? `nivel ${nivel}` : 'nueva')),
    t.tema ? el('p', { class: 'tarjeta-tema' }, t.tema) : null,
    el('h2', { class: 'tarjeta-anverso' }, ...pintarInline(inline(t.anverso))),
    repaso.visto
      ? el('div', { class: 'tarjeta-reverso' }, ...t.reverso.map(r => el('p', {}, r.etiqueta ? el('b', {}, `${r.etiqueta}: `) : null, ...pintarInline(inline(r.valor)))))
      : el('button', { class: 'capsula mostrar', onclick: () => { repaso.visto = true; pintarTarjeta(); } }, 'Mostrar respuesta'),
    el('div', { class: 'foco-pie' },
      el('button', { class: 'texto', onclick: cerrarRepaso }, 'Salir'),
      repaso.visto ? el('div', { class: 'respuestas' },
        el('button', { class: 'capsula fallo', onclick: () => contestar(false) }, 'No lo sabía'),
        el('button', { class: 'capsula hecha', onclick: () => contestar(true) }, 'Lo sabía')) : el('span', { class: 'pista-teclas' }, 'Espacio para ver la respuesta')));
  caja.querySelector('.mostrar, .hecha')?.focus();
}

function contestar(acierto) {
  const t = repaso.cola[repaso.i];
  app.repaso = responder(app.repaso, t.id, acierto, new Date());
  almacen.set('repaso', app.repaso);
  const hoy = hoyISO();
  app.repasoDia = { ...app.repasoDia, [hoy]: (app.repasoDia[hoy] || 0) + 1 };
  almacen.set('repasoDia', app.repasoDia);
  if (acierto) repaso.aciertos++;
  repaso.i++; repaso.visto = false;
  pintarTarjeta();
}

// Resultados de búsqueda dentro de todos los resúmenes (vista Apuntes con texto en el buscador).
async function resultadosResumenes(consulta) {
  const rs = await cargarResumenes();
  const hits = buscarEnResumenes(rs.map(r => ({ modulo: r.id, texto: r.texto })), consulta, 20);
  if (!hits.length) return null;
  return el('section', { class: 'resultados' },
    el('h2', {}, 'En los resúmenes', el('span', { class: 'n' }, String(hits.length))),
    el('div', { class: 'celdas' }, ...hits.map(h => {
      const m = MODULOS[h.modulo];
      return el('button', { class: 'resultado', onclick: async () => {
        app.modulo = h.modulo; almacen.set('modulo', h.modulo);
        await pintarApuntes();
        const titulo = [...document.querySelectorAll('.resumen h1, .resumen h2, .resumen h3')].find(x => x.textContent.trim() === h.tema);
        if (titulo) { titulo.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' }); titulo.classList.add('resaltado'); }
      } },
        el('span', { class: 'resultado-cab' }, el('span', { class: 'punto', style: `--c:${m.color}` }), m.corto, h.tema ? el('small', {}, h.tema) : null),
        el('span', { class: 'resultado-texto' }, ...pintarInline(inline(h.fragmento))));
    })));
}

// La lectura en segundo plano falló por sesión caducada: avisar con enlace al campus.
function avisarSesion(e) {
  if (!e || e.ok || e.codigo !== 'SIN_SESION' || app.ocupado) return;
  aviso('La sesión del campus ha caducado y no se puede actualizar en segundo plano. Inicia sesión y pulsa Actualizar.', 'error',
    { url: `${CAMPUS}/login/index.php`, texto: 'Abrir el campus' });
}

async function iniciar() {
  app.datos = (await almacen.get('datos')) || null;
  app.marcas = (await almacen.get('marcas')) || {};
  app.ruta = (await almacen.get('ruta')) || RUTA_POR_DEFECTO;
  app.carpeta = (await fs.carpetaGuardada()) || null;
  app.vista = (await almacen.get('vista')) || 'inicio';
  if (!Object.values(MODOS).some(m => app.vista in m.vistas)) app.vista = 'inicio';
  vistasModo = (await almacen.get('vistasModo')) || {};
  app.modulo = (await almacen.get('modulo')) || app.modulo;
  app.disposicion = (await almacen.get('disposicion')) || 'lista';
  app.esfuerzos = (await almacen.get('esfuerzos')) || {};
  app.minutosHoy = (await almacen.get('minutosHoy')) || 180;
  app.novedades = (await almacen.get('novedades')) || [];
  app.novedadesVistas = (await almacen.get('novedadesVistas')) || '';
  for (const k of ['horario', 'foco', 'repaso', 'repasoDia', 'checklist']) app[k] = (await almacen.get(k)) || app[k];
  if (app.carpeta && await fs.tienePermiso(app.carpeta)) await cargarDeCarpeta();
  pintar();

  $('#boton-modo').addEventListener('click', () => $('#menu-modos').hidden ? abrirMenuModos() : cerrarMenuModos());
  document.addEventListener('click', e => { if (!e.target.closest('.selector-modo')) cerrarMenuModos(); });
  $('#anadir-fondo').addEventListener('click', anadirFondos);
  $('#quitar-fondos').addEventListener('click', () => { if (confirm('¿Quitar todas las fotos de fondo?')) quitarFondos(); });
  pintarFondo();
  // En Inicio la barra es transparente sobre la foto; al bajar se vuelve sólida.
  addEventListener('scroll', () => $('.barra').classList.toggle('con-scroll', scrollY > 40), { passive: true });
  $('#actualizar').addEventListener('click', actualizar);
  $('#cambiar-disposicion').addEventListener('click', alternarDisposicion);
  $('#buscar').addEventListener('input', e => {
    app.filtro = e.target.value;
    pintar();
  });
  $('#abrir-ajustes').addEventListener('click', () => { pintarAjustes(); $('#ajustes').showModal(); });
  $('#ruta').addEventListener('change', e => { app.ruta = e.target.value.trim() || RUTA_POR_DEFECTO; almacen.set('ruta', app.ruta); });
  $('#exportar-copia').addEventListener('click', exportarCopia);
  $('#importar-copia').addEventListener('click', () => $('#importar-archivo').click());
  $('#importar-archivo').addEventListener('change', importarCopia);
  $('#elegir-carpeta').addEventListener('click', async () => {
    try { app.carpeta = await fs.elegirCarpeta(); await cargarDeCarpeta(); pintarAjustes(); pintar(); }
    catch (e) { if (e.name !== 'AbortError') aviso(e.message, 'error'); }
  });
  document.addEventListener('keydown', alPulsarTecla);
  $('#abrir-paleta').addEventListener('click', abrirPaleta);
  $('#paleta-buscar').addEventListener('input', () => { paleta.sel = 0; pintarPaleta(); });
  $('#paleta-buscar').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); paleta.sel = Math.min(paleta.items.length - 1, paleta.sel + 1); pintarPaleta(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paleta.sel = Math.max(0, paleta.sel - 1); pintarPaleta(); }
    else if (e.key === 'Enter') { e.preventDefault(); ejecutarPaleta(paleta.sel, e); }
  });
  for (const d of ['#paleta', '#atajos']) $(d).addEventListener('click', e => { if (e.target === $(d)) $(d).close(); }); // clic fuera
  addEventListener('beforeunload', () => { if (foco.t) guardarMinutosFoco(); });

  // El service worker actualiza en segundo plano: el panel se refresca solo.
  chrome.storage.onChanged.addListener((c, zona) => {
    if (zona !== 'local') return;
    let cambio = false;
    if (c.datos?.newValue && !app.ocupado && c.datos.newValue.fecha !== app.datos?.fecha) {
      app.datos = { ...c.datos.newValue, rutas: { ...(c.datos.newValue.rutas || {}), ...(app.datos?.rutas || {}) } };
      cambio = true;
    }
    if (c.novedades) { app.novedades = c.novedades.newValue || []; cambio = true; }
    if (c.foco) { app.foco = c.foco.newValue || {}; cambio = true; }
    if (c.estadoFondo?.newValue) avisarSesion(c.estadoFondo.newValue);
    if (c.baos) baosCambiado(c.baos.newValue);
    if (c.inicio) inicioCambiado(c.inicio.newValue);
    if (c.marcas?.newValue && JSON.stringify(c.marcas.newValue) !== JSON.stringify(app.marcas)) { app.marcas = c.marcas.newValue; cambio = true; }
    if (cambio) pintar();
  });
  setInterval(() => app.datos && ($('#actualizado').textContent = hace(app.datos.fecha).replace(/^a/, 'A')), 60000);
  if (app.carpeta) avisarSesion(await almacen.get('estadoFondo'));
  for (const d of ['#resumen-semana']) $(d).addEventListener('click', e => { if (e.target === $(d)) $(d).close(); });
  // El domingo y el lunes, el resumen de la semana se abre solo una vez.
  const dia = new Date().getDay();
  if (app.datos && (dia === 0 || dia === 1) && (await almacen.get('resumenVisto')) !== claveSemana(new Date())) abrirResumenSemana();
  actualizarConteoRepaso();
}

iniciar();
