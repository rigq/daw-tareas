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
const normalizar = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function slug(s, n = 70) {
  const r = (s || '').replace(/[<>:"/\\|?*“”]/g, '').replace(/&amp;/g, '&')
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
// Nombre alternativo para el intento N (0 = el original): "x.md", "x (id).md", "x (id-2).md"…
export const rutaLibre = (ruta, id, intento = 0) =>
  (intento === 0 ? ruta : ruta.replace(/\.md$/, ` (${intento === 1 ? id : `${id}-${intento}`}).md`));
// Clave de comparación como la del sistema de archivos de Windows (sin mayúsculas, Unicode NFC).
export const clave = ruta => ruta.normalize('NFC').toLowerCase();
export const idDeFicha = texto => (texto || '').match(/view\.php\?id=(\d+)/)?.[1] ?? null;

export function nombreArchivo(url) {
  const ultimo = decodeURIComponent(url.split('?')[0].split('/').pop() || 'archivo');
  return ultimo.replace(/ \(\d+\)(?=\.[^.]+$)/, '').replace(/[<>:"/\\|?*]/g, '').trim() || 'archivo';
}

// Marcas: id → { hecha, t } (t = cuándo se cambió). Un string antiguo equivale a { hecha: true, t: string }.
const marca = v => (typeof v === 'string' ? { hecha: true, t: v } : v || null);
export const estaHecha = (marcas, id) => marca(marcas?.[id])?.hecha === true;
export function fusionarMarcas(a = {}, b = {}) {
  const r = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = marca(a[id]), y = marca(b[id]);
    r[id] = !x ? y : !y ? x : (y.t > x.t ? y : x);
  }
  return r;
}

export const esDescargaValida = (urlFinal, tipo, nombre) =>
  !esPaginaLogin(urlFinal) && !(/text\/html/i.test(tipo || '') && !/\.html?$/i.test(nombre));

export function estado(t, marcas = {}, ahora = new Date()) {
  if (estaHecha(marcas, t.id)) return 'hecha';
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
