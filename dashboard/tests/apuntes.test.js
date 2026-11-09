import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMd, agruparApuntes, sinResumir, tipoApunte, rutaApunte } from '../apuntes.js';

test('parseMd reconoce títulos, listas, código y párrafos', () => {
  const b = parseMd('# Tema 1\n\nTexto con **negrita** y `codigo`.\n\n- uno\n- dos *cursiva*\n\n```php\n<?php echo 1; ?>\n```\n\n1. paso\n2. otro');
  assert.deepEqual(b.map(x => x.tipo), ['h', 'p', 'ul', 'code', 'ol']);
  assert.equal(b[0].nivel, 1);
  assert.deepEqual(b[1].inline, [{ t: 'text', v: 'Texto con ' }, { t: 'b', v: 'negrita' }, { t: 'text', v: ' y ' }, { t: 'code', v: 'codigo' }, { t: 'text', v: '.' }]);
  assert.equal(b[2].items.length, 2);
  assert.deepEqual(b[2].items[1], [{ t: 'text', v: 'dos ' }, { t: 'i', v: 'cursiva' }]);
  assert.equal(b[3].texto, '<?php echo 1; ?>');
  assert.equal(b[3].lang, 'php');
  assert.equal(b[4].items.length, 2);
});

test('parseMd nunca produce HTML: el texto se queda como texto', () => {
  const b = parseMd('<script>alert(1)</script> **<b>x</b>**');
  assert.deepEqual(b[0].inline, [{ t: 'text', v: '<script>alert(1)</script> ' }, { t: 'b', v: '<b>x</b>' }]);
});

test('parseMd ignora comentarios HTML (lista de archivos resumidos)', () => {
  const b = parseMd('<!-- archivos:\na.pdf\n-->\n# Hola');
  assert.deepEqual(b.map(x => x.tipo), ['h']);
});

test('agruparApuntes agrupa por carpeta y oculta índices', () => {
  const g = agruparApuntes([
    { ruta: 'Tema 1.pdf' }, { ruta: 'UD2 PHP/b.pdf' }, { ruta: 'README.md' }, { ruta: 'RESUMEN.md' },
    { ruta: 'UD2 PHP/a.php' }, { ruta: 'A tema.pdf' }, { ruta: 'UD1/x.pdf' },
  ]);
  assert.deepEqual(g.map(x => x.grupo), ['', 'UD1', 'UD2 PHP']);
  assert.deepEqual(g[0].archivos.map(a => a.ruta), ['A tema.pdf', 'Tema 1.pdf']);
  assert.deepEqual(g[2].archivos.map(a => a.ruta), ['UD2 PHP/a.php', 'UD2 PHP/b.pdf']);
});

test('sinResumir usa la lista del resumen, no las fechas (seguro con git)', () => {
  const archivos = [{ ruta: 'a.pdf' }, { ruta: 'UD1/b.pdf' }, { ruta: 'c.pdf' }, { ruta: 'README.md' }, { ruta: 'RESUMEN.md' }];
  const resumen = '<!-- archivos:\na.pdf\nUD1/b.pdf\n-->\n# Resumen';
  assert.deepEqual(sinResumir(archivos, resumen).map(a => a.ruta), ['c.pdf']);
  assert.deepEqual(sinResumir(archivos, null).map(a => a.ruta), ['a.pdf', 'UD1/b.pdf', 'c.pdf']);
});

test('tipoApunte decide cómo abrir cada archivo', () => {
  assert.equal(tipoApunte('Tema.PDF'), 'pdf');
  assert.equal(tipoApunte('fig.jpeg'), 'imagen');
  assert.equal(tipoApunte('index.php'), 'texto');
  assert.equal(tipoApunte('Tema 1.pptx'), 'office');
  assert.equal(tipoApunte('raro.bin'), 'otro');
});

test('rutaApunte coloca recursos y archivos de carpetas del campus', () => {
  assert.equal(rutaApunte('0613-DWES-Entorno-Servidor', 'Tema 1.pdf'), '0613-DWES-Entorno-Servidor/Apuntes/Tema 1.pdf');
  assert.equal(rutaApunte('0613-DWES-Entorno-Servidor', 'a.php', 'UD2 Lenguaje: PHP'), '0613-DWES-Entorno-Servidor/Apuntes/UD2 Lenguaje PHP/a.php');
});
