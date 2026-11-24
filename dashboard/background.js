// Service worker de Riga Hub:
// - lee el campus cada 3 horas (y al abrir Chrome) a través de un documento oculto,
// - guarda los datos y las novedades, pone el número en el icono y programa los avisos de 24 h y 2 h.
// No toca la carpeta DAW: las fichas y adjuntos se siguen creando al pulsar Actualizar en el panel.
import { urlEntrega } from './logica.js';
import { novedades, acumular, fusionarLectura, insignia, avisos, textoAviso } from './plan.js';

const CADA_MINUTOS = 180;
const leer = async k => (await chrome.storage.local.get(k))[k];

// ---------- número del icono y avisos ----------
async function refrescarIconoYAvisos() {
  const datos = await leer('datos');
  const marcas = (await leer('marcas')) || {};
  const ins = insignia(datos?.tareas || [], marcas);
  await chrome.action.setBadgeText({ text: ins.texto });
  await chrome.action.setBadgeBackgroundColor({ color: ins.color });
  await chrome.action.setTitle({ title: `Riga Hub — ${ins.titulo}` });

  for (const a of await chrome.alarms.getAll()) if (a.name.startsWith('aviso|')) await chrome.alarms.clear(a.name);
  for (const a of avisos(datos?.tareas || [], marcas)) await chrome.alarms.create(a.nombre, { when: a.cuando });
}

// ---------- lectura en segundo plano ----------
async function asegurarOffscreen() {
  if (await chrome.offscreen.hasDocument?.()) return;
  try {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['DOM_PARSER'],
      justification: 'Leer las páginas del campus para actualizar las tareas en segundo plano.' });
  } catch (e) { if (!/single offscreen/i.test(e.message)) throw e; }
}

let leyendo = null;
async function actualizarEnSegundoPlano() {
  if (leyendo) return leyendo;
  leyendo = (async () => {
    await asegurarOffscreen();
    const r = await chrome.runtime.sendMessage({ destino: 'offscreen', tipo: 'leer-campus' });
    await chrome.offscreen.closeDocument().catch(() => {});
    if (!r?.ok) {
      await chrome.storage.local.set({ estadoFondo: { fecha: new Date().toISOString(), ok: false, codigo: r?.codigo, mensaje: r?.mensaje } });
      return;
    }
    const prev = await leer('datos');
    const datos = fusionarLectura(prev, r.datos);
    delete datos.fallos;
    const lista = acumular((await leer('novedades')) || [], novedades(prev, datos));
    await chrome.storage.local.set({ datos, novedades: lista, estadoFondo: { fecha: datos.fecha, ok: true } });
  })().finally(() => { leyendo = null; });
  return leyendo;
}

// ---------- eventos ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refrescar', { periodInMinutes: CADA_MINUTOS, delayInMinutes: 1 });
  refrescarIconoYAvisos();
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('refrescar', { periodInMinutes: CADA_MINUTOS, delayInMinutes: 1 });
  refrescarIconoYAvisos();
});

chrome.alarms.onAlarm.addListener(async alarma => {
  if (alarma.name === 'refrescar') { await actualizarEnSegundoPlano().catch(() => {}); return; }
  if (alarma.name === 'medianoche') { await refrescarIconoYAvisos(); return; }
  if (!alarma.name.startsWith('aviso|')) return;
  const [, id, antes] = alarma.name.split('|');
  const datos = await leer('datos');
  const t = datos?.tareas?.find(x => x.id === id);
  if (!t) return;
  const { titulo, mensaje } = textoAviso(t, Number(antes));
  chrome.notifications.create(`entrega|${id}`, {
    type: 'basic', iconUrl: 'icons/icon128.png', title: titulo, message: mensaje, priority: 2,
    buttons: [{ title: 'Entregar' }, { title: 'Abrir panel' }],
  });
});

const abrirPanel = () => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
async function abrirEntrega(id) {
  const t = (await leer('datos'))?.tareas?.find(x => x.id === id);
  if (t) chrome.tabs.create({ url: urlEntrega(t) });
}
chrome.notifications.onClicked.addListener(n => { if (n.startsWith('entrega|')) abrirEntrega(n.split('|')[1]); chrome.notifications.clear(n); });
chrome.notifications.onButtonClicked.addListener((n, boton) => {
  if (!n.startsWith('entrega|')) return;
  if (boton === 0) abrirEntrega(n.split('|')[1]); else abrirPanel();
  chrome.notifications.clear(n);
});

// Cualquier cambio de datos o marcas (desde el panel o desde aquí) recalcula el icono y los avisos.
chrome.storage.onChanged.addListener((cambios, zona) => {
  if (zona === 'local' && (cambios.datos || cambios.marcas)) refrescarIconoYAvisos();
});

// Mensajes de las páginas de la extensión.
chrome.runtime.onMessage.addListener((msg, _r, responder) => {
  if (msg?.destino !== 'fondo') return false;
  if (msg.tipo === 'actualizar') { actualizarEnSegundoPlano().then(() => responder({ ok: true }), e => responder({ ok: false, mensaje: e.message })); return true; }
  if (msg.tipo === 'abrir-panel') { abrirPanel(); return false; }
  return false;
});

// El número del icono cambia al pasar la medianoche ("mañana" pasa a ser "hoy").
function programarMedianoche() {
  const m = new Date(); m.setHours(24, 0, 30, 0);
  chrome.alarms.create('medianoche', { when: m.getTime(), periodInMinutes: 24 * 60 });
}
programarMedianoche();
refrescarIconoYAvisos();
