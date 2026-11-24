// Pestaña Dr. Baos: frentes del cliente con su progreso, tablero Kanban y muro de ideas.
import { el, almacen, icono, ICONOS, abrirExterno } from './dom.js';
import { FRENTES, CLINICAS, COLUMNAS, baosInicial, ordenarTareas, filtrarTareas, moverTarea, columnaVecina,
  ideaATarea, resumenFrentes, estadoFecha, nuevoId, diaIso } from './espacios.js';

const WEB = 'https://clinicadentaldrbaos.com';
const est = { baos: null, frente: '', filtro: '', cont: null, arrastrando: null };

export async function cargarBaos() {
  if (!est.baos) {
    est.baos = (await almacen.get('baos')) || null;
    if (!est.baos) { est.baos = baosInicial(); await almacen.set('baos', est.baos); }
  }
  return est.baos;
}

async function guardar(nuevo) {
  est.baos = nuevo;
  await almacen.set('baos', nuevo);
  repintar();
}

// Otra pestaña abierta cambió los datos: recoger el cambio.
export function baosCambiado(valor) { if (valor) { est.baos = valor; repintar(); } }

function repintar() { if (est.cont && !est.cont.hidden) pintarBaos(est.cont, { filtro: est.filtro }); }

export async function pintarBaos(cont, { filtro = '' } = {}) {
  est.cont = cont; est.filtro = filtro;
  const baos = await cargarBaos();
  const pendientes = baos.tareas.filter(t => t.col !== 'hecho');
  const urgentes = pendientes.filter(t => t.urgente).length;
  cont.replaceChildren(
    el('div', { class: 'baos-cab' },
      el('div', { class: 'baos-cliente' },
        el('span', { class: 'baos-logo', 'aria-hidden': 'true' }, '🦷'),
        el('div', {},
          el('p', { class: 'baos-nombre' }, 'Clínica Dental Dr. Baos'),
          el('p', { class: 'baos-sub' }, `Majadahonda · Argés (Toledo) — ${pendientes.length} pendientes`,
            urgentes ? el('span', { class: 'etiqueta urgente' }, `${urgentes} urgente${urgentes > 1 ? 's' : ''}`) : null))),
      el('div', { class: 'baos-acciones' },
        el('button', { class: 'capsula', onclick: () => abrirExterno(WEB) }, 'Ver web'),
        el('button', { class: 'capsula', onclick: () => editarIdea() }, icono(ICONOS.bombilla), 'Idea'),
        el('button', { class: 'capsula principal', onclick: () => editarTarea() }, icono(ICONOS.mas), 'Tarea'))),
    pintarFrentes(baos),
    pintarTablero(baos),
  );
}

// ---------- frentes ----------
function pintarFrentes(baos) {
  return el('div', { class: 'frentes', role: 'list' }, ...resumenFrentes(baos).map(f => {
    const activo = est.frente === f.id;
    const barra = el('input', { type: 'range', min: '0', max: '100', step: '5', value: String(f.progreso), class: 'barra-progreso',
      style: `--c:${f.color};--p:${f.progreso}%`, 'aria-label': `Progreso de ${f.nombre}`,
      onclick: e => e.stopPropagation(),
      oninput: e => { e.target.style.setProperty('--p', `${e.target.value}%`); e.target.closest('.frente').querySelector('.frente-pct').textContent = `${e.target.value} %`; },
      onchange: e => guardar({ ...baos, progreso: { ...baos.progreso, [f.id]: Number(e.target.value) } }) });
    return el('div', { class: `frente vidrio${activo ? ' activo' : ''}`, role: 'listitem', style: `--c:${f.color}`, tabindex: '0',
      title: activo ? 'Ver todos los frentes' : `Ver solo ${f.nombre}`,
      onclick: () => { est.frente = activo ? '' : f.id; repintar(); },
      onkeydown: e => { if (e.key === 'Enter' && e.target === e.currentTarget) e.currentTarget.click(); } },
      el('div', { class: 'frente-cab' },
        el('span', { class: 'frente-emoji', 'aria-hidden': 'true' }, f.emoji),
        el('span', { class: 'frente-nombre' }, f.nombre),
        el('span', { class: 'frente-pct' }, `${f.progreso} %`)),
      barra,
      el('p', { class: 'frente-meta' }, f.pendientes ? `${f.pendientes} pendiente${f.pendientes > 1 ? 's' : ''}` : 'Al día',
        f.urgentes ? el('span', { class: 'etiqueta urgente' }, '¡urgente!') : null));
  }));
}

