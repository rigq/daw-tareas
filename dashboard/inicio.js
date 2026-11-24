// Pestaña Inicio (Riga Dashboard): lo pendiente de todo de un vistazo y widgets para un rato tranquilo.
import { el, almacen, icono, ICONOS } from './dom.js';
import { agrupar, modDe, cuentaAtras } from './logica.js';
import { FRENTES, baosParaInicio, estadoFecha, saludo, alternarHabito, racha, ultimosDias, podarHabitos,
  HABITOS_INICIALES, ACCESOS_INICIALES, normalizarUrl, ideaDelDia, tiempoDe, dominioDe, nuevoId, diaIso } from './espacios.js';
import { cargarBaos, editarTarea } from './baos.js';

// Madrid centro. Open-Meteo es gratis, sin cuenta y sin clave.
const URL_TIEMPO = 'https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038'
  + '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  + '&timezone=Europe%2FMadrid&forecast_days=1';
const HN = 'https://hacker-news.firebaseio.com/v0';
const MEDIA_HORA = 30 * 60000;

const est = { datos: null, cont: null, ctx: null, reloj: null, editandoAccesos: false, editandoHabitos: false, ideaDesp: 0 };

async function cargar() {
  if (!est.datos) {
    const d = (await almacen.get('inicio')) || {};
    est.datos = {
      pendientes: d.pendientes || [],
      notas: d.notas || '',
      habitos: podarHabitos(d.habitos || { lista: HABITOS_INICIALES, hechos: {} }),
      accesos: d.accesos || ACCESOS_INICIALES,
    };
  }
  return est.datos;
}

const guardar = () => almacen.set('inicio', est.datos);
function cambiar(fn) { fn(est.datos); guardar(); repintar(); }
function repintar() { if (est.cont && !est.cont.hidden) pintarInicio(est.cont, est.ctx); }
export function inicioCambiado(valor) {
  if (!valor || JSON.stringify(valor) === JSON.stringify(est.datos)) return;
  est.datos = valor;
  if (document.activeElement?.closest?.('#inicio textarea, #inicio input')) return; // no pisar lo que se está escribiendo
  repintar();
}

// ctx: { datos, marcas, irA(vista) }
export async function pintarInicio(cont, ctx) {
  est.cont = cont; est.ctx = ctx;
  await cargar();
  const baos = await cargarBaos();
  cont.replaceChildren(el('div', { class: 'bento' },
    widgetHola(),
    widgetPendientes(ctx, baos),
    widgetHabitos(),
    widgetIdea(),
    widgetNotas(),
    widgetNovedades(),
    widgetAccesos(),
  ));
  arrancarReloj();
  pintarTiempo();
  pintarNoticias();
}

export function pararInicio() { clearInterval(est.reloj); est.reloj = null; }

// ---------- reloj, saludo y tiempo ----------
function widgetHola() {
  return el('section', { class: 'widget w-hola vidrio' },
    el('div', {},
      el('p', { class: 'hola-saludo', id: 'hola-saludo' }),
      el('p', { class: 'hola-hora', id: 'hola-hora' }),
      el('p', { class: 'hola-fecha', id: 'hola-fecha' })),
    el('div', { class: 'clima', id: 'tiempo', 'aria-live': 'polite' }, el('p', { class: 'clima-cargando' }, 'Mirando el cielo…')));
}

function tic() {
  const ahora = new Date();
  const h = document.getElementById('hola-hora');
  if (!h) return pararInicio();
  h.textContent = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('hola-saludo').textContent = saludo(ahora);
  const f = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('hola-fecha').textContent = f[0].toUpperCase() + f.slice(1);
}

function arrancarReloj() {
  pararInicio();
  tic();
  est.reloj = setInterval(tic, 10000);
}

