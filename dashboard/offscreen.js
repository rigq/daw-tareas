// Lee el campus cuando se lo pide el service worker y le devuelve el resultado.
import { leerCampus } from './campus.js';

chrome.runtime.onMessage.addListener((msg, _remitente, responder) => {
  if (msg?.destino !== 'offscreen' || msg.tipo !== 'leer-campus') return false;
  leerCampus()
    .then(datos => responder({ ok: true, datos }))
    .catch(e => responder({ ok: false, codigo: e.codigo || 'ERROR', mensaje: e.message || String(e) }));
  return true; // respuesta asíncrona
});
