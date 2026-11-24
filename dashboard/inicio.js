// Modo Inicio (Riga Dashboard): tu foto de fondo, la hora, lo pendiente de todo y widgets para un rato tranquilo.
import { el, almacen, icono, ICONOS } from './dom.js';
import { agrupar, modDe, cuentaAtras } from './logica.js';
import { FRENTES, baosParaInicio, estadoFecha, saludo, alternarHabito, racha, ultimosDias, podarHabitos,
  HABITOS_INICIALES, ACCESOS_INICIALES, normalizarUrl, ideaDelDia, tiempoDe, dominioDe, nuevoId, diaIso, fotoDelDia } from './espacios.js';
import { cargarBaos, editarTarea } from './baos.js';

// Madrid centro. Open-Meteo es gratis, sin cuenta y sin clave.
const URL_TIEMPO = 'https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038'
  + '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  + '&timezone=Europe%2FMadrid&forecast_days=1';
const HN = 'https://hacker-news.firebaseio.com/v0';
const MEDIA_HORA = 30 * 60000;
const MAX_FOTOS = 8;

// Iconos de línea para el tiempo (nada de emojis).
const CIELO = {
  sol: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  luna: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  nubes: 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z',
  claros: 'M8 3v1.5M3.6 4.6l1 1M2 9h1.5M12.5 6.3A4 4 0 0 0 5 9M9 20h8a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8 13.5 3.25 3.25 0 0 0 9 20z',
  lluvia: 'M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7 3.5 3.5 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  nieve: 'M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7 3.5 3.5 0 0 0 7 14zM8 18h.01M12 20h.01M16 18h.01',
  tormenta: 'M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7 3.5 3.5 0 0 0 7 14zM12 15l-2 4h4l-2 4',
  niebla: 'M4 9h16M2 13h20M5 17h14',
};
const iconoCielo = (codigo, esDia) => {
  const t = tiempoDe(codigo, esDia).texto;
  return { 'Despejado': esDia ? CIELO.sol : CIELO.luna, 'Algo nuboso': CIELO.claros, 'Nublado': CIELO.nubes, 'Niebla': CIELO.niebla,
    'Llovizna': CIELO.lluvia, 'Lluvia': CIELO.lluvia, 'Nieve': CIELO.nieve, 'Tormenta': CIELO.tormenta }[t] || CIELO.nubes;
};

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
  cont.replaceChildren(
    widgetHola(),
    el('div', { class: 'rejilla' },
      widgetPendientes(ctx, baos),
      widgetHabitos(),
      widgetIdea(),
      widgetNovedades(),
      widgetNotas(),
      widgetAccesos()));
  arrancarReloj();
  pintarTiempo();
  pintarNoticias();
}

export function pararInicio() { clearInterval(est.reloj); est.reloj = null; }

// ---------- foto de fondo ----------
export async function pintarFondo() {
  const capa = document.getElementById('fondo-foto');
  const foto = fotoDelDia((await almacen.get('fondos')) || []);
  capa.classList.toggle('sin-foto', !foto);
  document.documentElement.classList.toggle('sin-foto', !foto);
  if (foto) capa.style.setProperty('--foto', `url("${foto}")`); else capa.style.removeProperty('--foto');
}

// Reduce la foto (máx. 2400 px, JPEG) para que quepa holgada en el almacenamiento de la extensión.
async function comprimir(archivo) {
  const img = await createImageBitmap(archivo);
  const escala = Math.min(1, 2400 / Math.max(img.width, img.height));
  const c = new OffscreenCanvas(Math.round(img.width * escala), Math.round(img.height * escala));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.84 });
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(blob); });
}

export function anadirFondos() {
  const input = el('input', { type: 'file', accept: 'image/*', multiple: true });
  input.addEventListener('change', async () => {
    const nuevas = await Promise.all([...input.files].map(comprimir));
    const fotos = [...nuevas, ...((await almacen.get('fondos')) || [])].slice(0, MAX_FOTOS);
    await almacen.set('fondos', fotos);
    pintarFondo();
  });
  input.click();
}

export async function quitarFondos() { await almacen.set('fondos', []); pintarFondo(); }

