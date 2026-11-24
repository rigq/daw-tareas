// Lógica pura de las pestañas Inicio (Riga Dashboard) y Dr. Baos: sin DOM ni chrome.*, para poder testearla.

// ---------- utilidades ----------
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const diaIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sumarDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return diaIso(new Date(y, m - 1, d + n)); };

// ---------- Dr. Baos ----------
export const FRENTES = {
  video: { nombre: 'Vídeo TV', color: '#ff3b30', emoji: '📺' },
  web: { nombre: 'Web Astro', color: '#007aff', emoji: '🌐' },
  ads: { nombre: 'Google Ads', color: '#ff9500', emoji: '📈' },
  seo: { nombre: 'SEO', color: '#34c759', emoji: '🔎' },
  chatbot: { nombre: 'Chatbot WhatsApp', color: '#25a366', emoji: '💬' },
  otros: { nombre: 'Otros', color: '#8e8e93', emoji: '🗂️' },
};
export const CLINICAS = { ambas: 'Las dos', maja: 'Majadahonda', arges: 'Argés' };
export const COLUMNAS = { hacer: 'Por hacer', marcha: 'En marcha', hecho: 'Hecho' };

// Punto de partida con lo que ya sabemos del cliente. Todo se puede editar o borrar.
export function baosInicial(hoy = new Date()) {
  const t = (titulo, frente, col, extra = {}) => ({ id: nuevoId(), titulo, frente, col, clinica: 'ambas',
    urgente: false, fecha: '', notas: '', creada: diaIso(hoy), ...extra });
  return {
    version: 1,
    progreso: { video: 0, web: 80, ads: 10, seo: 0, chatbot: 0 },
    tareas: [
      t('Guion y mensajes clave del vídeo de la TV', 'video', 'hacer', { urgente: true }),
      t('Generar el vídeo con IA y probarlo en la pantalla', 'video', 'hacer', { urgente: true }),
      t('Terminar el rediseño en Astro', 'web', 'marcha', { notas: 'Va por el 80 %.' }),
      t('Publicar la web nueva en clinicadentaldrbaos.com', 'web', 'hacer'),
      t('Campaña Implantes Majadahonda', 'ads', 'marcha', { clinica: 'maja' }),
      t('Primera campaña de Google Ads para Argés', 'ads', 'hacer', { clinica: 'arges' }),
      t('SEO local: fichas de Google Business de las dos clínicas', 'seo', 'hacer'),
    ],
    ideas: [
      { id: nuevoId(), texto: 'Chatbot de WhatsApp que conteste 24/7 (citas, horarios, urgencias)', frente: 'chatbot', creada: diaIso(hoy) },
    ],
  };
}

// Orden dentro de una columna: urgentes primero, luego por fecha (las que no tienen, al final), luego por creación.
export function ordenarTareas(tareas) {
  return [...tareas].sort((a, b) =>
    (b.urgente - a.urgente) || ((a.fecha || '9999') < (b.fecha || '9999') ? -1 : (a.fecha || '9999') > (b.fecha || '9999') ? 1 : 0)
    || (a.creada < b.creada ? -1 : a.creada > b.creada ? 1 : 0));
}

export function filtrarTareas(tareas, { texto = '', frente = '' } = {}) {
  const q = texto.trim().toLowerCase();
  return tareas.filter(t => (!frente || t.frente === frente)
    && (!q || `${t.titulo} ${t.notas} ${FRENTES[t.frente]?.nombre || ''} ${CLINICAS[t.clinica] || ''}`.toLowerCase().includes(q)));
}

export function moverTarea(baos, id, col) {
  return { ...baos, tareas: baos.tareas.map(t => t.id === id ? { ...t, col, hecha: col === 'hecho' ? diaIso() : undefined } : t) };
}

// Columna vecina para mover con el teclado o con las flechas de la tarjeta.
export function columnaVecina(col, paso) {
  const orden = Object.keys(COLUMNAS);
  return orden[Math.max(0, Math.min(orden.length - 1, orden.indexOf(col) + paso))];
}

export function ideaATarea(baos, idIdea) {
  const idea = baos.ideas.find(i => i.id === idIdea);
  if (!idea) return baos;
  return {
    ...baos,
    ideas: baos.ideas.filter(i => i.id !== idIdea),
    tareas: [...baos.tareas, { id: nuevoId(), titulo: idea.texto, frente: idea.frente || 'otros', col: 'hacer', clinica: 'ambas',
      urgente: false, fecha: '', notas: '', creada: diaIso() }],
  };
}

