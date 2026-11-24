<?php
/**
 * auth.php — Sesión, cookies y control de acceso.
 *
 * Es el ÚNICO lugar donde se llama a session_start() y se carga en todas las páginas.
 * Cada página debe definir antes RUTA_BASE: '' si está en la raíz del proyecto
 * o '../' si está dentro de usuarios/.
 *
 *   QUÉ VA EN LA SESIÓN (servidor): id, usuario, rol y ultima_actividad. Es lo que
 *   da acceso a la cuenta, y el usuario no puede modificarlo.
 *   QUÉ VA EN COOKIES (navegador): solo preferencias sin valor de seguridad
 *   (nombre recordado y fecha de la última visita). Nunca contraseñas ni roles.
 */

if (!defined('RUTA_BASE')) {
    define('RUTA_BASE', '');
}

/** Segundos de inactividad tras los cuales caduca la sesión (30 min). Para probar: 30. */
const TIEMPO_INACTIVIDAD = 30 * 60;

const COOKIE_USUARIO = 'foro_usuario';
const COOKIE_ULTIMA_VISITA = 'foro_ultima_visita';
const DURACION_COOKIE_USUARIO = 30 * 24 * 3600;       // 30 días
const DURACION_COOKIE_ULTIMA_VISITA = 90 * 24 * 3600; // 90 días

require_once __DIR__ . '/funciones.php';

/* ------------------------------------------------------------------ */
/*  Utilidades                                                        */
/* ------------------------------------------------------------------ */

/** Escapa un texto para mostrarlo en HTML. */
function e(?string $texto): string
{
    return htmlspecialchars((string) $texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function esHttps(): bool
{
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

/** Redirige y termina la ejecución. */
function redirigir(string $url): never
{
    header('Location: ' . $url);
    exit;
}

/** Avisos que se pueden mostrar mediante ?aviso=codigo (lista cerrada, nunca texto libre). */
function mensajeAviso(?string $codigo): ?array
{
    $avisos = [
        'registrado'      => ['ok',    'Registro completado. Ya puedes iniciar sesión.'],
        'logout'          => ['ok',    'Has cerrado sesión.'],
        'login_requerido' => ['aviso', 'Debes iniciar sesión para acceder a esa página.'],
        'sesion_caducada' => ['aviso', 'Tu sesión ha caducado por inactividad. Vuelve a iniciar sesión.'],
        'sin_permiso'     => ['error', 'No tienes permiso para acceder a esa página.'],
    ];
    return $avisos[$codigo ?? ''] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Cookies                                                           */
/* ------------------------------------------------------------------ */

function opcionesCookie(int $expira): array
{
    return [
        'expires'  => $expira,
        'path'     => '/',
        'secure'   => esHttps(),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function crearCookie(string $nombre, string $valor, int $duracion): void
{
    setcookie($nombre, $valor, opcionesCookie(time() + $duracion));
    $_COOKIE[$nombre] = $valor;
}

function eliminarCookie(string $nombre): void
{
    setcookie($nombre, '', opcionesCookie(time() - 3600));
    unset($_COOKIE[$nombre]);
}

/** Nombre recordado (validado, porque la cookie la puede manipular el usuario). */
function usuarioRecordado(): string
{
    $valor = $_COOKIE[COOKIE_USUARIO] ?? '';
    return is_string($valor) && preg_match('/^[A-Za-z0-9_]{3,20}\z/', $valor) ? $valor : '';
}

/** Fecha de la última visita (validada) o null. */
function ultimaVisita(): ?DateTime
{
    $valor = $_COOKIE[COOKIE_ULTIMA_VISITA] ?? '';
    if (!is_string($valor)) {
        return null;
    }
    $fecha = DateTime::createFromFormat('Y-m-d H:i:s', $valor);
    return ($fecha !== false && $fecha->format('Y-m-d H:i:s') === $valor) ? $fecha : null;
}

/* ------------------------------------------------------------------ */
/*  Sesión                                                            */
/* ------------------------------------------------------------------ */

function estaConectado(): bool
{
    return isset($_SESSION['id'], $_SESSION['usuario'], $_SESSION['rol']);
}

function esAdmin(): bool
{
    return estaConectado() && $_SESSION['rol'] === 'admin';
}

/** Crea la sesión del usuario autenticado, guardando solo lo imprescindible. */
function iniciarSesionUsuario(array $usuario): void
{
    session_regenerate_id(true); // evita la fijación de sesión
    $_SESSION = [
        'id'               => (int) $usuario['id'],
        'usuario'          => $usuario['usuario'],
        'rol'              => $usuario['rol'],
        'ultima_actividad' => time(),
    ];
}

/** Vacía la sesión, la destruye y elimina la cookie de sesión. */
function cerrarSesion(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $p['path'],
            'domain'   => $p['domain'],
            'secure'   => $p['secure'],
            'httponly' => $p['httponly'],
            'samesite' => $p['samesite'] ?: 'Lax',
        ]);
    }
    session_destroy();
}

/** Página protegida: exige estar conectado. */
function exigirLogin(): void
{
    if (!estaConectado()) {
        redirigir(RUTA_BASE . 'usuarios/login.php?aviso=login_requerido');
    }
}

/** Página protegida para administradores. */
function exigirAdmin(): void
{
    exigirLogin();
    if (!esAdmin()) {
        redirigir(RUTA_BASE . 'index.php?aviso=sin_permiso');
    }
}

/* ------------------------------------------------------------------ */
/*  Arranque (se ejecuta al incluir el archivo)                       */
/* ------------------------------------------------------------------ */

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => esHttps(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Caducidad por inactividad.
if (estaConectado()) {
    $ultima = (int) ($_SESSION['ultima_actividad'] ?? 0);
    if (time() - $ultima > TIEMPO_INACTIVIDAD) {
        cerrarSesion();
        redirigir(RUTA_BASE . 'usuarios/login.php?aviso=sesion_caducada');
    }
    $_SESSION['ultima_actividad'] = time();
}
