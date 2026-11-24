<?php
// Alta de nuevos usuarios.
const RUTA_BASE = '../';
require __DIR__ . '/../includes/auth.php';

// Un usuario conectado no puede ver el registro.
if (estaConectado()) {
    redirigir('../index.php');
}

const MENSAJE_BARRA = 'El carácter | no está permitido.';

/**
 * Valida los datos del formulario en el servidor.
 * Devuelve un array [campo => mensaje]; vacío si todo es correcto.
 */
function validarRegistro(string $usuario, string $email, string $pass, string $pass2): array
{
    $errores = [];

    // --- Usuario ---
    if (!preg_match('/^[A-Za-z0-9_]{3,20}\z/', $usuario)) {
        $errores['usuario'] = 'El usuario debe tener entre 3 y 20 caracteres alfanuméricos (letras, números y _).';
    } elseif (buscarUsuarioPorNombre($usuario) !== null) {
        $errores['usuario'] = 'Ese nombre de usuario ya está en uso.';
    }

    // --- Email ---
    if ($email === '' || strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errores['email'] = 'Introduce un correo electrónico válido.';
    } elseif (buscarUsuarioPorEmail($email) !== null) {
        $errores['email'] = 'Ese correo ya está registrado.';
    }

    // --- Contraseña ---
    if (strlen($pass) < 8 || !preg_match('/\p{L}/u', $pass) || !preg_match('/\d/', $pass)) {
        $errores['password'] = 'La contraseña debe tener 8 caracteres como mínimo, con letras y números.';
    } elseif (strlen($pass) > 72) {
        // bcrypt (password_hash por defecto) solo usa los 72 primeros bytes.
        $errores['password'] = 'La contraseña no puede superar los 72 caracteres.';
    }

    // --- Repetir contraseña ---
    if (!hash_equals($pass, $pass2)) {
        $errores['password2'] = 'Las contraseñas no coinciden.';
    }

    // --- Ningún campo puede contener el separador "|" (tiene prioridad sobre otros errores) ---
    $campos = ['usuario' => $usuario, 'email' => $email, 'password' => $pass, 'password2' => $pass2];
    foreach ($campos as $campo => $valor) {
        if (str_contains($valor, '|')) {
            $errores[$campo] = MENSAJE_BARRA;
        }
    }

    return $errores;
}

$usuario = '';
$email = '';
$errores = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = trim((string) ($_POST['usuario'] ?? ''));
    $email = trim((string) ($_POST['email'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    $pass2 = (string) ($_POST['password2'] ?? '');

    $errores = validarRegistro($usuario, $email, $pass, $pass2);

    if (!$errores) {
        $nuevo = [
            'id'            => siguienteId(),
            'usuario'       => $usuario,
            'email'         => $email,
            'hash'          => password_hash($pass, PASSWORD_DEFAULT),
            'rol'           => 'usuario',
            'fecha_alta'    => date('Y-m-d H:i:s'),
            'ultimo_acceso' => '',
        ];
        if (guardarUsuario($nuevo)) {
            redirigir('login.php?aviso=registrado');
        }
        $errores['general'] = 'No se pudo completar el registro (usuario o correo ya existentes, o error al guardar). Inténtalo de nuevo.';
    }
}

$titulo = 'Registro';
require __DIR__ . '/../includes/cabecera.php';

/** Muestra el mensaje de error de un campo, si lo hay. */
function errorCampo(array $errores, string $campo): void
{
    if (isset($errores[$campo])) {
        echo '<span class="error" id="err-' . e($campo) . '">' . e($errores[$campo]) . '</span>';
    }
}
?>
<section class="tarjeta formulario">
  <h1>Crear cuenta</h1>
  <?php if (isset($errores['general'])): ?>
    <p class="mensaje error"><?= e($errores['general']) ?></p>
  <?php endif; ?>
  <form method="post" action="registro.php" novalidate>
    <label for="usuario">Usuario</label>
    <input type="text" id="usuario" name="usuario" value="<?= e($usuario) ?>"
           maxlength="40" autocomplete="username" required>
    <?php errorCampo($errores, 'usuario'); ?>

    <label for="email">Correo electrónico</label>
    <input type="email" id="email" name="email" value="<?= e($email) ?>"
           maxlength="254" autocomplete="email" required>
    <?php errorCampo($errores, 'email'); ?>

    <label for="password">Contraseña</label>
    <input type="password" id="password" name="password" autocomplete="new-password" required>
    <?php errorCampo($errores, 'password'); ?>

    <label for="password2">Repetir contraseña</label>
    <input type="password" id="password2" name="password2" autocomplete="new-password" required>
    <?php errorCampo($errores, 'password2'); ?>

    <button type="submit">Registrarse</button>
  </form>
  <p>¿Ya tienes cuenta? <a href="login.php">Inicia sesión</a></p>
</section>
<?php require __DIR__ . '/../includes/pie.php'; ?>
