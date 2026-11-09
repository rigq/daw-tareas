// Acceso a la carpeta DAW con la File System Access API. Solo navegador.
import { idDeFicha } from './logica.js';

function idb(modo, accion) {
  return new Promise((resolver, rechazar) => {
    const abrir = indexedDB.open('daw-dashboard', 1);
    abrir.onupgradeneeded = () => abrir.result.createObjectStore('kv');
    abrir.onerror = () => rechazar(abrir.error);
    abrir.onsuccess = () => {
      const tx = abrir.result.transaction('kv', modo);
      const req = accion(tx.objectStore('kv'));
      tx.oncomplete = () => resolver(req.result);
      tx.onerror = () => rechazar(tx.error);
    };
  });
}

export const carpetaGuardada = () => idb('readonly', s => s.get('carpeta'));

export async function elegirCarpeta() {
  const h = await window.showDirectoryPicker({ id: 'daw', mode: 'readwrite' });
  await idb('readwrite', s => s.put(h, 'carpeta'));
  return h;
}

export async function tienePermiso(h, pedir = false) {
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission(o)) === 'granted') return true;
  return pedir && (await h.requestPermission(o)) === 'granted';
}

async function directorio(h, partes, crear) {
  for (const p of partes) h = await h.getDirectoryHandle(p, { create: crear });
  return h;
}
const partir = ruta => { const p = ruta.split('/'); return [p.slice(0, -1), p.at(-1)]; };

export async function leer(h, ruta) {
  try {
    const [dirs, nombre] = partir(ruta);
    return await (await (await directorio(h, dirs, false)).getFileHandle(nombre)).getFile().then(f => f.text());
  } catch { return null; }
}

export async function existe(h, ruta) {
  try { const [dirs, nombre] = partir(ruta); await (await directorio(h, dirs, false)).getFileHandle(nombre); return true; }
  catch { return false; }
}

export async function escribir(h, ruta, contenido) {
  const [dirs, nombre] = partir(ruta);
  const w = await (await (await directorio(h, dirs, true)).getFileHandle(nombre, { create: true })).createWritable();
  await w.write(contenido);
  await w.close();
}

export const crearCarpeta = (h, ruta) => directorio(h, ruta.split('/'), true);

// Devuelve el File de una ruta (para abrir apuntes).
export async function archivo(h, ruta) {
  const [dirs, nombre] = partir(ruta);
  return (await (await directorio(h, dirs, false)).getFileHandle(nombre)).getFile();
}

// Lista recursiva de <módulo>/Apuntes: [{ ruta: 'UD1/tema.pdf' }] (rutas relativas a Apuntes/).
export async function listarApuntes(h, carpetaModulo) {
  const out = [];
  let raiz;
  try { raiz = await directorio(h, [carpetaModulo, 'Apuntes'], false); } catch { return out; }
  async function recorrer(dir, prefijo) {
    for await (const [nombre, e] of dir.entries()) {
      if (nombre.startsWith('.')) continue;
      if (e.kind === 'directory') await recorrer(e, `${prefijo}${nombre}/`);
      else out.push({ ruta: `${prefijo}${nombre}` });
    }
  }
  await recorrer(raiz, '');
  return out;
}

export async function fichasExistentes(h) {
  const mapa = new Map();
  for await (const [nombreMod, mod] of h.entries()) {
    if (mod.kind !== 'directory' || nombreMod.startsWith('.')) continue;
    for (const sub of ['Tareas', 'Examenes']) {
      let dir;
      try { dir = await mod.getDirectoryHandle(sub); } catch { continue; }
      for await (const [nombre, f] of dir.entries()) {
        if (f.kind !== 'file' || !nombre.endsWith('.md') || nombre === 'README.md') continue;
        const id = idDeFicha(await (await f.getFile()).text());
        if (id) mapa.set(id, `${nombreMod}/${sub}/${nombre}`);
      }
    }
  }
  return mapa;
}