async function conCache(clave, ms, cargarFn) {
  const c = await almacen.get(clave);
  if (c && Date.now() - c.fecha < ms) return c.valor;
  try {
    const valor = await cargarFn();
    await almacen.set(clave, { fecha: Date.now(), valor });
    return valor;
  } catch (e) {
    if (c) return c.valor; // sin conexión: lo último que hubo
    throw e;
  }
}

async function pintarTiempo() {
  const caja = document.getElementById('tiempo');
  try {
    const t = await conCache('cacheTiempo', MEDIA_HORA, async () => {
      const r = await fetch(URL_TIEMPO);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
    const c = t.current, d = t.daily;
    const { icono: ic, texto } = tiempoDe(c.weather_code, c.is_day);
    const lluvia = d.precipitation_probability_max?.[0];
    caja.replaceChildren(
      el('p', { class: 'clima-temp' }, el('span', { 'aria-hidden': 'true' }, ic), ` ${Math.round(c.temperature_2m)}°`),
      el('p', { class: 'clima-texto' }, `${texto} en Madrid`),
      el('p', { class: 'clima-rango' }, `${Math.round(d.temperature_2m_min[0])}° / ${Math.round(d.temperature_2m_max[0])}°`,
        lluvia >= 30 ? ` · ☔ ${lluvia} %` : ''));
  } catch {
    caja.replaceChildren(el('p', { class: 'clima-texto' }, 'Sin datos del tiempo'));
  }
}

// ---------- pendientes ----------
function widgetPendientes(ctx, baos) {
  const ahora = new Date();
  // Grado: vencidas sin entregar, hoy, mañana y esta semana.
  let grado = [];
  if (ctx.datos) {
    const g = agrupar(ctx.datos.tareas, ctx.marcas, ahora);
    grado = [...g.hoy, ...g.manana, ...g.semana].slice(0, 4);
  }
  const deBaos = baosParaInicio(baos, ahora, 4);
  const mias = est.datos.pendientes;

  const grupo = (titulo, color, vista, items, vacio) => el('div', { class: 'pend-grupo' },
    el('h3', { style: `--c:${color}` }, vista ? el('button', { onclick: () => ctx.irA(vista), title: `Ir a ${titulo}` }, titulo, icono(ICONOS.der)) : titulo),
    items.length ? el('ul', {}, ...items) : el('p', { class: 'pend-vacio' }, vacio));

  return el('section', { class: 'widget w-pendientes vidrio' },
    el('h2', {}, 'Pendiente'),
    grupo('Dr. Baos', '#007aff', 'baos', deBaos.map(t => {
      const f = FRENTES[t.frente] || FRENTES.otros, fecha = estadoFecha(t.fecha, ahora);
      return el('li', { class: 'pend', style: `--c:${f.color}` },
        el('button', { class: 'pend-texto', onclick: () => editarTarea(t) }, t.urgente ? '🔥 ' : '', t.titulo),
        el('span', { class: `pend-meta ${fecha?.clase || ''}` }, fecha?.texto || (t.col === 'marcha' ? 'en marcha' : f.nombre)));
    }), 'Nada urgente 🙌'),
    grupo('Grado', '#e5352b', 'tareas', grado.map(t => {
      const m = modDe(t);
      return el('li', { class: 'pend', style: `--c:${m.color}` },
        el('button', { class: 'pend-texto', onclick: () => ctx.irA('tareas') }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto), ' ', t.nombre),
        el('span', { class: 'pend-meta' }, cuentaAtras(t.cierre, ahora)));
    }), ctx.datos ? 'Semana libre de entregas' : 'Abre Tareas y pulsa Actualizar'),
    grupo('Mis cosas', '#af52de', null, mias.map(p => el('li', { class: `pend mia${p.hecho ? ' hecho' : ''}` },
      el('label', {}, el('input', { type: 'checkbox', checked: p.hecho,
        onchange: () => cambiar(d => { d.pendientes = d.pendientes.map(x => x.id === p.id ? { ...x, hecho: !x.hecho } : x); }) }),
        el('span', {}, p.texto)),
      el('button', { class: 'quitar', title: 'Quitar', 'aria-label': `Quitar ${p.texto}`,
        onclick: () => cambiar(d => { d.pendientes = d.pendientes.filter(x => x.id !== p.id); }) }, '×'))), 'Nada apuntado'),
    el('input', { class: 'pend-nuevo', type: 'text', placeholder: '+ Apuntar algo (Enter)', 'aria-label': 'Apuntar algo pendiente',
      onkeydown: e => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        const texto = e.target.value.trim();
        cambiar(d => { d.pendientes = [...d.pendientes.filter(x => !x.hecho || x.dia === diaIso()), { id: nuevoId(), texto, hecho: false, dia: diaIso() }]; });
        document.querySelector('#inicio .pend-nuevo')?.focus();
      } }));
}