// Resumen por frente: pendientes, urgentes y progreso (el manual manda; si no hay, el de las tarjetas).
export function resumenFrentes(baos) {
  return Object.keys(FRENTES).filter(f => f !== 'otros' || baos.tareas.some(t => t.frente === 'otros')).map(f => {
    const ts = baos.tareas.filter(t => t.frente === f);
    const hechas = ts.filter(t => t.col === 'hecho').length;
    const manual = baos.progreso?.[f];
    return { id: f, ...FRENTES[f], pendientes: ts.length - hechas, urgentes: ts.filter(t => t.urgente && t.col !== 'hecho').length,
      progreso: Number.isFinite(manual) ? manual : (ts.length ? Math.round(hechas / ts.length * 100) : 0) };
  });
}

// Estado de la fecha límite de una tarjeta.
export function estadoFecha(fecha, hoy = new Date()) {
  if (!fecha) return null;
  const d = Math.round((new Date(fecha + 'T00:00') - new Date(diaIso(hoy) + 'T00:00')) / 86400000);
  if (d < 0) return { clase: 'vencida', texto: d === -1 ? 'venció ayer' : `venció hace ${-d} días` };
  if (d === 0) return { clase: 'hoy', texto: 'hoy' };
  if (d === 1) return { clase: 'pronto', texto: 'mañana' };
  if (d <= 7) return { clase: 'pronto', texto: `en ${d} días` };
  return { clase: '', texto: new Date(fecha + 'T00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) };
}

// Lo que Inicio enseña de Dr. Baos: urgentes, vencidas o con fecha en 7 días, y lo que está en marcha.
export function baosParaInicio(baos, hoy = new Date(), max = 5) {
  const vivas = (baos?.tareas || []).filter(t => t.col !== 'hecho');
  const importa = t => t.urgente || t.col === 'marcha' || (t.fecha && ['vencida', 'hoy', 'pronto'].includes(estadoFecha(t.fecha, hoy)?.clase));
  return ordenarTareas(vivas.filter(importa)).slice(0, max);
}

// ---------- Inicio ----------
export function saludo(ahora = new Date(), nombre = 'Riga') {
  const h = ahora.getHours();
  const parte = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  return `${parte}, ${nombre}`;
}

// Hábitos: { lista: [{id, nombre, emoji}], hechos: { 'AAAA-MM-DD': [ids] } }
export function alternarHabito(habitos, id, dia = diaIso()) {
  const hoy = new Set(habitos.hechos?.[dia] || []);
  hoy.has(id) ? hoy.delete(id) : hoy.add(id);
  return { ...habitos, hechos: { ...habitos.hechos, [dia]: [...hoy] } };
}

// Días seguidos cumpliendo el hábito. Si hoy aún no está hecho, la racha de ayer sigue viva.
export function racha(habitos, id, dia = diaIso()) {
  const hecho = d => (habitos.hechos?.[d] || []).includes(id);
  let d = hecho(dia) ? dia : sumarDias(dia, -1), n = 0;
  while (hecho(d)) { n++; d = sumarDias(d, -1); }
  return n;
}

export const ultimosDias = (habitos, id, dias = 7, hoy = diaIso()) =>
  Array.from({ length: dias }, (_, i) => sumarDias(hoy, i - dias + 1)).map(d => ({ dia: d, hecho: (habitos.hechos?.[d] || []).includes(id) }));

// Quita los registros de más de 60 días para que el storage no crezca sin fin.
export function podarHabitos(habitos, hoy = diaIso()) {
  const limite = sumarDias(hoy, -60);
  return { ...habitos, hechos: Object.fromEntries(Object.entries(habitos.hechos || {}).filter(([d]) => d >= limite)) };
}

export const HABITOS_INICIALES = [
  { id: 'agua', nombre: 'Beber agua', emoji: '💧' },
  { id: 'mover', nombre: 'Moverme 30 min', emoji: '🏃' },
  { id: 'leer', nombre: 'Leer 15 min', emoji: '📖' },
  { id: 'dormir', nombre: 'Dormir 7 h', emoji: '😴' },
];

export const ACCESOS_INICIALES = [
  { id: 'baos', nombre: 'Clínica Dr. Baos', url: 'https://clinicadentaldrbaos.com' },
  { id: 'ads', nombre: 'Google Ads', url: 'https://ads.google.com' },
  { id: 'gsc', nombre: 'Search Console', url: 'https://search.google.com/search-console' },
  { id: 'campus', nombre: 'Campus', url: 'https://campus.digitechfp.com' },
  { id: 'github', nombre: 'GitHub', url: 'https://github.com' },
  { id: 'gmail', nombre: 'Gmail', url: 'https://mail.google.com' },
  { id: 'claude', nombre: 'Claude', url: 'https://claude.ai' },
  { id: 'yt', nombre: 'YouTube', url: 'https://www.youtube.com' },
];

export function normalizarUrl(url) {
  const u = url.trim();
  if (!u) return null;
  try { const x = new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`); return /^https?:$/.test(x.protocol) ? x.href : null; }
  catch { return null; }
}

// Ideas para pensar en un rato tranquilo. Una al día, siempre la misma ese día.
export const IDEAS = [
  { tema: 'Dr. Baos', texto: 'Pide una reseña de Google por WhatsApp al día siguiente de cada cita. Las reseñas suben el SEO local más que casi cualquier otra cosa.' },
  { tema: 'Dr. Baos', texto: 'Mide cuántas llamadas trae Google Ads con un número de seguimiento. Sin eso no sabes cuánto cuesta un paciente.' },
  { tema: 'Dr. Baos', texto: 'Graba 3 vídeos cortos del doctor respondiendo dudas reales (¿duele un implante?). Sirven para la web, la TV y redes.' },
  { tema: 'Dr. Baos', texto: 'Haz una landing solo para implantes, con precio orientativo y financiación. Convierte mejor que mandar los anuncios a la portada.' },
  { tema: 'Dr. Baos', texto: 'Prepara un informe mensual de una página (visitas, llamadas, coste por paciente). Es lo que justifica subir tu tarifa.' },
  { tema: 'Negocio', texto: 'Lo que haces para Dr. Baos (web + Ads + SEO) es un paquete vendible a otras clínicas dentales de la zona. Empieza documentando resultados.' },
  { tema: 'Negocio', texto: 'Apunta las horas que dedicas a cada cliente una semana. Saber tu €/hora real cambia cómo pones precios.' },
  { tema: 'Negocio', texto: 'Un caso de éxito con números (antes/después) vende más que un portfolio bonito.' },
  { tema: 'Negocio', texto: 'Cobra el mantenimiento web como cuota mensual pequeña en vez de por arreglo: ingreso fijo y menos discusiones.' },
  { tema: 'Café-bar', texto: 'Una ficha de Google Business cuidada (fotos, horario, carta) es la web más rentable para un bar.' },
  { tema: 'Café-bar', texto: 'Apunta durante una semana qué se vende por franja horaria. Ajustar el producto a la hora punta sube el ticket sin publicidad.' },
  { tema: 'Dev', texto: 'Astro + un CMS ligero (Decap, Keystatic) deja que el cliente cambie textos sin llamarte. Menos soporte, más margen.' },
  { tema: 'Dev', texto: 'Lighthouse en cada despliegue: una web rápida sube la calidad del anuncio en Google Ads y baja el coste por clic.' },
  { tema: 'Dev', texto: 'Los datos estructurados de "Dentist" y "LocalBusiness" en schema.org ayudan a salir en el mapa de Google.' },
  { tema: 'Dev', texto: 'La API de WhatsApp Business tiene tarifas por conversación: calcula el coste del chatbot antes de prometerlo.' },
  { tema: 'Personal', texto: 'Bloquea un rato fijo a la semana solo para Dr. Baos. Lo que no tiene hueco en la agenda acaba en "mañana".' },
  { tema: 'Personal', texto: 'Revisión del domingo en 10 minutos: qué hice, qué se queda, qué es lo único importante de la semana.' },
  { tema: 'IA', texto: 'Usa la IA para el primer borrador (guiones, textos SEO, anuncios) y tu tiempo para revisar y decidir.' },
];

export function ideaDelDia(hoy = new Date(), desplazamiento = 0) {
  const n = Math.floor(new Date(diaIso(hoy) + 'T00:00').getTime() / 86400000) + desplazamiento;
  return IDEAS[((n % IDEAS.length) + IDEAS.length) % IDEAS.length];
}

// Códigos WMO de Open-Meteo → icono y texto.
export function tiempoDe(codigo, esDia = true) {
  const c = Number(codigo);
  if (c === 0) return { icono: esDia ? '☀️' : '🌙', texto: 'Despejado' };
  if (c <= 2) return { icono: esDia ? '🌤️' : '☁️', texto: 'Algo nuboso' };
  if (c === 3) return { icono: '☁️', texto: 'Nublado' };
  if (c <= 48) return { icono: '🌫️', texto: 'Niebla' };
  if (c <= 57) return { icono: '🌦️', texto: 'Llovizna' };
  if (c <= 67 || (c >= 80 && c <= 82)) return { icono: '🌧️', texto: 'Lluvia' };
  if (c <= 77 || c === 85 || c === 86) return { icono: '🌨️', texto: 'Nieve' };
  if (c >= 95) return { icono: '⛈️', texto: 'Tormenta' };
  return { icono: '🌡️', texto: '' };
}

// Con varias fotos de fondo, una distinta cada día (la misma todo el día).
export function fotoDelDia(fotos, hoy = new Date()) {
  if (!fotos?.length) return null;
  const n = Math.floor(new Date(diaIso(hoy) + 'T00:00').getTime() / 86400000);
  return fotos[((n % fotos.length) + fotos.length) % fotos.length];
}

export const dominioDe = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
