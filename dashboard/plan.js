// Lógica pura del día a día: plan de hoy, esfuerzo, novedades del campus, búsqueda y avisos.
// Sin DOM ni chrome.*: la usan la página, la ventanita del icono y el service worker, y se prueba con node --test.
import { modDe, fmt, porCierre, agrupar, estado, esExamen } from './logica.js';

// ---------- esfuerzo ----------
export const ESFUERZOS = { s: 30, m: 90, l: 180 }; // minutos
export const NOMBRE_ESFUERZO = { s: 'Corta', m: 'Media', l: 'Larga' };
export const SIGUIENTE_ESFUERZO = { s: 'm', m: 'l', l: 's' };

// Estimación por defecto: cuestionarios cortos, proyectos largos, el resto media.
export function esfuerzoPorDefecto(t) {
  if (t.mod === 'quiz') return 's';
  if (/proyecto|fase\s+[ivx\d]/i.test(t.nombre || '')) return 'l';
  return 'm';
}
export const esfuerzoDe = (t, esfuerzos = {}) => esfuerzos[t.id] || esfuerzoPorDefecto(t);
export const minutosDe = (t, esfuerzos = {}) => ESFUERZOS[esfuerzoDe(t, esfuerzos)];

export function duracion(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ---------- plan de hoy ----------
// Ordena lo pendiente por cierre y llena el tiempo disponible de hoy. La primera tarea entra siempre.
// Devuelve { hoy: [{ t, min }], extra: [{ t, min }], minutosHoy, cargaSemana }.
export function planDeHoy(g, esfuerzos = {}, disponible = 180) {
  const pendientes = [...g.hoy, ...g.manana, ...g.semana, ...g.despues].sort(porCierre);
  const hoy = [], extra = [];
  let usado = 0;
  for (const t of pendientes) {
    const min = minutosDe(t, esfuerzos);
    if (!hoy.length || usado + min <= disponible) { hoy.push({ t, min }); usado += min; }
    else if (extra.length < 3) extra.push({ t, min });
  }
  const cargaSemana = [...g.hoy, ...g.manana, ...g.semana].reduce((n, t) => n + minutosDe(t, esfuerzos), 0);
  return { hoy, extra, minutosHoy: usado, cargaSemana };
}

// ---------- novedades del campus ----------
const nombreCorto = t => `${t.nombre} (${modDe(t).corto})`;
const dia = f => fmt(f).slice(0, 10);

// Compara dos lecturas del campus. Sin lectura previa no hay novedades (sería todo "nuevo").
export function novedades(prev, next, ahora = new Date()) {
  if (!prev?.tareas || !next?.tareas) return [];
  const fecha = ahora.toISOString();
  const antes = new Map(prev.tareas.map(t => [t.id, t]));
  const out = [];
  for (const t of next.tareas) {
    const a = antes.get(t.id);
    if (!a) {
      out.push({ tipo: 'nueva', id: t.id, fecha, texto: `Tarea nueva: ${nombreCorto(t)}${t.cierre ? `, cierra el ${dia(t.cierre)}` : ''}` });
      continue;
    }
    if ((a.cierre || null) !== (t.cierre || null)) {
      out.push({ tipo: 'fecha', id: t.id, fecha,
        texto: `Cambió la fecha de ${nombreCorto(t)}: ${a.cierre ? dia(a.cierre) : 'sin fecha'} → ${t.cierre ? dia(t.cierre) : 'sin fecha'}` });
    }
    if (t.calif && t.calif !== a.calif && /calificad/i.test(t.calif) && !/sin calificar|no calificad/i.test(t.calif)) {
      out.push({ tipo: 'nota', id: t.id, fecha, texto: `Ya está calificada: ${nombreCorto(t)}` });
    }
  }
  const apuntesAntes = new Set((prev.apuntes || []).map(a => a.id));
  for (const a of next.apuntes || []) {
    if (prev.apuntes && !apuntesAntes.has(a.id)) {
      out.push({ tipo: 'apunte', id: a.id, fecha, texto: `Apunte nuevo en ${modDe({ curso: a.curso, cursoNombre: a.cursoNombre }).corto}: ${a.nombre}` });
    }
  }
  return out;
}

// Añade novedades a la lista guardada sin repetir (mismo tipo, id y texto) y guarda como mucho 60.
export function acumular(lista = [], nuevas = []) {
  const clave = n => `${n.tipo}|${n.id}|${n.texto}`;
  const vistas = new Set(lista.map(clave));
  return [...nuevas.filter(n => !vistas.has(clave(n))), ...lista].slice(0, 60);
}

// Lectura nueva + anterior: las tareas que no se pudieron leer conservan los datos previos.
export function fusionarLectura(prev, nuevos) {
  const previas = new Map((prev?.tareas || []).map(t => [t.id, t]));
  const tareas = nuevos.tareas.map(t => (t.error ? previas.get(t.id) : t)).filter(Boolean);
  return { ...nuevos, tareas, rutas: prev?.rutas || {}, fallos: nuevos.tareas.filter(t => t.error).length };
}

// ---------- búsqueda difusa (paleta Ctrl+K) ----------
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Puntuación > 0 si todas las letras de la consulta aparecen en orden. Premia inicios de palabra y letras seguidas.
export function puntuar(consulta, texto) {
  const q = norm(consulta).replace(/\s+/g, ''), s = norm(texto);
  if (!q) return 1;
  const directo = s.indexOf(norm(consulta).trim());
  if (directo >= 0) return 1000 - directo;
  let pos = -1, puntos = 0, seguidas = 0;
  for (const c of q) {
    const i = s.indexOf(c, pos + 1);
    if (i < 0) return 0;
    seguidas = i === pos + 1 ? seguidas + 1 : 0;
    puntos += 1 + seguidas * 2 + (i === 0 || /[\s\-_.(]/.test(s[i - 1]) ? 3 : 0);
    pos = i;
  }
  return puntos;
}

// ---------- icono de la extensión y avisos ----------
// Texto y color del número del icono: entregas de hoy en rojo; si no hay, las de mañana en naranja.
export function insignia(tareas = [], marcas = {}, ahora = new Date()) {
  const g = agrupar(tareas, marcas, ahora);
  if (g.hoy.length) return { texto: String(g.hoy.length), color: '#e5352b', titulo: `${g.hoy.length} para hoy` };
  if (g.manana.length) return { texto: String(g.manana.length), color: '#ff9500', titulo: `${g.manana.length} para mañana` };
  return { texto: '', color: '#e5352b', titulo: 'Nada para hoy ni mañana' };
}

export const ANTELACIONES = [24 * 60, 120]; // minutos antes del cierre: 24 h y 2 h

// Avisos a programar: [{ nombre, cuando (ms), id, antes }] para tareas pendientes que cierran en los próximos 8 días.
export function avisos(tareas = [], marcas = {}, ahora = new Date()) {
  const out = [];
  for (const t of tareas) {
    if (!t.cierre || estado(t, marcas, ahora) !== 'pendiente') continue;
    const cierre = new Date(t.cierre).getTime();
    if (cierre - ahora.getTime() > 8 * 864e5) continue;
    for (const antes of ANTELACIONES) {
      const cuando = cierre - antes * 6e4;
      if (cuando > ahora.getTime()) out.push({ nombre: `aviso|${t.id}|${antes}`, cuando, id: t.id, antes });
    }
  }
  return out;
}

export const textoAviso = (t, antes) => ({
  titulo: antes >= 1440 ? 'Mañana cierra una entrega' : 'Cierra en 2 horas',
  mensaje: `${t.nombre} (${modDe(t).corto}), a las ${fmt(t.cierre).slice(11)}`,
});

// ---------- horario de clases ----------
// horario: [{ curso, dia (1 = lunes … 7 = domingo), inicio: 'HH:MM', fin: 'HH:MM' }]
const enHora = (base, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(base); d.setHours(h, m, 0, 0); return d; };
const diaSemana = d => ((d.getDay() + 6) % 7) + 1; // lunes = 1

// Clases de un día concreto, ordenadas: [{ curso, inicio: Date, fin: Date }].
export function clasesDelDia(horario = [], fecha = new Date()) {
  return horario.filter(c => Number(c.dia) === diaSemana(fecha) && c.inicio && c.fin)
    .map(c => ({ curso: c.curso, inicio: enHora(fecha, c.inicio), fin: enHora(fecha, c.fin) }))
    .sort((a, b) => a.inicio - b.inicio);
}

// La clase en curso o la siguiente en los próximos 7 días: { curso, inicio, fin, enCurso } o null.
export function proximaClase(horario = [], ahora = new Date()) {
  for (let i = 0; i < 8; i++) {
    const dia = new Date(ahora); dia.setDate(ahora.getDate() + i);
    const c = clasesDelDia(horario, dia).find(x => x.fin > ahora);
    if (c) return { ...c, enCurso: c.inicio <= ahora };
  }
  return null;
}

const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export function cuandoEmpieza(inicio, ahora = new Date()) {
  const min = Math.round((inicio - ahora) / 6e4);
  if (min <= 0) return 'ahora';
  if (min < 60) return `en ${min} min`;
  if (inicio.toDateString() === ahora.toDateString()) return `hoy a las ${hhmm(inicio)}`;
  const manana = new Date(ahora); manana.setDate(ahora.getDate() + 1);
  if (inicio.toDateString() === manana.toDateString()) return `mañana a las ${hhmm(inicio)}`;
  return `el ${inicio.toLocaleDateString('es-ES', { weekday: 'long' })} a las ${hhmm(inicio)}`;
}

// ---------- exámenes ----------
export function examenes(tareas = [], marcas = {}, ahora = new Date()) {
  return tareas.filter(t => esExamen(t) && t.cierre && estado(t, marcas, ahora) === 'pendiente').sort(porCierre);
}
export const diasHasta = (fecha, ahora = new Date()) => {
  const a = new Date(ahora); a.setHours(0, 0, 0, 0);
  const b = new Date(fecha); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 864e5);
};

// ---------- anillos de progreso y racha ----------
const diaDe = iso => new Date(iso).toLocaleDateString('sv'); // AAAA-MM-DD local
export const OBJETIVO_FOCO = 100; // minutos al día

// Tareas marcadas como hechas en un día (AAAA-MM-DD).
export const hechasEnDia = (marcas = {}, dia) =>
  Object.values(marcas).filter(m => m?.hecha && m.t && diaDe(m.t) === dia).length;

// { entregas: { hechas, objetivo }, foco: { minutos, objetivo }, racha: días seguidos con algo hecho o 25 min de foco }
export function anillos({ marcas = {}, foco = {}, pendientesHoy = 0, ahora = new Date() } = {}) {
  const hoy = ahora.toLocaleDateString('sv');
  const hechas = hechasEnDia(marcas, hoy);
  const activo = dia => hechasEnDia(marcas, dia) > 0 || (foco[dia] || 0) >= 25;
  let racha = 0;
  const d = new Date(ahora);
  if (!activo(hoy)) d.setDate(d.getDate() - 1); // hoy aún no cuenta si no has hecho nada
  while (activo(d.toLocaleDateString('sv')) && racha < 366) { racha++; d.setDate(d.getDate() - 1); }
  return {
    entregas: { hechas, objetivo: Math.max(1, hechas + pendientesHoy) },
    foco: { minutos: foco[hoy] || 0, objetivo: OBJETIVO_FOCO },
    racha,
  };
}

// Resumen de los últimos 7 días y de los próximos 7.
export function resumenSemana({ tareas = [], marcas = {}, foco = {}, esfuerzos = {}, ahora = new Date() } = {}) {
  let hechas = 0, minutos = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(ahora); d.setDate(ahora.getDate() - i);
    const dia = d.toLocaleDateString('sv');
    hechas += hechasEnDia(marcas, dia);
    minutos += foco[dia] || 0;
  }
  const limite = new Date(ahora); limite.setDate(ahora.getDate() + 7);
  const proximas = tareas.filter(t => t.cierre && estado(t, marcas, ahora) === 'pendiente' && new Date(t.cierre) <= limite).sort(porCierre);
  return { hechas, minutosFoco: minutos, proximas, cargaProxima: proximas.reduce((n, t) => n + minutosDe(t, esfuerzos), 0) };
}