// ---------- hábitos ----------
function widgetHabitos() {
  const h = est.datos.habitos, hoy = diaIso();
  const hechosHoy = new Set(h.hechos[hoy] || []);
  const n = h.lista.filter(x => hechosHoy.has(x.id)).length;
  return el('section', { class: 'widget w-habitos vidrio' },
    el('div', { class: 'widget-cab' }, el('h2', {}, 'Hábitos'),
      el('span', { class: 'contador' }, `${n}/${h.lista.length}`),
      el('button', { class: 'texto-boton', onclick: () => { est.editandoHabitos = !est.editandoHabitos; repintar(); } }, est.editandoHabitos ? 'Listo' : 'Editar')),
    el('ul', { class: 'habitos' }, ...h.lista.map(x => {
      const r = racha(h, x.id, hoy);
      return el('li', { class: `habito${hechosHoy.has(x.id) ? ' hecho' : ''}` },
        el('button', { class: 'habito-check', 'aria-pressed': String(hechosHoy.has(x.id)), title: 'Hecho hoy',
          onclick: () => cambiar(d => { d.habitos = alternarHabito(d.habitos, x.id, hoy); }) },
          el('span', { class: 'habito-emoji', 'aria-hidden': 'true' }, x.emoji), el('span', {}, x.nombre)),
        el('span', { class: 'puntos', 'aria-label': 'Últimos 7 días' }, ...ultimosDias(h, x.id, 7, hoy).map(d => el('i', { class: d.hecho ? 'si' : '' }))),
        el('span', { class: 'habito-racha', title: 'Días seguidos' }, r ? `🔥${r}` : ''),
        est.editandoHabitos ? el('button', { class: 'quitar', 'aria-label': `Quitar ${x.nombre}`,
          onclick: () => cambiar(d => { d.habitos = { ...d.habitos, lista: d.habitos.lista.filter(y => y.id !== x.id) }; }) }, '×') : null);
    })),
    est.editandoHabitos ? el('input', { class: 'pend-nuevo', type: 'text', placeholder: '+ Nuevo hábito, p. ej. "🧘 Meditar"',
      onkeydown: e => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        const m = e.target.value.trim().match(/^(\p{Extended_Pictographic}️?)\s*(.+)$/u);
        cambiar(d => { d.habitos = { ...d.habitos, lista: [...d.habitos.lista, { id: nuevoId(), emoji: m?.[1] || '✅', nombre: m?.[2] || e.target.value.trim() }] }; });
      } }) : null);
}

// ---------- idea del día ----------
function widgetIdea() {
  const idea = ideaDelDia(new Date(), est.ideaDesp);
  return el('section', { class: 'widget w-idea vidrio' },
    el('div', { class: 'widget-cab' }, el('h2', {}, '💡 Idea del día'), el('span', { class: 'etiqueta' }, idea.tema),
      el('button', { class: 'texto-boton', onclick: () => { est.ideaDesp++; repintar(); } }, 'Otra')),
    el('p', { class: 'idea-texto' }, idea.texto));
}

