<?php
// Página protegida (solo administradores). Sirve para probar el control de acceso.
const RUTA_BASE = '';
require __DIR__ . '/includes/auth.php';
exigirAdmin();

$titulo = 'Panel de administración';
require __DIR__ . '/includes/cabecera.php';
?>
<section class="tarjeta">
  <h1>Panel de administración</h1>
  <p class="mensaje aviso">🚧 En construcción. Estará disponible en una fase posterior.</p>
</section>
<?php require __DIR__ . '/includes/pie.php'; ?>
