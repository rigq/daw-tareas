// Funciones puras de la pestaña Apuntes: sin navegador ni red.

const INDICES = new Set(['README.md', 'RESUMEN.md']);
const esIndice = ruta => INDICES.has(ruta);
const limpiar = s => (s || '').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
const ordenar = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });

// ---------- Markdown mínimo → bloques (la interfaz los pinta con textContent) ----------

function inline(s) {
  const out = [];
  for (const parte of s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/)) {
    if (!parte) continue;
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) out.push({ t: 'b', v: parte.slice(2, -2) });
    else if (parte.startsWith('`') && parte.endsWith('`') && parte.length > 2) out.push({ t: 'code', v: parte.slice(1, -1) });
    else if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) out.push({ t: 'i', v: parte.slice(1, -1) });
    else out.push({ t: 'text', v: parte });
  }
  return out;
}

export function parseMd(texto) {
  const lineas = (texto || '').replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '').split('\n');
  const bloques = [];
  let parrafo = [];
  const cerrar = () => { if (parrafo.length) bloques.push({ tipo: 'p', inline: inline(parrafo.join(' ')) }); parrafo = []; };
  const ultimo = tipo => (bloques.at(-1)?.tipo === tipo && !parrafo.length ? bloques.at(-1) : null);
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    let m;
    if (!l.trim()) { cerrar(); continue; }
    if ((m = l.match(/^```\s*(\S*)/))) {
      cerrar();
      const codigo = [];
      while (++i < lineas.length && !/^```/.test(lineas[i])) codigo.push(lineas[i]);
      bloques.push({ tipo: 'code', lang: m[1], texto: codigo.join('\n') });
    } else if ((m = l.match(/^(#{1,4})\s+(.*)/))) {
      cerrar(); bloques.push({ tipo: 'h', nivel: m[1].length, inline: inline(m[2]) });
    } else if ((m = l.match(/^\s*[-*]\s+(.*)/))) {
      cerrar(); (ultimo('ul') || bloques[bloques.push({ tipo: 'ul', items: [] }) - 1]).items.push(inline(m[1]));
    } else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
      cerrar(); (ultimo('ol') || bloques[bloques.push({ tipo: 'ol', items: [] }) - 1]).items.push(inline(m[1]));
    } else if (/^\s*\|/.test(l)) {
      cerrar();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue; // fila separadora
      const celdas = l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      (ultimo('table') || bloques[bloques.push({ tipo: 'table', filas: [] }) - 1]).filas.push(celdas);
    } else if ((m = l.match(/^>\s?(.*)/))) {
      cerrar(); bloques.push({ tipo: 'quote', inline: inline(m[1]) });
    } else {
      parrafo.push(l.trim());
    }
  }
  cerrar();
  return bloques;
}

// ---------- Archivos de apuntes ----------

export function agruparApuntes(archivos) {
  const grupos = new Map();
  for (const a of archivos) {
    if (esIndice(a.ruta)) continue;
    const i = a.ruta.lastIndexOf('/');
    const g = i < 0 ? '' : a.ruta.slice(0, i);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(a);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : ordenar(a, b)))
    .map(([grupo, lista]) => ({ grupo, archivos: lista.sort((x, y) => ordenar(x.ruta, y.ruta)) }));
}

// Archivos que el RESUMEN.md no cubre. El resumen lista lo que leyó en <!-- archivos: … -->.
export function sinResumir(archivos, textoResumen) {
  const m = (textoResumen || '').match(/<!--\s*archivos:([\s\S]*?)-->/);
  const cubiertos = new Set((m ? m[1] : '').split('\n').map(s => s.trim()).filter(Boolean));
  return archivos.filter(a => !esIndice(a.ruta) && !cubiertos.has(a.ruta));
}

export function tipoApunte(nombre) {
  const ext = (nombre.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'imagen';
  if (['txt', 'md', 'php', 'js', 'html', 'htm', 'css', 'json', 'sql', 'xml', 'java', 'py', 'csv'].includes(ext)) return 'texto';
  if (['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'odp'].includes(ext)) return 'office';
  return 'otro';
}

export function rutaApunte(carpetaModulo, nombre, carpetaCampus = '') {
  const sub = limpiar(carpetaCampus);
  return `${carpetaModulo}/Apuntes/${sub ? `${sub}/` : ''}${nombre}`;
}
