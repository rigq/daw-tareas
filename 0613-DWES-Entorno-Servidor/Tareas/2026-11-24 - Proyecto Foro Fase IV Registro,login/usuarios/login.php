<?php
// Inicio de sesión de los usuarios registrados.
const RUTA_BASE = '../';
require __DIR__ . '/../includes/auth.php';

// Si ya está conectado no necesita ver el login.
if (estaConectado()) {
    redirigir('../index.php');
}

const MENSAJE_GENERICO = 'Usuario o contraseña incorrectos';

$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$error = '';
$bloqueo = segundosBloqueoLogin($ip);

// Valores iniciales del formulario: se rellenan desde la cookie "recordar usuario".
$recordado = usuarioRecordado();
$valorUsuario = $recordado;
$recordar = $recordado !== '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $valorUsuario = trim((string) ($_POST['usuario'] ?? ''));
    $recordar = isset($_POST['recordar']);
    $password = (string) ($_POST['password'] ?? '');

    if ($bloqueo > 0) {
        // Bloqueado: no se evalúan las credenciales, ni siquiera si fueran correctas.
        $error = '';
    } else {
        $usuario = $valorUsuario !== '' ? buscarUsuarioPorNombreOEmail($valorUsuario) : null;

        // Si el usuario no existe se calcula igualmente un hash, para que el tiempo
        // de respuesta no delate si la cuenta existe o no.
        if ($usuario === null) {
            password_hash($password, PASSWORD_DEFAULT);
            $correcto = false;
        } else {
            $correcto = password_verify($password, $usuario['hash']);
        }

        if ($correcto) {
            $ahora = date('Y-m-d H:i:s');
            $anterior = $usuario['ultimo_acceso'];

            iniciarSesionUsuario($usuario);

            // Cookie con la última conexión ANTERIOR a esta (la de ahora se guarda en el
            // archivo y será la que se muestre en el próximo login). Primer login: la actual.
            crearCookie(COOKIE_ULTIMA_VISITA, $anterior !== '' ? $anterior : $ahora, DURACION_COOKIE_ULTIMA_VISITA);

            if ($recordar) {
                crearCookie(COOKIE_USUARIO, $usuario['usuario'], DURACION_COOKIE_USUARIO);
            } else {
                eliminarCookie(COOKIE_USUARIO);
            }

            actualizarUltimoAcceso($usuario['id'], $ahora);
            limpiarFallosLogin($ip);
            redirigir('../index.php');
        }

        // Fallo: mismo mensaje genérico siempre.
        $bloqueo = registrarFalloLogin($ip);
        if ($bloqueo === 0) {
            $error = MENSAJE_GENERICO;
        }
    }
}

$titulo = 'Iniciar sesión';
require __DIR__ . '/../includes/cabecera.php';
?>
<section class="tarjeta formulario">
  <h1>Iniciar sesión</h1>

  <?php if ($bloqueo > 0): ?>
    <p class="mensaje error" id="bloqueo" data-segundos="<?= (int) $bloqueo ?>" role="alert">
      Demasiados intentos fallidos. Inténtalo de nuevo en
      <strong><span id="cuenta"><?= (int) $bloqueo ?></span></strong> segundos.
    </p>
  <?php elseif ($error !== ''): ?>
    <p class="mensaje error" role="alert"><?= e($error) ?></p>
  <?php endif; ?>

  <form method="post" action="login.php" novalidate>
    <label for="usuario">Usuario o correo electrónico</label>
    <input type="text" id="usuario" name="usuario" value="<?= e($valorUsuario) ?>"
           autocomplete="username" maxlength="254" required>

    <label for="password">Contraseña</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>

    <label class="casilla">
      <input type="checkbox" name="recordar" value="1" <?= $recordar ? 'checked' : '' ?>>
      Recordar mi usuario
    </label>

    <button type="submit" id="entrar" <?= $bloqueo > 0 ? 'disabled' : '' ?>>Entrar</button>
  </form>
  <p>¿No tienes cuenta? <a href="registro.php">Regístrate</a></p>
</section>

<?php if ($bloqueo > 0): ?>
<script>
// Cuenta atrás del bloqueo. El servidor es quien lo hace cumplir; esto es solo informativo.
(function () {
  var restante = <?= (int) $bloqueo ?>;
  var cuenta = document.getElementById('cuenta');
  var boton = document.getElementById('entrar');
  var aviso = document.getElementById('bloqueo');
  var t = setInterval(function () {
    restante--;
    if (restante <= 0) {
      clearInterval(t);
      aviso.textContent = 'Ya puedes volver a intentarlo.';
      boton.disabled = false;
    } else {
      cuenta.textContent = restante;
    }
  }, 1000);
})();
</script>
<?php endif; ?>
<?php require __DIR__ . '/../includes/pie.php'; ?>
