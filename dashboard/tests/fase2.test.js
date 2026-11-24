import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clasesDelDia, proximaClase, cuandoEmpieza, examenes, diasHasta, anillos, resumenSemana, generarIcs,
  requisitos, promptClaude, parseNota, mediasPorAsignatura,
} from '../plan.js';
import { extraerTarjetas, sesionDeRepaso, responder, pendientesDeRepaso, buscarEnResumenes } from '../estudio.js';

const T = (o = {}) => ({ id: '1', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Tarea', seccion: '',
  apertura: null, cierre: null, entrega: '', calif: '', enunciado: '', adjuntos: [], ...o });
const ahora = new Date(2026, 10, 10, 9, 0); // martes 10/11/2026 09:00
const en = (dias, h = 23, m = 59) => new Date(2026, 10, 10 + dias, h, m).toISOString();
const horario = [
  { curso: '761', dia: 2, inicio: '16:00', fin: '18:00' }, // martes
  { curso: '768', dia: 2, inicio: '10:00', fin: '11:00' }, // martes
  { curso: '759', dia: 4, inicio: '16:00', fin: '18:00' }, // jueves
];

test('clasesDelDia y proximaClase', () => {
  assert.deepEqual(clasesDelDia(horario, ahora).map(c => c.curso), ['768', '761']);
  const p = proximaClase(horario, ahora);
  assert.equal(p.curso, '768');
  assert.equal(p.enCurso, false);
  assert.equal(proximaClase(horario, new Date(2026, 10, 10, 10, 30)).enCurso, true);
  assert.equal(proximaClase(horario, new Date(2026, 10, 10, 19, 0)).curso, '759'); // ya pasó todo el martes
  assert.equal(proximaClase([], ahora), null);
});

test('cuandoEmpieza en lenguaje natural', () => {
  assert.equal(cuandoEmpieza(new Date(2026, 10, 10, 9, 40), ahora), 'en 40 min');
  assert.equal(cuandoEmpieza(new Date(2026, 10, 10, 16, 0), ahora), 'hoy a las 16:00');
  assert.equal(cuandoEmpieza(new Date(2026, 10, 11, 16, 0), ahora), 'mañana a las 16:00');
  assert.match(cuandoEmpieza(new Date(2026, 10, 12, 16, 0), ahora), /jueves a las 16:00/);
});

test('examenes pendientes ordenados y días que faltan', () => {
  const tareas = [T({ id: 'a', mod: 'quiz', nombre: 'Test', cierre: en(5) }), T({ id: 'b', nombre: 'Examen UD1', cierre: en(2) }),
    T({ id: 'c', nombre: 'Práctica', cierre: en(1) }), T({ id: 'd', mod: 'quiz', cierre: en(-1) })];
  assert.deepEqual(examenes(tareas, {}, ahora).map(t => t.id), ['b', 'a']);
  assert.equal(diasHasta(en(2), ahora), 2);
  assert.equal(diasHasta(en(0, 8), ahora), 0);
});

test('anillos: hechas hoy, minutos de foco y racha', () => {
  const ayer = new Date(2026, 10, 9, 12).toISOString(), hoy = new Date(2026, 10, 10, 8).toISOString();
  const marcas = { a: { hecha: true, t: hoy }, b: { hecha: true, t: ayer }, c: { hecha: false, t: hoy } };
  const foco = { '2026-11-08': 30, '2026-11-10': 40 };
  const r = anillos({ marcas, foco, pendientesHoy: 2, ahora });
  assert.deepEqual(r.entregas, { hechas: 1, objetivo: 3 });
  assert.equal(r.foco.minutos, 40);
  assert.equal(r.racha, 3); // 8 (foco), 9 (hecha) y 10 (hecha)
  assert.equal(anillos({ marcas: { b: { hecha: true, t: ayer } }, ahora }).racha, 1); // hoy aún no cuenta
});

test('resumenSemana', () => {
  const r = resumenSemana({ tareas: [T({ id: 'x', cierre: en(3) }), T({ id: 'y', cierre: en(20) })],
    marcas: { z: { hecha: true, t: new Date(2026, 10, 8).toISOString() } }, foco: { '2026-11-09': 50 }, ahora });
  assert.equal(r.hechas, 1);
  assert.equal(r.minutosFoco, 50);
  assert.deepEqual(r.proximas.map(t => t.id), ['x']);
  assert.equal(r.cargaProxima, 90);
});

