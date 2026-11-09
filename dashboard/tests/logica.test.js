import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFecha, esExamen, slug, nombreFicha, rutaFicha, rutaLibre, idDeFicha, nombreArchivo,
  estado, franja, cuentaAtras, urlEntrega, esPaginaLogin, agrupar, infoModulo, fmt,
} from '../logica.js';

const T = (o = {}) => ({ id: '1', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Tarea', seccion: '',
  apertura: null, cierre: null, entrega: '', calif: '', enunciado: '', adjuntos: [], ...o });
const ahora = new Date(2026, 10, 10, 9, 0); // martes 10/11/2026 09:00

test('parseFecha lee fechas del campus en español', () => {
  const txt = 'Apertura: jueves, 5 de noviembre de 2026, 09:20 Cierre: martes, 10 de noviembre de 2026, 11:15';
  assert.deepEqual(parseFecha('Apertura', txt), new Date(2026, 10, 5, 9, 20));
  assert.deepEqual(parseFecha('Cierre', txt), new Date(2026, 10, 10, 11, 15));
  assert.deepEqual(parseFecha('Cierre', 'Cierre: miércoles, 18 de noviembre de 2026, 23:59'), new Date(2026, 10, 18, 23, 59));
  assert.equal(parseFecha('Cierre', 'Apertura: jueves, 5 de noviembre de 2026, 09:20'), null);
  assert.equal(parseFecha('Cierre', ''), null);
});

test('esExamen distingue exámenes de tareas', () => {
  assert.ok(esExamen(T({ mod: 'quiz', nombre: 'V&G Review' })));
  assert.ok(esExamen(T({ nombre: 'Evaluación 1B 20%' })));
  assert.ok(esExamen(T({ nombre: 'Prueba final' })));
  assert.ok(!esExamen(T({ nombre: 'Initial review of grammatical topics' })));
  assert.ok(!esExamen(T({ nombre: 'Ejercicios de Tarea Evaluados.' })));
});

test('nombreFicha coincide con las fichas ya generadas', () => {
  assert.equal(nombreFicha(T({ nombre: 'Práctica Update', cierre: new Date(2026, 10, 10, 11, 15).toISOString() })),
    '2026-11-10 - Práctica Update.md');
  assert.equal(nombreFicha(T({ mod: 'quiz', nombre: 'V&amp;G Review' })), 'sin-fecha - V&G Review.md');
  assert.equal(nombreFicha(T({ nombre: 'Unit 2. Past Tenses - Speaking and Grammar Exercises - Deadline: 13/11/2026',
    cierre: new Date(2026, 10, 13, 14, 0).toISOString() })),
    '2026-11-13 - Unit 2. Past Tenses - Speaking and Grammar Exercises - Deadline 131120.md');
  assert.equal(slug('Actividad evaluable 1: “Si tuviera que comprarme un coche…”'), 'Actividad evaluable 1 Si tuviera que comprarme un coche…');
});

test('rutaFicha separa Tareas y Examenes por módulo', () => {
  assert.equal(rutaFicha(T({ nombre: 'Práctica Insert' })), '0613-DWES-Entorno-Servidor/Tareas/sin-fecha - Práctica Insert.md');
  assert.equal(rutaFicha(T({ curso: '759', nombre: 'Evaluación 1 C 20%' })), '0612-DWEC-Entorno-Cliente/Examenes/sin-fecha - Evaluación 1 C 20%.md');
});

test('infoModulo genera una carpeta para módulos desconocidos', () => {
  const m = infoModulo('999', 'DAW - 0000. Módulo nuevo');
  assert.equal(m.titulo, '0000. Módulo nuevo');
  assert.equal(m.carpeta, '0000.-Módulo-nuevo');
});

test('idDeFicha y rutaLibre evitan duplicados (Review Focus 1)', () => {
  assert.equal(idDeFicha('- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68320\n'), '68320');
  assert.equal(idDeFicha('sin enlace'), null);
  const ocupadas = new Set(['A/Tareas/sin-fecha - P1.md']);
  assert.equal(rutaLibre('A/Tareas/sin-fecha - P1.md', '42', ocupadas), 'A/Tareas/sin-fecha - P1 (42).md');
  assert.equal(rutaLibre('A/Tareas/otra.md', '42', ocupadas), 'A/Tareas/otra.md');
});

test('nombreArchivo limpia nombres de adjuntos (Review Focus 3)', () => {
  assert.equal(nombreArchivo('https://x/pluginfile.php/1/mod_assign/introattachment/0/Pr%C3%A1ctica%20Insert.pdf?forcedownload=1'), 'Práctica Insert.pdf');
  assert.equal(nombreArchivo('https://x/a/Task%201.%20Professional%20Profile%20%282%29.pdf'), 'Task 1. Professional Profile.pdf');
  assert.equal(nombreArchivo('https://x/a/raro%3A%3Fnombre%2A.pdf'), 'raronombre.pdf');
});

