import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agrupar } from '../logica.js';
import {
  esfuerzoPorDefecto, esfuerzoDe, duracion, planDeHoy, novedades, acumular, fusionarLectura,
  puntuar, insignia, avisos, textoAviso,
} from '../plan.js';

const T = (o = {}) => ({ id: '1', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Tarea', seccion: '',
  apertura: null, cierre: null, entrega: '', calif: '', enunciado: '', adjuntos: [], ...o });
const ahora = new Date(2026, 10, 10, 9, 0); // martes 10/11/2026 09:00
const en = (dias, h = 23, m = 59) => new Date(2026, 10, 10 + dias, h, m).toISOString();

test('esfuerzo por defecto: cuestionario corto, proyecto largo, resto media', () => {
  assert.equal(esfuerzoPorDefecto(T({ mod: 'quiz' })), 's');
  assert.equal(esfuerzoPorDefecto(T({ nombre: 'Proyecto Foro Fase IV Registro' })), 'l');
  assert.equal(esfuerzoPorDefecto(T({ nombre: 'Práctica Arrays' })), 'm');
  assert.equal(esfuerzoDe(T({ id: '9' }), { 9: 's' }), 's');
});

test('duracion en texto', () => {
  assert.equal(duracion(30), '30 min');
  assert.equal(duracion(90), '1 h 30 min');
  assert.equal(duracion(180), '3 h');
});

test('planDeHoy llena el tiempo disponible por orden de cierre', () => {
  const tareas = [
    T({ id: 'a', cierre: en(3), nombre: 'Práctica A' }),                // 90
    T({ id: 'b', cierre: en(0, 14, 30), nombre: 'Proyecto B Fase I' }), // 180, hoy
    T({ id: 'c', cierre: en(1), mod: 'quiz', nombre: 'Test C' }),       // 30, mañana
    T({ id: 'd', cierre: en(10), nombre: 'Práctica D' }),               // 90, más adelante
  ];
  const g = agrupar(tareas, {}, ahora);
  const p = planDeHoy(g, {}, 210);
  assert.deepEqual(p.hoy.map(x => x.t.id), ['b', 'c']);
  assert.deepEqual(p.extra.map(x => x.t.id), ['a', 'd']);
  assert.equal(p.minutosHoy, 210);
  assert.equal(p.cargaSemana, 180 + 30 + 90);
  // La primera tarea entra aunque no quepa
  assert.deepEqual(planDeHoy(g, {}, 10).hoy.map(x => x.t.id), ['b']);
});

test('novedades: tareas nuevas, fechas cambiadas, notas y apuntes', () => {
  const prev = { tareas: [T({ id: 'a', cierre: en(2) }), T({ id: 'b', calif: 'Sin calificar' })], apuntes: [{ id: 'x' }] };
  const next = {
    tareas: [T({ id: 'a', cierre: en(4) }), T({ id: 'b', calif: 'Calificado' }), T({ id: 'c', nombre: 'Nueva' })],
    apuntes: [{ id: 'x' }, { id: 'y', curso: '768', nombre: 'Unit 4' }],
  };
  const n = novedades(prev, next, ahora);
  assert.deepEqual(n.map(x => x.tipo).sort(), ['apunte', 'fecha', 'nota', 'nueva']);
  assert.match(n.find(x => x.tipo === 'fecha').texto, /12\/11\/2026 → 14\/11\/2026/);
  assert.match(n.find(x => x.tipo === 'apunte').texto, /Inglés: Unit 4/);
  assert.deepEqual(novedades(null, next, ahora), []);
});

test('acumular no repite y limita la lista', () => {
  const a = { tipo: 'nueva', id: '1', texto: 'x' };
  assert.equal(acumular([a], [a, { tipo: 'nueva', id: '2', texto: 'y' }]).length, 2);
  assert.equal(acumular([], Array.from({ length: 80 }, (_, i) => ({ tipo: 't', id: String(i), texto: '' }))).length, 60);
});

test('fusionarLectura conserva las tareas que fallaron', () => {
  const prev = { tareas: [T({ id: 'a', nombre: 'Vieja' })], rutas: { a: 'x.md' } };
  const r = fusionarLectura(prev, { tareas: [{ id: 'a', error: true }, T({ id: 'b' }), { id: 'z', error: true }] });
  assert.deepEqual(r.tareas.map(t => t.id), ['a', 'b']);
  assert.equal(r.tareas[0].nombre, 'Vieja');
  assert.equal(r.fallos, 2);
  assert.deepEqual(r.rutas, { a: 'x.md' });
});

test('puntuar: subcadena primero, luego letras en orden, sin tildes', () => {
  assert.ok(puntuar('foro', 'Proyecto Foro Fase IV') > puntuar('pff', 'Proyecto Foro Fase IV'));
  assert.ok(puntuar('pff', 'Proyecto Foro Fase IV') > 0);
  assert.ok(puntuar('ingles', 'Inglés') > 0);
  assert.equal(puntuar('xyz', 'Proyecto'), 0);
});

test('insignia: hoy en rojo, si no mañana en naranja', () => {
  assert.equal(insignia([T({ cierre: en(0, 14) })], {}, ahora).texto, '1');
  const m = insignia([T({ cierre: en(1) })], {}, ahora);
  assert.equal(m.texto, '1');
  assert.equal(m.color, '#ff9500');
  assert.equal(insignia([T({ cierre: en(5) })], {}, ahora).texto, '');
  assert.equal(insignia([T({ cierre: en(0, 14) })], { 1: { hecha: true, t: '' } }, ahora).texto, '');
});

test('avisos a 24 h y 2 h solo para pendientes próximas', () => {
  const tareas = [
    T({ id: 'a', cierre: en(2, 12, 0) }),
    T({ id: 'b', cierre: en(0, 10, 0) }),               // dentro de 1 h: ya pasó el aviso de 2 h
    T({ id: 'c', cierre: en(20) }),                     // demasiado lejos
    T({ id: 'd', cierre: en(2), entrega: 'Enviado' }),  // ya entregada
  ];
  const a = avisos(tareas, {}, ahora);
  assert.deepEqual(a.map(x => x.nombre), ['aviso|a|1440', 'aviso|a|120']);
  assert.match(textoAviso(tareas[0], 120).mensaje, /a las 12:00/);
});