// ---------- reloj, saludo y tiempo ----------
function widgetHola() {
  return el('section', { class: 'hero', 'aria-label': 'Hoy' },
    el('p', { class: 'hero-hora', id: 'hola-hora' }),
    el('p', { class: 'hero-linea' }, el('span', { id: 'hola-saludo' }), el('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), el('span', { id: 'hola-fecha' })),
    el('div', { class: 'hero-clima', id: 'tiempo', 'aria-live': 'polite' }),
    el('button', { class: 'hero-fondo', title: 'Añadir tu foto de fondo', onclick: anadirFondos },
      icono('M4 7h3l2-2h6l2 2h3v12H4zM12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6'), 'Fondo'));
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
    const lluvia = d.precipitation_probability_max?.[0];
    caja.replaceChildren(
      icono(iconoCielo(c.weather_code, c.is_day)),
      el('b', {}, `${Math.round(c.temperature_2m)}°`),
      el('span', {}, `${tiempoDe(c.weather_code, c.is_day).texto} en Madrid`),
      el('span', { class: 'tenue' }, `${Math.round(d.temperature_2m_min[0])}° / ${Math.round(d.temperature_2m_max[0])}°`),
      lluvia >= 30 ? el('span', { class: 'tenue' }, `Lluvia ${lluvia} %`) : null);
  } catch {
    caja.replaceChildren(el('span', { class: 'tenue' }, 'Sin datos del tiempo'));
  }
}

// ---------- pendientes (a todo el ancho, en tres columnas) ----------
const cabecera = (titulo, ...extra) => el('header', { class: 'w-cab' }, el('h2', {}, titulo), ...extra);

function widgetPendientes(ctx, baos) {
  const ahora = new Date();
  let grado = [];
  if (ctx.datos) {
    const g = agrupar(ctx.datos.tareas, ctx.marcas, ahora);
    grado = [...g.hoy, ...g.manana, ...g.semana].slice(0, 5);
  }
  const deBaos = baosParaInicio(baos, ahora, 5);
  const mias = est.datos.pendientes;

  const columna = (titulo, vista, items, vacio, pie = null) => el('div', { class: 'pend-col' },
    el('h3', {}, vista ? el('button', { onclick: () => ctx.irA(vista), title: `Abrir ${titulo}` }, titulo, icono(ICONOS.der)) : titulo,
      el('span', { class: 'pend-n' }, String(items.length))),
    items.length ? el('ul', {}, ...items) : el('p', { class: 'pend-vacio' }, vacio),
    pie);

  return el('section', { class: 'w w-pendientes' },
    cabecera('Pendiente'),
    el('div', { class: 'pend-cols' },
      columna('Dr. Baos', 'baos', deBaos.map(t => {
        const fecha = estadoFecha(t.fecha, ahora);
        return el('li', { class: 'pend' },
          el('button', { class: 'pend-texto', onclick: () => editarTarea(t) }, t.titulo),
          el('span', { class: 'pend-meta' },
            t.urgente ? el('span', { class: 'marca-urgente' }, 'Urgente') : null,
            el('span', { class: fecha?.clase || '' }, fecha?.texto || (t.col === 'marcha' ? 'En marcha' : (FRENTES[t.frente] || FRENTES.otros).nombre))));
      }), 'Nada urgente'),
      columna('Grado', 'tareas', grado.map(t => {
        const m = modDe(t);
        return el('li', { class: 'pend' },
          el('button', { class: 'pend-texto', onclick: () => ctx.irA('tareas') }, el('span', { class: 'pend-mod' }, m.corto), t.nombre),
          el('span', { class: 'pend-meta' }, cuentaAtras(t.cierre, ahora)));
      }), ctx.datos ? 'Semana libre de entregas' : 'Abre el modo Grado y pulsa Actualizar'),
      columna('Mis cosas', null, mias.map(p => el('li', { class: `pend mia${p.hecho ? ' hecho' : ''}` },
        el('label', {}, el('input', { type: 'checkbox', checked: p.hecho,
          onchange: () => cambiar(d => { d.pendientes = d.pendientes.map(x => x.id === p.id ? { ...x, hecho: !x.hecho } : x); }) }),
          el('span', {}, p.texto)),
        el('button', { class: 'quitar', title: 'Quitar', 'aria-label': `Quitar ${p.texto}`,
          onclick: () => cambiar(d => { d.pendientes = d.pendientes.filter(x => x.id !== p.id); }) }, '×'))), 'Nada apuntado',
        el('input', { class: 'campo-linea', type: 'text', placeholder: 'Apuntar algo y pulsar Enter', 'aria-label': 'Apuntar algo pendiente',
          onkeydown: e => {
            if (e.key !== 'Enter' || !e.target.value.trim()) return;
            const texto = e.target.value.trim();
            cambiar(d => { d.pendientes = [...d.pendientes.filter(x => !x.hecho || x.dia === diaIso()), { id: nuevoId(), texto, hecho: false, dia: diaIso() }]; });
            document.querySelector('#inicio .pend-col .campo-linea')?.focus();
          } }))));
}

// ---------- hábitos ----------
function widgetHabitos() {
  const h = est.datos.habitos, hoy = diaIso();
  const hechosHoy = new Set(h.hechos[hoy] || []);
  const n = h.lista.filter(x => hechosHoy.has(x.id)).length;
  return el('section', { class: 'w w-habitos' },
    cabecera('Hábitos', el('span', { class: 'w-dato' }, `${n} de ${h.lista.length}`),
      el('button', { class: 'w-accion', onclick: () => { est.editandoHabitos = !est.editandoHabitos; repintar(); } }, est.editandoHabitos ? 'Listo' : 'Editar')),
    el('ul', { class: 'habitos' }, ...h.lista.map(x => {
      const r = racha(h, x.id, hoy), hecho = hechosHoy.has(x.id);
      return el('li', { class: `habito${hecho ? ' hecho' : ''}` },
        el('button', { class: 'habito-check', role: 'checkbox', 'aria-checked': String(hecho), title: 'Hecho hoy',
          onclick: () => cambiar(d => { d.habitos = alternarHabito(d.habitos, x.id, hoy); }) },
          el('span', { class: 'circulo', 'aria-hidden': 'true' }, icono(ICONOS.check)), el('span', {}, x.nombre)),
        el('span', { class: 'puntos', title: 'Últimos 7 días' }, ...ultimosDias(h, x.id, 7, hoy).map(d => el('i', { class: d.hecho ? 'si' : '' }))),
        el('span', { class: 'habito-racha', title: 'Días seguidos' }, r ? `${r} d` : ''),
        est.editandoHabitos ? el('button', { class: 'quitar', 'aria-label': `Quitar ${x.nombre}`,
          onclick: () => cambiar(d => { d.habitos = { ...d.habitos, lista: d.habitos.lista.filter(y => y.id !== x.id) }; }) }, '×') : null);
    })),
    est.editandoHabitos ? el('input', { class: 'campo-linea', type: 'text', placeholder: 'Nuevo hábito y Enter',
      onkeydown: e => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        const nombre = e.target.value.trim();
        cambiar(d => { d.habitos = { ...d.habitos, lista: [...d.habitos.lista, { id: nuevoId(), nombre }] }; });
      } }) : null);
}

