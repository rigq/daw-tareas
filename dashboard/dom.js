// Ayudantes de interfaz compartidos por las vistas.
export const $ = s => document.querySelector(s);

export const almacen = {
  get: async k => (await chrome.storage.local.get(k))[k],
  set: (k, v) => chrome.storage.local.set({ [k]: v }),
};

export function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...hijos.flat().filter(h => h != null && h !== false)); // strings → nodos de texto (nunca HTML)
  return e;
}

export function abrirExterno(url) {
  el('a', { href: url, target: '_blank', rel: 'noopener' }).click();
}

export const icono = d => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d); s.append(p);
  return s;
};
export const ICONOS = {
  mas: 'M12 5v14M5 12h14',
  borrar: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  izq: 'M15 6l-6 6 6 6',
  der: 'M9 6l6 6-6 6',
  check: 'M5 12l5 5L20 7',
  bombilla: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  flecha: 'M5 12h14M13 6l6 6-6 6',
};