test('generarIcs crea un evento por entrega pendiente', () => {
  const ics = generarIcs([T({ id: 'a', nombre: 'Práctica, con; comas', cierre: en(2, 14, 30) }), T({ id: 'b' })], {}, ahora, () => 'https://x');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
  assert.match(ics, /SUMMARY:Entrega: Práctica\\, con\\; comas \(Servidor\)/);
  assert.match(ics, /TRIGGER:-PT24H/);
  assert.ok(ics.split('\r\n').every(l => l.length <= 75));
});

test('requisitos: frases del enunciado que hablan de la entrega', () => {
  const r = requisitos('Introducción al tema.\nEntrega un archivo .zip con tu código.\nEl nombre del archivo será Apellido_Nombre.\nDisfruta.');
  assert.deepEqual(r, ['Entrega un archivo .zip con tu código.', 'El nombre del archivo será Apellido_Nombre.']);
  assert.deepEqual(requisitos(''), []);
  assert.deepEqual(requisitos('Professional Profile (2).pdf\nSube el PDF a Moodle antes del viernes.'), ['Sube el PDF a Moodle antes del viernes.']);
});

test('promptClaude incluye el enunciado, la fecha y la carpeta', () => {
  const p = promptClaude(T({ nombre: 'Foro', enunciado: 'Haz un login', cierre: en(1, 14, 30), adjuntos: [{ nombre: 'a.pdf' }] }), 'C:/DAW/x');
  assert.match(p, /«Foro»/);
  assert.match(p, /Haz un login/);
  assert.match(p, /11\/11\/2026 14:30/);
  assert.match(p, /C:\/DAW\/x/);
  assert.match(p, /- a\.pdf/);
});

test('parseNota y medias por asignatura', () => {
  assert.deepEqual(parseNota('8,50 / 10,00'), { valor: 8.5, max: 10 });
  assert.deepEqual(parseNota('Calificación: 7/10'), { valor: 7, max: 10 });
  assert.equal(parseNota('Sin calificar'), null);
  const m = mediasPorAsignatura([T({ nota: { valor: 8, max: 10 } }), T({ nota: { valor: 3, max: 5 } }), T({})]);
  assert.equal(m.Servidor.n, 2);
  assert.equal(m.Servidor.media, 7);
});

const MD = `# Tema
## Servidores
| Servidor | Claves |
|---|---|
| **Apache** | Libre y modular |
| Nginx | Rápido |

## Comparativa
| Present Simple | Present Continuous |
|---|---|
| Una frase muy larga que no es un término sino una explicación completa | Otra frase |

- **HTTP**: protocolo de transferencia de hipertexto.
- **TCP** (capa 4): transporte fiable.
- Sin negrita: no es tarjeta.`;

test('extraerTarjetas de tablas de términos y viñetas con negrita', () => {
  const t = extraerTarjetas('mod', MD);
  assert.deepEqual(t.map(x => x.anverso), ['**Apache**', 'Nginx', 'HTTP', 'TCP (capa 4)']);
  assert.deepEqual(t[0].reverso, [{ etiqueta: 'Claves', valor: 'Libre y modular' }]);
  assert.equal(t[0].tema, 'Servidores');
  assert.equal(new Set(t.map(x => x.id)).size, 4);
  assert.equal(extraerTarjetas('mod', MD)[2].id, t[2].id); // id estable
});

test('repaso Leitner: nuevas, aciertos y fallos', () => {
  const t = extraerTarjetas('mod', MD);
  let prog = {};
  assert.equal(sesionDeRepaso(t, prog, ahora, 2).length, 2);
  prog = responder(prog, t[0].id, true, ahora);
  assert.deepEqual(prog[t[0].id], { caja: 1, proximo: '2026-11-11' });
  prog = responder(prog, t[0].id, true, new Date(2026, 10, 11));
  assert.deepEqual(prog[t[0].id], { caja: 2, proximo: '2026-11-14' });
  prog = responder(prog, t[0].id, false, new Date(2026, 10, 14));
  assert.equal(prog[t[0].id].caja, 1);
  assert.equal(pendientesDeRepaso(t, prog, new Date(2026, 10, 15)), 1);
  assert.equal(sesionDeRepaso(t, prog, new Date(2026, 10, 15), 0)[0].id, t[0].id);
});

test('buscarEnResumenes encuentra fragmentos y el tema', () => {
  const r = buscarEnResumenes([{ modulo: 'mod', texto: MD }], 'transporte');
  assert.equal(r.length, 1);
  assert.equal(r[0].tema, 'Comparativa');
  assert.match(r[0].fragmento, /TCP/);
  assert.equal(buscarEnResumenes([{ modulo: 'mod', texto: MD }], 'nginx')[0].tema, 'Servidores');
  assert.deepEqual(buscarEnResumenes([{ modulo: 'mod', texto: MD }], 'x'), []);
});