// ---------- calendario (.ics) ----------
const icsFecha = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsTexto = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`);
const plegar = l => l.match(/.{1,74}/g).join('\r\n '); // líneas de 75 octetos como pide el estándar (aprox.)

export function generarIcs(tareas = [], marcas = {}, ahora = new Date(), urlDe = () => '') {
  const eventos = tareas.filter(t => t.cierre && estado(t, marcas, ahora) === 'pendiente').map(t => {
    const fin = new Date(t.cierre), inicio = new Date(fin.getTime() - 36e5);
    return ['BEGIN:VEVENT', `UID:rigatony-${t.id}@digitechfp`, `DTSTAMP:${icsFecha(ahora)}`,
      `DTSTART:${icsFecha(inicio)}`, `DTEND:${icsFecha(fin)}`,
      `SUMMARY:${icsTexto(`${esExamen(t) ? 'Examen' : 'Entrega'}: ${t.nombre} (${modDe(t).corto})`)}`,
      `URL:${urlDe(t)}`, `DESCRIPTION:${icsTexto(urlDe(t))}`,
      'BEGIN:VALARM', 'TRIGGER:-PT24H', 'ACTION:DISPLAY', `DESCRIPTION:${icsTexto(t.nombre)}`, 'END:VALARM',
      'END:VEVENT'].map(plegar).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rigatony Dash//ES', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Entregas DAW', ...eventos, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

// ---------- antes de entregar ----------
const PISTAS = /(formato|\.(pdf|zip|rar|docx?|odt|pptx?|sql|php|js|html)\b|nombre del (archivo|fichero)|nombra|apellido|entreg|sub(ir|e)|adjunt|m[aá]ximo|m[ií]nimo|palabras|p[aá]ginas|obligatori|inclu(ir|ye)|deber[aá]s?|captura|enlace|github|repositorio)/i;

const SOLO_ARCHIVO = /\.(pdf|zip|rar|docx?|odt|pptx?|xlsx?|png|jpe?g)$/i; // líneas que son solo el nombre de un adjunto

// Frases del enunciado que parecen requisitos de la entrega (como mucho 8).
export function requisitos(enunciado = '') {
  const frases = enunciado.split(/\n+|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡-])/)
    .map(f => f.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(f => f.length >= 12 && f.length <= 240 && PISTAS.test(f) && !SOLO_ARCHIVO.test(f));
  return [...new Set(frases)].slice(0, 8);
}

// ---------- empezar con Claude ----------
export function promptClaude(t, carpeta = '') {
  const m = modDe(t);
  const adj = (t.adjuntos || []).map(a => `- ${a.nombre || a.url}`).join('\n');
  return [
    `Voy a hacer esta tarea de ${m.titulo}: «${t.nombre}».`,
    t.cierre ? `Cierra el ${fmt(t.cierre)}.` : 'No tiene fecha de cierre.',
    carpeta ? `Mi carpeta de trabajo es: ${carpeta}` : '',
    '', 'Enunciado:', t.enunciado || '(sin descripción en el campus)',
    adj ? `\nAdjuntos del enunciado (están en la carpeta):\n${adj}` : '',
    '', 'Ayúdame así:',
    '1. Resume en una checklist qué piden exactamente y cómo se entrega (formato, nombre del archivo…).',
    '2. Propón un plan por pasos con el tiempo aproximado de cada uno.',
    '3. Empecemos por el primer paso.',
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}

// ---------- notas ----------
// "8,50 / 10,00" → { valor: 8.5, max: 10 }. Devuelve null si no hay nota numérica.
export function parseNota(texto = '') {
  const m = String(texto).match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const valor = Number(m[1].replace(',', '.')), max = Number(m[2].replace(',', '.'));
  return max > 0 ? { valor, max } : null;
}

// Media sobre 10 por asignatura: { [corto]: { media, n } }.
export function mediasPorAsignatura(tareas = []) {
  const acc = {};
  for (const t of tareas) {
    if (!t.nota) continue;
    const c = modDe(t).corto;
    acc[c] = acc[c] || { suma: 0, n: 0 };
    acc[c].suma += (t.nota.valor / t.nota.max) * 10;
    acc[c].n++;
  }
  return Object.fromEntries(Object.entries(acc).map(([c, { suma, n }]) => [c, { media: suma / n, n }]));
}
