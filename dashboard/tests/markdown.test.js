import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fichaMd, readmeModulo, pendientesMd } from '../markdown.js';
import { MODULOS } from '../logica.js';

const ahora = new Date(2026, 10, 10, 9, 0);
const T = (o = {}) => ({ id: '68288', curso: '761', cursoNombre: '', mod: 'assign', nombre: 'Práctica Update',
  seccion: '1ª Evaluación', apertura: new Date(2026, 10, 5, 9, 20).toISOString(),
  cierre: new Date(2026, 10, 10, 11, 15).toISOString(), entrega: 'Todavía no se han realizado envíos',
  calif: 'Sin calificar', enunciado: 'Línea 1\nLínea 2', adjuntos: [], ...o });

test('fichaMd sigue el formato de las fichas existentes', () => {
  const md = fichaMd(T(), '0613-DWES-Entorno-Servidor/Tareas/2026-11-10 - Práctica Update.md', ['practica_update.pdf']);
  assert.ok(md.startsWith('# Práctica Update\n\n- **Módulo:** 0613. Desarrollo web en entorno servidor\n'));
  assert.ok(md.includes('- **Apertura:** 05/11/2026 09:20\n- **Cierre:** 10/11/2026 11:15\n'));
  assert.ok(md.includes('- **Estado de la entrega:** Todavía no se han realizado envíos\n- **Calificación:** Sin calificar\n'));
  assert.ok(md.includes('- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68288\n'));
  assert.ok(md.includes('## Enunciado\n\nLínea 1\nLínea 2\n'));
  assert.ok(md.includes('- [practica_update.pdf](2026-11-10%20-%20Pr%C3%A1ctica%20Update/practica_update.pdf)'));
  assert.ok(md.includes('carpeta `2026-11-10 - Práctica Update/`'));
});

test('fichaMd de un cuestionario no lleva estado de entrega', () => {
  const md = fichaMd(T({ mod: 'quiz', entrega: '', calif: '' }), 'X/Examenes/a.md', []);
  assert.ok(!md.includes('Estado de la entrega'));
  assert.ok(!md.includes('## Archivos adjuntos'));
});

test('fichaMd conserva literalmente el HTML del enunciado (Review Focus 5)', () => {
  const md = fichaMd(T({ enunciado: '<script>alert(1)</script> <?php echo $x; ?>' }), 'X/Tareas/a.md', []);
  assert.ok(md.includes('<script>alert(1)</script> <?php echo $x; ?>'));
});

test('readmeModulo lista tareas con iconos y enlaces relativos', () => {
  const ts = [T(), T({ id: '2', nombre: 'Vieja', cierre: new Date(2026, 9, 1).toISOString() }),
    T({ id: '3', nombre: 'Hecha | con barra', entrega: 'Enviado para calificar' })];
  const md = readmeModulo(MODULOS['761'], { id: '761', aula: 'https://teams.microsoft.com/meet/1' }, ts, {}, ahora,
    { 68288: '0613-DWES-Entorno-Servidor/Tareas/2026-11-10 - Práctica Update.md' });
  assert.ok(md.startsWith('# 0613. Desarrollo web en entorno servidor\n\n- **Campus:** https://campus.digitechfp.com/course/view.php?id=761\n- **Aula virtual (Teams):** https://teams.microsoft.com/meet/1\n'));
  assert.ok(md.includes('| ⏳ | 10/11/2026 11:15 | [Práctica Update](Tareas/2026-11-10%20-%20Pr%C3%A1ctica%20Update.md) |'));
  assert.ok(md.includes('| ❌ | 01/10/2026 00:00 | [Vieja]'));
  assert.ok(md.includes('[Hecha \\| con barra]'));
  assert.ok(md.indexOf('Vieja') < md.indexOf('Práctica Update')); // ordenado por cierre
});

test('pendientesMd separa próximas, sin fecha y vencidas, y respeta las marcas', () => {
  const ts = [T(), T({ id: '2', nombre: 'Vieja', cierre: new Date(2026, 9, 1).toISOString() }),
    T({ id: '3', nombre: 'Abierta', cierre: new Date(2032, 0, 1).toISOString() }),
    T({ id: '4', nombre: 'En papel', cierre: new Date(2026, 9, 2).toISOString() })];
  const md = pendientesMd(ts, { 4: '2026-11-01' }, ahora, {});
  const [proximas, resto] = md.split('## Sin fecha');
  assert.ok(proximas.includes('Práctica Update'));
  assert.ok(resto.split('## Vencidas')[0].includes('Abierta'));
  assert.ok(resto.split('## Vencidas')[1].includes('Vieja'));
  assert.ok(!md.includes('En papel'));
});
