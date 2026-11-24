<?php
/**
 * cabecera.php — Inicio común del HTML: <head>, barra de navegación y aviso.
 * Variables esperadas: $titulo (string). RUTA_BASE ya definido por la página.
 */
$aviso = mensajeAviso($_GET['aviso'] ?? null);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($titulo ?? 'Foro') ?> · Foro DAW</title>
  <link rel="stylesheet" href="<?= RUTA_BASE ?>css/estilos.css">
</head>
<body>
<header class="barra">
  <a class="marca" href="<?= RUTA_BASE ?>index.php">Foro DAW</a>
  <nav>
    <?php if (estaConectado()): ?>
      <span class="saludo">Hola, <strong><?= e($_SESSION['usuario']) ?></strong>
        <span class="rol"><?= e($_SESSION['rol']) ?></span></span>
      <?php if (esAdmin()): ?>
        <a href="<?= RUTA_BASE ?>admin.php">Panel de administración</a>
      <?php endif; ?>
      <a href="<?= RUTA_BASE ?>usuarios/logout.php">Cerrar sesión</a>
    <?php else: ?>
      <a href="<?= RUTA_BASE ?>usuarios/login.php">Iniciar sesión</a>
      <a href="<?= RUTA_BASE ?>usuarios/registro.php">Registrarse</a>
    <?php endif; ?>
  </nav>
</header>
<main>
<?php if ($aviso !== null): ?>
  <p class="mensaje <?= e($aviso[0]) ?>" role="status"><?= e($aviso[1]) ?></p>
<?php endif; ?>
