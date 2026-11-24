<?php
// Página principal del foro: cambia según el visitante esté o no conectado.
const RUTA_BASE = '';
require __DIR__ . '/includes/auth.php';

// Los temas todavía no están en base de datos (fases posteriores): datos de muestra.
$temas = [
    ['titulo' => 'Bienvenida: preséntate a la comunidad', 'autor' => 'admin',  'respuestas' => 12],
    ['titulo' => '¿Cómo se configura XAMPP para PHP 8?',   'autor' => 'ana_dev', 'respuestas' => 5],
    ['titulo' => 'Dudas sobre sesiones y cookies',         'autor' => 'luis99',  'respuestas' => 8],
];

$visita = estaConectado() ? ultimaVisita() : null;

$titulo = 'Inicio';
require __DIR__ . '/includes/cabecera.php';
?>
<section class="tarjeta">
<?php if (estaConectado()): ?>
  <h1>Hola, <?= e($_SESSION['usuario']) ?></h1>
  <p>
    <?php if ($visita !== null): ?>
      Tu última visita fue el <strong><?= e($visita->format('d/m/Y')) ?></strong>
      a las <strong><?= e($visita->format('H:i')) ?></strong>.
    <?php else: ?>
      Es tu primera visita. ¡Bienvenido al foro!
    <?php endif; ?>
  </p>
<?php else: ?>
  <h1>Bienvenido al Foro DAW</h1>
  <p>Un espacio para que los alumnos de Desarrollo Web en Entorno Servidor compartan dudas,
     recursos y proyectos. Puedes leer los temas sin cuenta, pero para participar necesitas
     <a href="usuarios/registro.php">registrarte</a>. ¿Ya tienes cuenta?
     <a href="usuarios/login.php">Inicia sesión</a>.</p>
<?php endif; ?>
</section>

<section class="tarjeta">
  <div class="cabecera-lista">
    <h2>Temas</h2>
    <?php if (estaConectado()): ?>
      <button type="button" disabled title="Próximamente">Nuevo tema</button>
      <small>Próximamente</small>
    <?php endif; ?>
  </div>
  <ul class="temas">
    <?php foreach ($temas as $t): ?>
      <li>
        <span class="tema-titulo"><?= e($t['titulo']) ?></span>
        <span class="tema-meta">por <?= e($t['autor']) ?> · <?= (int) $t['respuestas'] ?> respuestas</span>
      </li>
    <?php endforeach; ?>
  </ul>
</section>
<?php require __DIR__ . '/includes/pie.php'; ?>