// ---------- tablero ----------
function pintarTablero(baos) {
  const visibles = filtrarTareas(baos.tareas, { texto: est.filtro, frente: est.frente });
  const columnas = Object.entries(COLUMNAS).map(([col, nombre]) => {
    let ts = ordenarTareas(visibles.filter(t => t.col === col));
    if (col === 'hecho') ts = ts.sort((a, b) => (b.hecha || '').localeCompare(a.hecha || ''));
    const lista = el('ul', { class: 'kanban-lista' }, ...ts.map(t => tarjeta(t)));
    if (!ts.length) lista.append(el('li', { class: 'kanban-vacio' }, col === 'hecho' ? 'Aquí irá lo terminado 💪' : 'Nada por aquí'));
    const colEl = el('section', { class: `kanban-col col-${col}`, 'aria-label': nombre, 'data-col': col,
      ondragover: e => { if (est.arrastrando) { e.preventDefault(); colEl.classList.add('encima'); } },
      ondragleave: e => { if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('encima'); },
      ondrop: e => { e.preventDefault(); colEl.classList.remove('encima'); const id = est.arrastrando; est.arrastrando = null;
        if (id && baos.tareas.find(t => t.id === id)?.col !== col) guardar(moverTarea(baos, id, col)); } },
      el('header', { class: 'kanban-cab' }, el('h2', {}, nombre), el('span', { class: 'contador' }, String(ts.length)),
        col === 'hecho' && ts.length ? el('button', { class: 'texto-boton', title: 'Borrar las tareas hechas',
          onclick: () => { if (confirm(`¿Borrar ${ts.length} tareas hechas?`)) guardar({ ...baos, tareas: baos.tareas.filter(t => !ts.includes(t)) }); } }, 'Limpiar') : null),
      lista,
      col !== 'hecho' ? anadirRapido(baos, col) : null);
    return colEl;
  });
  return el('div', { class: 'kanban' }, ...columnas, pintarIdeas(baos));
}

function anadirRapido(baos, col) {
  const input = el('input', { type: 'text', placeholder: '+ Añadir tarea', 'aria-label': `Añadir tarea en ${COLUMNAS[col]}`,
    onkeydown: e => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      guardar({ ...baos, tareas: [...baos.tareas, { id: nuevoId(), titulo: e.target.value.trim(), frente: est.frente || 'otros', col,
        clinica: 'ambas', urgente: false, fecha: '', notas: '', creada: diaIso() }] })
        .then(() => est.cont.querySelector(`.col-${col} .anadir input`)?.focus());
    } });
  return el('div', { class: 'anadir' }, input);
}

