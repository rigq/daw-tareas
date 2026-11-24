<?php
// Cierra la sesión: vacía $_SESSION, la destruye, elimina la cookie de sesión y vuelve al inicio.
const RUTA_BASE = '../';
require __DIR__ . '/../includes/auth.php';

cerrarSesion();
redirigir('../index.php?aviso=logout');