// ---------- idea del día ----------
function widgetIdea() {
  const idea = ideaDelDia(new Date(), est.ideaDesp);
  return el('section', { class: 'w w-idea' },
    cabecera('Idea del día', el('span', { class: 'w-dato' }, idea.tema),
      el('button', { class: 'w-accion', onclick: () => { est.ideaDesp++; repintar(); } }, 'Otra')),
    el('blockquote', { class: 'idea-texto' }, idea.texto));
}

// ---------- notas ----------
let temporizadorNotas;
function widgetNotas() {
  return el('section', { class: 'w w-notas' },
    cabecera('Notas', el('span', { class: 'w-dato', id: 'notas-estado' })),
    el('textarea', { placeholder: 'Lo que se te pase por la cabeza…', 'aria-label': 'Notas rápidas', spellcheck: 'true',
      oninput: e => {
        clearTimeout(temporizadorNotas);
        const v = e.target.value;
        temporizadorNotas = setTimeout(() => { est.datos.notas = v; guardar(); const s = document.getElementById('notas-estado'); if (s) s.textContent = 'Guardado'; }, 500);
      } }, est.datos.notas));
}

// ---------- novedades ----------
function widgetNovedades() {
  return el('section', { class: 'w w-novedades' },
    cabecera('Novedades tech', el('span', { class: 'w-dato' }, 'Hacker News')),
    el('ol', { class: 'noticias', id: 'noticias' }, el('li', { class: 'pend-vacio' }, 'Cargando…')));
}

async function pintarNoticias() {
  const lista = document.getElementById('noticias');
  try {
    const items = await conCache('cacheNoticias', 2 * MEDIA_HORA, async () => {
      const ids = await (await fetch(`${HN}/topstories.json`)).json();
      const it = await Promise.all(ids.slice(0, 5).map(id => fetch(`${HN}/item/${id}.json`).then(r => r.json())));
      return it.filter(Boolean).map(x => ({ titulo: x.title, url: x.url || `https://news.ycombinator.com/item?id=${x.id}`, puntos: x.score }));
    });
    lista.replaceChildren(...items.slice(0, 5).map(n => el('li', {},
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
  return el('section', { class: 'w w-accesos' },
    cabecera('Accesos', el('button', { class: 'w-accion', onclick: () => { est.editandoAccesos = !editando; repintar(); } }, editando ? 'Listo' : 'Editar')),
    el('ul', { class: 'accesos' }, ...est.datos.accesos.map(a => el('li', {},
      el('a', { href: a.url, class: 'acceso', title: a.url, onclick: e => { if (editando) e.preventDefault(); } },
        el('img', { src: favicon(a.url), alt: '', width: '20', height: '20' }),
        el('span', {}, a.nombre)),
      editando ? el('button', { class: 'quitar', 'aria-label': `Quitar ${a.nombre}`,
        onclick: () => cambiar(d => { d.accesos = d.accesos.filter(x => x.id !== a.id); }) }, '×') : null))),
    editando ? el('form', { class: 'acceso-nuevo', onsubmit: e => {
      e.preventDefault();
      const f = new FormData(e.target), url = normalizarUrl(f.get('url') || '');
      if (!url) { e.target.url.setCustomValidity('Esa dirección no parece válida'); e.target.url.reportValidity(); return; }
      cambiar(d => { d.accesos = [...d.accesos, { id: nuevoId(), nombre: (f.get('nombre') || '').trim() || dominioDe(url), url }]; });
    } },
      el('input', { class: 'campo-linea', name: 'nombre', placeholder: 'Nombre', 'aria-label': 'Nombre' }),
      el('input', { class: 'campo-linea', name: 'url', placeholder: 'web.com', 'aria-label': 'Dirección', required: true, oninput: e => e.target.setCustomValidity('') }),
      el('button', { class: 'boton-sobrio', type: 'submit' }, 'Añadir')) : null);
}