function tarjeta(t) {
  const f = FRENTES[t.frente] || FRENTES.otros;
  const fecha = t.col !== 'hecho' ? estadoFecha(t.fecha) : null;
  const mover = paso => { const col = columnaVecina(t.col, paso); if (col !== t.col) guardar(moverTarea(est.baos, t.id, col)); };
  return el('li', { class: `tarjeta${t.urgente && t.col !== 'hecho' ? ' es-urgente' : ''}${t.col === 'hecho' ? ' hecha' : ''}`,
    style: `--c:${f.color}`, draggable: 'true', tabindex: '0', 'data-id': t.id,
    'aria-label': `${t.titulo}. ${f.nombre}. Enter para editar, flechas izquierda y derecha para mover.`,
    ondragstart: e => { est.arrastrando = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); e.currentTarget.classList.add('arrastrando'); },
    ondragend: e => { e.currentTarget.classList.remove('arrastrando'); est.arrastrando = null; },
    onclick: e => { if (!e.target.closest('button')) editarTarea(t); },
    onkeydown: e => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter') { e.preventDefault(); editarTarea(t); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
    } },
    el('p', { class: 'tarjeta-titulo' }, t.urgente && t.col !== 'hecho' ? '🔥 ' : '', t.titulo),
    t.notas ? el('p', { class: 'tarjeta-notas' }, t.notas) : null,
    el('div', { class: 'tarjeta-meta' },
      el('span', { class: 'etiqueta frente-tag' }, f.emoji, ' ', f.nombre),
      t.clinica && t.clinica !== 'ambas' ? el('span', { class: 'etiqueta' }, CLINICAS[t.clinica]) : null,
      fecha ? el('span', { class: `etiqueta fecha ${fecha.clase}` }, fecha.texto) : null,
      el('span', { class: 'tarjeta-mover' },
        t.col !== 'hacer' ? el('button', { title: 'Mover a la izquierda', 'aria-label': 'Mover a la izquierda', onclick: () => mover(-1) }, icono(ICONOS.izq)) : null,
        t.col !== 'hecho' ? el('button', { title: t.col === 'marcha' ? 'Marcar como hecha' : 'Empezar', 'aria-label': 'Mover a la derecha', onclick: () => mover(1) },
          icono(t.col === 'marcha' ? ICONOS.check : ICONOS.der)) : null)));
}

// ---------- ideas ----------
function pintarIdeas(baos) {
  const q = est.filtro.trim().toLowerCase();
  const ideas = baos.ideas.filter(i => (!est.frente || i.frente === est.frente) && (!q || i.texto.toLowerCase().includes(q)));
  return el('section', { class: 'kanban-col col-ideas', 'aria-label': 'Ideas' },
    el('header', { class: 'kanban-cab' }, el('h2', {}, '💡 Ideas'), el('span', { class: 'contador' }, String(ideas.length))),
    el('div', { class: 'anadir' }, el('input', { type: 'text', placeholder: '+ Apunta una idea', 'aria-label': 'Nueva idea',
      onkeydown: e => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        guardar({ ...baos, ideas: [{ id: nuevoId(), texto: e.target.value.trim(), frente: est.frente || 'otros', creada: diaIso() }, ...baos.ideas] })
          .then(() => est.cont.querySelector('.col-ideas .anadir input')?.focus());
      } })),
    el('ul', { class: 'ideas' }, ...ideas.map(i => {
      const f = FRENTES[i.frente] || FRENTES.otros;
      return el('li', { class: 'postit', style: `--c:${f.color}` },
        el('p', {}, i.texto),
        el('div', { class: 'postit-pie' },
          el('span', { class: 'postit-frente' }, f.emoji, ' ', f.nombre),
          el('button', { title: 'Editar', 'aria-label': 'Editar idea', onclick: () => editarIdea(i) }, icono(ICONOS.editar)),
          el('button', { title: 'Borrar', 'aria-label': 'Borrar idea', onclick: () => guardar({ ...baos, ideas: baos.ideas.filter(x => x.id !== i.id) }) }, icono(ICONOS.borrar)),
          el('button', { class: 'a-tarea', title: 'Convertir en tarea', onclick: () => guardar(ideaATarea(baos, i.id)) }, 'A tarea', icono(ICONOS.flecha))));
    }), ideas.length ? null : el('li', { class: 'kanban-vacio' }, 'Sin ideas todavía')));
}

// ---------- diálogos ----------
function opciones(obj, sel) {
  return Object.entries(obj).map(([v, n]) => el('option', { value: v, selected: v === sel }, typeof n === 'string' ? n : `${n.emoji} ${n.nombre}`));
}