test('estado: hecha > entregada > vencida > pendiente', () => {
  const pasada = new Date(2026, 10, 3).toISOString();
  assert.equal(estado(T({ id: '5', cierre: pasada }), { 5: '2026-11-04' }, ahora), 'hecha');
  assert.equal(estado(T({ entrega: 'Enviado para calificar', cierre: pasada }), {}, ahora), 'entregada');
  assert.equal(estado(T({ entrega: 'Todavía no se han realizado envíos', cierre: pasada }), {}, ahora), 'vencida');
  assert.equal(estado(T({ cierre: new Date(2026, 10, 13).toISOString() }), {}, ahora), 'pendiente');
});

test('cierres lejanos o sin fecha nunca vencen ni salen hoy (Review Focus 2)', () => {
  const lejos = T({ cierre: new Date(2032, 9, 24).toISOString() });
  assert.equal(estado(lejos, {}, ahora), 'pendiente');
  assert.equal(franja(lejos, ahora), 'sinfecha');
  assert.equal(franja(T(), ahora), 'sinfecha');
});

test('franja agrupa por cercanía', () => {
  assert.equal(franja(T({ cierre: new Date(2026, 10, 10, 11, 15).toISOString() }), ahora), 'hoy');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 11, 23, 59).toISOString() }), ahora), 'manana');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 13, 0, 0).toISOString() }), ahora), 'semana');
  assert.equal(franja(T({ cierre: new Date(2026, 10, 20, 23, 59).toISOString() }), ahora), 'despues');
});

test('cuentaAtras es legible', () => {
  assert.equal(cuentaAtras(new Date(2026, 10, 10, 11, 15).toISOString(), ahora), 'hoy 11:15');
  assert.equal(cuentaAtras(new Date(2026, 10, 11, 23, 59).toISOString(), ahora), 'mañana 23:59');
  assert.equal(cuentaAtras(new Date(2026, 10, 13, 0, 0).toISOString(), ahora), 'en 3 días');
  assert.equal(cuentaAtras(new Date(2026, 10, 20, 23, 59).toISOString(), ahora), '20/11');
  assert.equal(cuentaAtras(new Date(2026, 10, 3).toISOString(), ahora), 'hace 7 días');
  assert.equal(cuentaAtras(null, ahora), 'sin fecha');
  assert.equal(cuentaAtras(new Date(2032, 0, 1).toISOString(), ahora), 'abierta');
});

test('urlEntrega abre el formulario de envío directamente', () => {
  assert.equal(urlEntrega(T({ id: '68288' })), 'https://campus.digitechfp.com/mod/assign/view.php?id=68288&action=editsubmission');
  assert.equal(urlEntrega(T({ id: '7', mod: 'quiz' })), 'https://campus.digitechfp.com/mod/quiz/view.php?id=7');
});

test('esPaginaLogin detecta la redirección al login (Review Focus 4)', () => {
  assert.ok(esPaginaLogin('https://campus.digitechfp.com/login/index.php'));
  assert.ok(!esPaginaLogin('https://campus.digitechfp.com/my/'));
});

test('agrupar filtra, clasifica y ordena', () => {
  const ts = [
    T({ id: 'a', nombre: 'Práctica Update', cierre: new Date(2026, 10, 10, 11, 15).toISOString() }),
    T({ id: 'b', nombre: 'Otra', cierre: new Date(2026, 10, 3).toISOString() }),
    T({ id: 'c', nombre: 'Hecha', entrega: 'Enviado para calificar' }),
    T({ id: 'd', nombre: 'Practica Insert', cierre: new Date(2026, 10, 10, 10, 0).toISOString() }),
  ];
  const g = agrupar(ts, {}, ahora, '');
  assert.deepEqual(g.hoy.map(t => t.id), ['d', 'a']);
  assert.deepEqual(g.vencidas.map(t => t.id), ['b']);
  assert.deepEqual(g.entregadas.map(t => t.id), ['c']);
  assert.deepEqual(agrupar(ts, {}, ahora, 'practica').hoy.map(t => t.id), ['d', 'a']); // sin tildes
  assert.deepEqual(agrupar(ts, {}, ahora, 'servidor').hoy.length, 2);                 // por módulo
});

test('fmt formatea fechas o devuelve una raya', () => {
  assert.equal(fmt(new Date(2026, 10, 10, 9, 5)), '10/11/2026 09:05');
  assert.equal(fmt(null), '—');
});
