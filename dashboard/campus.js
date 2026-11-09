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
  return c.textContent.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
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
    { offset: 0, limit: 0, classification: 'inprogress', sort: 'fullname' }); // sin módulos de cursos pasados
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
        try { curso.aula = (await pagina(m.url)).querySelector('.urlworkaround a')?.getAttribute('href') || null; }
        catch (e) { if (e.codigo === 'SIN_SESION') throw e; }
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
