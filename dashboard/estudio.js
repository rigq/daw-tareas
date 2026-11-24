// Estudio a partir de los RESUMEN.md: tarjetas de repaso (sistema Leitner) y búsqueda dentro de los resúmenes.
// Lógica pura: sin DOM ni chrome.*.
import { parseMd, inline } from './apuntes.js';

// Vuelve a markdown en línea (para pintarlo con formato) a partir de las piezas de inline().
const texto = partes => (partes || []).map(p => (p.t === 'b' ? `**${p.v}**` : p.t === 'i' ? `*${p.v}*` : p.t === 'code' ? `\`${p.v}\`` : p.v)).join('');
const limpiar = s => s.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Identificador estable de una tarjeta (hash corto del módulo y el anverso).
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Tarjetas de un resumen: [{ id, tema, anverso, reverso: [{ etiqueta, valor }] }]. anverso/valor son markdown en línea.
// - Filas de tabla: la primera columna es la pregunta y el resto, la respuesta (con la cabecera como etiqueta).
// - Viñetas "**término**: definición" (o "**término** (…): …").
export function extraerTarjetas(modulo, md = '') {
  const tarjetas = [];
  let tema = '';
  const nueva = (anverso, reverso) => {
    const a = limpiar(anverso);
    if (a.length < 2 || !reverso.some(r => limpiar(r.valor).length > 1)) return;
    tarjetas.push({ id: hash(`${modulo}|${tema}|${a}`), modulo, tema, anverso: anverso.trim(), reverso });
  };
  for (const b of parseMd(md)) {
    if (b.tipo === 'h' && b.nivel <= 3) tema = limpiar(texto(b.inline));
    else if (b.tipo === 'table' && b.filas.length > 1 && b.filas[0].length > 1) {
      const cab = b.filas[0].map(c => limpiar(texto(c)));
      const filas = b.filas.slice(1);
      // Solo tablas de términos: la primera columna corta (en las comparativas es una frase larga).
      if (filas.some(f => limpiar(texto(f[0])).length > 60)) continue;
      for (const fila of filas) {
        const celdas = fila.map(texto);
        nueva(celdas[0], celdas.slice(1).map((v, i) => ({ etiqueta: cab[i + 1] || '', valor: v })));
      }
    } else if (b.tipo === 'ul' || b.tipo === 'ol') {
      for (const item of b.items) {
        if (item[0]?.t !== 'b') continue;
        const resto = texto(item.slice(1));
        const m = resto.match(/^\s*(\([^)]*\))?\s*[:—–-]\s*(.+)/s);
        if (m) nueva(item[0].v + (m[1] ? ` ${m[1]}` : ''), [{ etiqueta: '', valor: m[2] }]);
      }
    }
  }
  const vistos = new Set();
  return tarjetas.filter(t => !vistos.has(t.id) && vistos.add(t.id));
}

// ---------- repetición espaciada (Leitner) ----------
export const INTERVALOS = [0, 1, 3, 7, 16, 35]; // días según la caja (1…5)
const diaISO = d => d.toLocaleDateString('sv');

// Tarjetas para hoy: las que tocan repasar y hasta `nuevas` sin ver. progreso: { [id]: { caja, proximo } }.
export function sesionDeRepaso(tarjetas = [], progreso = {}, ahora = new Date(), nuevas = 10) {
  const hoy = diaISO(ahora);
  const toca = tarjetas.filter(t => progreso[t.id] && progreso[t.id].proximo <= hoy)
    .sort((a, b) => progreso[a.id].caja - progreso[b.id].caja);
  const sinVer = tarjetas.filter(t => !progreso[t.id]).slice(0, nuevas);
  return [...toca, ...sinVer];
}

export function responder(progreso = {}, id, acierto, ahora = new Date()) {
  const caja = acierto ? Math.min(5, (progreso[id]?.caja || 0) + 1) : 1;
  const d = new Date(ahora); d.setDate(d.getDate() + INTERVALOS[caja]);
  return { ...progreso, [id]: { caja, proximo: diaISO(d) } };
}

export function pendientesDeRepaso(tarjetas = [], progreso = {}, ahora = new Date()) {
  const hoy = diaISO(ahora);
  return tarjetas.filter(t => progreso[t.id] && progreso[t.id].proximo <= hoy).length;
}

// ---------- búsqueda en los resúmenes ----------
// resumenes: [{ modulo, texto }]. Devuelve [{ modulo, tema, fragmento }] (fragmento en markdown en línea).
export function buscarEnResumenes(resumenes = [], consulta = '', max = 30) {
  const q = norm(consulta.trim());
  if (q.length < 2) return [];
  const out = [];
  for (const { modulo, texto: md } of resumenes) {
    let tema = '';
    for (const b of parseMd(md)) {
      if (b.tipo === 'h') { tema = limpiar(texto(b.inline)); continue; }
      const piezas = b.tipo === 'p' || b.tipo === 'quote' ? [texto(b.inline)]
        : b.tipo === 'ul' || b.tipo === 'ol' ? b.items.map(texto)
          : b.tipo === 'table' ? b.filas.slice(1).map(f => f.map(texto).join(' — '))
            : b.tipo === 'code' ? [b.texto] : [];
      for (const p of piezas) {
        if (norm(p).includes(q) || norm(tema).includes(q)) out.push({ modulo, tema, fragmento: p.length > 260 ? `${p.slice(0, 257)}…` : p });
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

export { inline };