// ---------- notas ----------
let temporizadorNotas;
function widgetNotas() {
  return el('section', { class: 'widget w-notas vidrio' },
    el('div', { class: 'widget-cab' }, el('h2', {}, 'Notas'), el('span', { class: 'guardado', id: 'notas-estado' })),
    el('textarea', { placeholder: 'Lo que se te pase por la cabeza…', 'aria-label': 'Notas rápidas', spellcheck: 'true',
      oninput: e => {
        clearTimeout(temporizadorNotas);
        const v = e.target.value;
        temporizadorNotas = setTimeout(() => { est.datos.notas = v; guardar(); const s = document.getElementById('notas-estado'); if (s) s.textContent = 'Guardado'; }, 500);
      } }, est.datos.notas));
}

// ---------- novedades ----------
function widgetNovedades() {
  return el('section', { class: 'widget w-novedades vidrio' },
    el('div', { class: 'widget-cab' }, el('h2', {}, 'Novedades tech'), el('span', { class: 'etiqueta' }, 'Hacker News')),
    el('ol', { class: 'noticias', id: 'noticias' }, el('li', { class: 'pend-vacio' }, 'Cargando…')));
}

async function pintarNoticias() {
  const lista = document.getElementById('noticias');
  try {
    const items = await conCache('cacheNoticias', 2 * MEDIA_HORA, async () => {
      const ids = await (await fetch(`${HN}/topstories.json`)).json();
      const it = await Promise.all(ids.slice(0, 6).map(id => fetch(`${HN}/item/${id}.json`).then(r => r.json())));
      return it.filter(Boolean).map(x => ({ titulo: x.title, url: x.url || `https://news.ycombinator.com/item?id=${x.id}`, puntos: x.score }));
    });
    lista.replaceChildren(...items.map(n => el('li', {},
      el('a', { href: n.url, target: '_blank', rel: 'noopener' }, n.titulo),
      el('span', { class: 'noticia-meta' }, `${dominioDe(n.url)} · ${n.puntos} pts`))));
  } catch {
    lista.replaceChildren(el('li', { class: 'pend-vacio' }, 'Sin conexión'));
  }
}

// ---------- accesos directos ----------
const favicon = url => chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`);

function widgetAccesos() {
  const editando = est.editandoAccesos;
  return el('section', { class: 'widget w-accesos vidrio' },
    el('div', { class: 'widget-cab' }, el('h2', {}, 'Accesos'),
      el('button', { class: 'texto-boton', onclick: () => { est.editandoAccesos = !editando; repintar(); } }, editando ? 'Listo' : 'Editar')),
    el('ul', { class: 'accesos' }, ...est.datos.accesos.map(a => el('li', {},
      el('a', { href: a.url, class: 'acceso', title: a.url, onclick: e => { if (editando) e.preventDefault(); } },
        el('img', { src: favicon(a.url), alt: '', width: '32', height: '32' }),
        el('span', {}, a.nombre)),
      editando ? el('button', { class: 'quitar', 'aria-label': `Quitar ${a.nombre}`,
        onclick: () => cambiar(d => { d.accesos = d.accesos.filter(x => x.id !== a.id); }) }, '×') : null))),
    editando ? el('form', { class: 'acceso-nuevo', onsubmit: e => {
      e.preventDefault();
      const f = new FormData(e.target), url = normalizarUrl(f.get('url') || '');
      if (!url) { e.target.url.setCustomValidity('Esa dirección no parece válida'); e.target.url.reportValidity(); return; }
      cambiar(d => { d.accesos = [...d.accesos, { id: nuevoId(), nombre: (f.get('nombre') || '').trim() || dominioDe(url), url }]; });
    } },
      el('input', { name: 'nombre', placeholder: 'Nombre', 'aria-label': 'Nombre' }),
      el('input', { name: 'url', placeholder: 'web.com', 'aria-label': 'Dirección', required: true, oninput: e => e.target.setCustomValidity('') }),
      el('button', { class: 'capsula', type: 'submit' }, 'Añadir')) : null);
}

