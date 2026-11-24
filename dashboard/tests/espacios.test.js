import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baosInicial, ordenarTareas, filtrarTareas, moverTarea, columnaVecina, ideaATarea, resumenFrentes, estadoFecha,
  baosParaInicio, saludo, alternarHabito, racha, ultimosDias, podarHabitos, normalizarUrl, ideaDelDia, IDEAS, tiempoDe } from '../espacios.js';

const hoy = new Date(2026, 10, 24, 10, 0); // martes 24/11/2026

test('Dr. Baos arranca con los frentes del cliente y el vídeo como urgente', () => {
  const b = baosInicial(hoy);
  assert.equal(b.progreso.web, 80);
  assert.ok(b.tareas.some(t => t.frente === 'video' && t.urgente));
  assert.ok(b.ideas.some(i => i.frente === 'chatbot'));
});

test('ordenar: urgentes primero, luego por fecha, sin fecha al final', () => {
  const ts = [{ id: 'a', fecha: '', urgente: false, creada: '1' }, { id: 'b', fecha: '2026-12-01', urgente: false, creada: '1' },
    { id: 'c', fecha: '', urgente: true, creada: '1' }, { id: 'd', fecha: '2026-11-25', urgente: false, creada: '1' }];
  assert.deepEqual(ordenarTareas(ts).map(t => t.id), ['c', 'd', 'b', 'a']);
});

test('filtrar por texto y por frente', () => {
  const b = baosInicial(hoy);
  assert.ok(filtrarTareas(b.tareas, { frente: 'ads' }).every(t => t.frente === 'ads'));
  assert.equal(filtrarTareas(b.tareas, { texto: 'argés' }).length, 1);
});

test('mover tarjetas entre columnas', () => {
  const b = baosInicial(hoy), id = b.tareas[0].id;
  const m = moverTarea(b, id, 'hecho');
  assert.equal(m.tareas[0].col, 'hecho');
  assert.ok(m.tareas[0].hecha);
  assert.equal(b.tareas[0].col, 'hacer'); // inmutable
  assert.equal(columnaVecina('hacer', 1), 'marcha');
  assert.equal(columnaVecina('hacer', -1), 'hacer');
  assert.equal(columnaVecina('hecho', 1), 'hecho');
});

test('una idea pasa a tarea en Por hacer', () => {
  const b = baosInicial(hoy), idea = b.ideas[0];
  const n = ideaATarea(b, idea.id);
  assert.equal(n.ideas.length, 0);
  assert.equal(n.tareas.at(-1).titulo, idea.texto);
  assert.equal(n.tareas.at(-1).col, 'hacer');
});

test('resumen de frentes: progreso manual o calculado', () => {
  const b = baosInicial(hoy);
  const r = resumenFrentes({ ...b, progreso: { web: 80 } });
  assert.equal(r.find(f => f.id === 'web').progreso, 80);
  assert.equal(r.find(f => f.id === 'video').urgentes, 2);
  assert.ok(!r.some(f => f.id === 'otros'));
});

test('estado de la fecha límite', () => {
  assert.equal(estadoFecha('', hoy), null);
  assert.equal(estadoFecha('2026-11-23', hoy).clase, 'vencida');
  assert.equal(estadoFecha('2026-11-24', hoy).texto, 'hoy');
  assert.equal(estadoFecha('2026-11-25', hoy).texto, 'mañana');
  assert.equal(estadoFecha('2026-11-28', hoy).texto, 'en 4 días');
  assert.equal(estadoFecha('2027-01-10', hoy).clase, '');
});

test('Inicio enseña de Dr. Baos lo urgente, lo que está en marcha y lo que vence pronto', () => {
  const b = baosInicial(hoy);
  b.tareas.push({ id: 'x', titulo: 'Lejana', frente: 'seo', col: 'hacer', fecha: '2027-03-01', urgente: false, creada: '0' });
  b.tareas.push({ id: 'y', titulo: 'Pronto', frente: 'seo', col: 'hacer', fecha: '2026-11-26', urgente: false, creada: '0' });
  const v = baosParaInicio(b, hoy, 10);
  assert.ok(v.some(t => t.id === 'y'));
  assert.ok(!v.some(t => t.id === 'x'));
  assert.ok(v[0].urgente);
  assert.ok(v.every(t => t.col !== 'hecho'));
});

test('saludo según la hora', () => {
  assert.equal(saludo(new Date(2026, 0, 1, 9)), 'Buenos días, Riga');
  assert.equal(saludo(new Date(2026, 0, 1, 16)), 'Buenas tardes, Riga');
  assert.equal(saludo(new Date(2026, 0, 1, 23)), 'Buenas noches, Riga');
});

test('hábitos: marcar, racha y últimos días', () => {
  let h = { lista: [{ id: 'a' }], hechos: {} };
  for (const d of ['2026-11-21', '2026-11-22', '2026-11-23']) h = alternarHabito(h, 'a', d);
  assert.equal(racha(h, 'a', '2026-11-24'), 3); // hoy sin hacer: la racha de ayer sigue viva
  h = alternarHabito(h, 'a', '2026-11-24');
  assert.equal(racha(h, 'a', '2026-11-24'), 4);
  h = alternarHabito(h, 'a', '2026-11-24');
  assert.equal(racha(h, 'a', '2026-11-24'), 3);
  assert.deepEqual(ultimosDias(h, 'a', 3, '2026-11-24').map(d => d.hecho), [true, true, false]);
  assert.equal(racha(h, 'a', '2026-12-01'), 0);
  assert.deepEqual(Object.keys(podarHabitos({ hechos: { '2026-01-01': ['a'], '2026-11-20': ['a'] } }, '2026-11-24').hechos), ['2026-11-20']);
});

test('accesos: normalizar direcciones', () => {
  assert.equal(normalizarUrl('github.com'), 'https://github.com/');
  assert.equal(normalizarUrl('http://x.es/a'), 'http://x.es/a');
  assert.equal(normalizarUrl('javascript:alert(1)'), null);
  assert.equal(normalizarUrl('  '), null);
});

test('idea del día: estable en el día y rota con "Otra"', () => {
  assert.equal(ideaDelDia(hoy), ideaDelDia(new Date(2026, 10, 24, 23)));
  assert.notEqual(ideaDelDia(hoy, 0), ideaDelDia(hoy, 1));
  assert.ok(IDEAS.includes(ideaDelDia(hoy, -5)));
});

test('códigos del tiempo', () => {
  assert.equal(tiempoDe(0).texto, 'Despejado');
  assert.equal(tiempoDe(0, 0).icono, '🌙');
  assert.equal(tiempoDe(63).texto, 'Lluvia');
  assert.equal(tiempoDe(95).texto, 'Tormenta');
});