function dialogo(titulo, campos, { alGuardar, alBorrar }) {
  document.getElementById('dialogo-baos')?.remove();
  // El submit oculto hace que Enter en un campo guarde.
  const form = el('form', { method: 'dialog', class: 'form-baos' }, ...campos, el('button', { type: 'submit', hidden: true, tabindex: '-1' }));
  const d = el('dialog', { id: 'dialogo-baos', 'aria-label': titulo },
    el('div', { class: 'hoja-cab' },
      el('button', { type: 'button', class: 'texto', style: 'justify-self:start', onclick: () => d.close() }, 'Cancelar'),
      el('h2', {}, titulo),
      el('button', { type: 'button', class: 'texto', onclick: () => form.requestSubmit() }, 'Guardar')),
    form,
    alBorrar ? el('button', { type: 'button', class: 'celda accion peligro', onclick: () => { if (confirm('¿Borrar?')) { alBorrar(); d.close(); } } }, 'Borrar') : null);
  form.addEventListener('submit', e => {
    const datos = Object.fromEntries(new FormData(form));
    if (!String(datos.titulo ?? datos.texto ?? '').trim()) { e.preventDefault(); form.querySelector('input,textarea')?.focus(); return; }
    alGuardar(datos);
  });
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

const campo = (etiqueta, control) => el('label', { class: 'campo' }, el('span', {}, etiqueta), control);

export async function editarTarea(t = null) {
  const baos = await cargarBaos();
  const nueva = !t;
  t ||= { titulo: '', frente: est.frente || 'otros', col: 'hacer', clinica: 'ambas', urgente: false, fecha: '', notas: '' };
  dialogo(nueva ? 'Nueva tarea' : 'Tarea', [
    campo('Qué hay que hacer', el('input', { name: 'titulo', value: t.titulo, required: true, autofocus: true, autocomplete: 'off' })),
    el('div', { class: 'campos-fila' },
      campo('Frente', el('select', { name: 'frente' }, ...opciones(FRENTES, t.frente))),
      campo('Clínica', el('select', { name: 'clinica' }, ...opciones(CLINICAS, t.clinica)))),
    el('div', { class: 'campos-fila' },
      campo('Estado', el('select', { name: 'col' }, ...opciones(COLUMNAS, t.col))),
      campo('Fecha límite', el('input', { type: 'date', name: 'fecha', value: t.fecha || '' }))),
    el('label', { class: 'campo-check' }, el('input', { type: 'checkbox', name: 'urgente', checked: t.urgente }), '🔥 Urgente'),
    campo('Notas', el('textarea', { name: 'notas', rows: '3' }, t.notas || '')),
  ], {
    alGuardar: d => {
      const datos = { titulo: d.titulo.trim(), frente: d.frente, clinica: d.clinica, col: d.col, fecha: d.fecha, urgente: !!d.urgente, notas: d.notas.trim() };
      if (nueva) guardar({ ...baos, tareas: [...baos.tareas, { id: nuevoId(), creada: diaIso(), ...datos, hecha: d.col === 'hecho' ? diaIso() : undefined }] });
      else guardar({ ...baos, tareas: baos.tareas.map(x => x.id === t.id ? { ...x, ...datos, hecha: d.col === 'hecho' ? (x.hecha || diaIso()) : undefined } : x) });
    },
    alBorrar: nueva ? null : () => guardar({ ...baos, tareas: baos.tareas.filter(x => x.id !== t.id) }),
  });
}

export async function editarIdea(i = null) {
  const baos = await cargarBaos();
  const nueva = !i;
  i ||= { texto: '', frente: est.frente || 'otros' };
  dialogo(nueva ? 'Nueva idea' : 'Idea', [
    campo('La idea', el('textarea', { name: 'texto', rows: '3', required: true, autofocus: true }, i.texto)),
    campo('Frente', el('select', { name: 'frente' }, ...opciones(FRENTES, i.frente))),
  ], {
    alGuardar: d => {
      const datos = { texto: d.texto.trim(), frente: d.frente };
      if (nueva) guardar({ ...baos, ideas: [{ id: nuevoId(), creada: diaIso(), ...datos }, ...baos.ideas] });
      else guardar({ ...baos, ideas: baos.ideas.map(x => x.id === i.id ? { ...x, ...datos } : x) });
    },
    alBorrar: nueva ? null : () => guardar({ ...baos, ideas: baos.ideas.filter(x => x.id !== i.id) }),
  });
}
