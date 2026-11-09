// Genera los Markdown de la carpeta DAW. Puro: recibe datos, devuelve texto.
import { CAMPUS, fmt, modDe, urlCampus, rutaFicha, estado, esExamen, agrupar, porCierre } from './logica.js';

const enlace = ruta => ruta.split('/').map(encodeURIComponent).join('/');
const celda = s => (s || '').replace(/\|/g, '\\|');
const ICONO = { entregada: '✅', hecha: '✅', pendiente: '⏳', vencida: '❌' };

export function fichaMd(t, ruta, adjuntos = []) {
  const carpeta = ruta.split('/').pop().replace(/\.md$/, '');
  const L = [`# ${t.nombre}`, '', `- **Módulo:** ${modDe(t).titulo}`, `- **Sección:** ${t.seccion || '—'}`,
    `- **Apertura:** ${fmt(t.apertura)}`, `- **Cierre:** ${fmt(t.cierre)}`];
  if (t.mod === 'assign') L.push(`- **Estado de la entrega:** ${t.entrega || '—'}`, `- **Calificación:** ${t.calif || '—'}`);
  L.push(`- **En el campus:** ${urlCampus(t)}`, '', '## Enunciado', '', t.enunciado || '_Sin descripción en el campus._', '');
  if (adjuntos.length) L.push('## Archivos adjuntos', '', ...adjuntos.map(n => `- [${n}](${enlace(`${carpeta}/${n}`)})`), '');
  L.push('## Mi solución', '', `_Guarda tu código y notas en la carpeta \`${carpeta}/\`, junto a los adjuntos._`, '');
  return L.join('\n');
}

export function readmeModulo(mod, curso, tareas, marcas, ahora, rutas = {}) {
  const L = [`# ${mod.titulo}`, '', `- **Campus:** ${CAMPUS}/course/view.php?id=${curso.id}`];
  if (curso.aula) L.push(`- **Aula virtual (Teams):** ${curso.aula}`);
  const grupos = [['Exámenes y evaluaciones', tareas.filter(esExamen)], ['Tareas', tareas.filter(t => !esExamen(t))]];
  for (const [titulo, grupo] of grupos) {
    if (!grupo.length) continue;
    L.push('', `## ${titulo}`, '', '| | Cierre | Nombre | Entrega | Calificación |', '|---|---|---|---|---|');
    for (const t of [...grupo].sort(porCierre)) {
      const rel = (rutas[t.id] || rutaFicha(t)).split('/').slice(1).join('/');
      L.push(`| ${ICONO[estado(t, marcas, ahora)]} | ${fmt(t.cierre)} | [${celda(t.nombre)}](${enlace(rel)}) | ${t.entrega || '—'} | ${t.calif || '—'} |`);
    }
  }
  L.push('', '## Apuntes', '', 'Ver [Apuntes/README.md](Apuntes/README.md)', '',
    'Leyenda: ✅ entregada o hecha · ⏳ pendiente · ❌ vencida sin entregar', '');
  return L.join('\n');
}

export function pendientesMd(tareas, marcas, ahora, rutas = {}) {
  const g = agrupar(tareas, marcas, ahora);
  const cab = ['| Cierre | Módulo | Tarea |', '|---|---|---|'];
  const fila = t => {
    const m = modDe(t);
    return `| ${fmt(t.cierre)} | ${m.titulo.split('. ').slice(1).join('. ') || m.titulo} | [${celda(t.nombre)}](${enlace(rutas[t.id] || rutaFicha(t))}) |`;
  };
  return ['# Pendientes', '', `_Generado por el dashboard el ${fmt(ahora)}._`, '',
    '## Próximas entregas (sin entregar)', '', ...cab, ...[...g.hoy, ...g.manana, ...g.semana, ...g.despues].map(fila), '',
    '## Sin fecha o abiertas todo el curso', '', ...cab, ...g.sinfecha.map(fila), '',
    '## Vencidas sin entrega', '', 'Si la entregaste en papel o en clase, márcala como hecha (✓) en el dashboard.', '',
    ...cab, ...g.vencidas.map(fila), ''].join('\n');
}
