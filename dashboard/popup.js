// Ventanita del icono: el plan de hoy con su botón de entregar, sin abrir el panel entero.
import { agrupar, modDe, cuentaAtras, urgencia, urlEntrega } from './logica.js';
import { planDeHoy, duracion } from './plan.js';

const $ = s => document.querySelector(s);
const leer = async k => (await chrome.storage.local.get(k))[k];

function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  e.append(...hijos.filter(h => h != null && h !== false));
  return e;
}

const abrir = url => { chrome.tabs.create({ url }); window.close(); };

async function pintar() {
  const [datos, marcas, esfuerzos, disponible] = await Promise.all(
    ['datos', 'marcas', 'esfuerzos', 'minutosHoy'].map(leer));
  const ahora = new Date();
  $('#pop-fecha').textContent = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const lista = $('#pop-lista');
  if (!datos) { lista.replaceChildren(el('p', { class: 'vacio' }, 'Abre el panel y pulsa Actualizar.')); return; }
  const g = agrupar(datos.tareas, marcas || {}, ahora);
  const plan = planDeHoy(g, esfuerzos || {}, disponible || 180);
  lista.replaceChildren(plan.hoy.length
    ? el('ul', { class: 'lista' }, ...plan.hoy.map(({ t, min }) => {
      const m = modDe(t);
      return el('li', { class: `fila ${urgencia(t, ahora)}` },
        el('span', { class: 'punto', style: `--c:${m.color}` }),
        el('div', { class: 'texto' },
          el('p', { class: 'nombre' }, t.nombre),
          el('p', { class: 'meta' }, el('span', { class: 'mod', style: `--c:${m.color}` }, m.corto),
            el('span', { class: 'cuando' }, cuentaAtras(t.cierre, ahora)), el('span', {}, duracion(min)))),
        el('button', { class: 'capsula', onclick: () => abrir(urlEntrega(t)) }, t.mod === 'quiz' ? 'Hacer' : 'Entregar'));
    }))
    : el('p', { class: 'vacio' }, 'Nada pendiente. Disfruta.'));
  const n = g.hoy.length + g.manana.length + g.semana.length;
  $('#pop-semana').textContent = n ? `Esta semana: ${n} ${n === 1 ? 'entrega' : 'entregas'}, ${duracion(plan.cargaSemana)}` : 'Semana libre';
}

$('#pop-abrir').addEventListener('click', () => abrir(chrome.runtime.getURL('dashboard.html')));
$('#pop-actualizar').addEventListener('click', async () => {
  const b = $('#pop-actualizar');
  b.classList.add('girando'); b.disabled = true;
  await chrome.runtime.sendMessage({ destino: 'fondo', tipo: 'actualizar' }).catch(() => {});
  b.classList.remove('girando'); b.disabled = false;
  pintar();
});
chrome.storage.onChanged.addListener((c, zona) => { if (zona === 'local' && (c.datos || c.marcas)) pintar(); });
pintar();
