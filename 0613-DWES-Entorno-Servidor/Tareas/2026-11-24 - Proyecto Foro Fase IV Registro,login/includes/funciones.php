<?php
/**
 * funciones.php — Capa de acceso a datos.
 *
 * TODO el acceso a datos/usuarios.txt (y al control de intentos de login) pasa por
 * las funciones de este archivo. Ninguna página llama a fopen directamente.
 * Cuando se migre a MySQL solo habrá que reescribir estas funciones.
 *
 * Formato de usuarios.txt (una línea por usuario, campos separados por "|"):
 *   id|usuario|email|hash|rol|fecha_alta|ultimo_acceso
 * La primera línea es una cabecera.
 */

const ARCHIVO_USUARIOS = __DIR__ . '/../datos/usuarios.txt';
const ARCHIVO_INTENTOS = __DIR__ . '/../datos/intentos.txt';
const CABECERA_USUARIOS = 'id|usuario|email|hash|rol|fecha_alta|ultimo_acceso';
const CAMPOS_USUARIO = ['id', 'usuario', 'email', 'hash', 'rol', 'fecha_alta', 'ultimo_acceso'];

/** Protección contra fuerza bruta en el login. */
const MAX_INTENTOS_LOGIN = 5;
const SEGUNDOS_BLOQUEO_LOGIN = 60;
const SEGUNDOS_MEMORIA_INTENTOS = 900; // los fallos sueltos se olvidan a los 15 min

/* ------------------------------------------------------------------ */
/*  Utilidades internas                                               */
/* ------------------------------------------------------------------ */

/** Crea la carpeta y el archivo (con cabecera) si todavía no existen. */
function asegurarArchivoUsuarios(): void
{
    $dir = dirname(ARCHIVO_USUARIOS);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $f = fopen(ARCHIVO_USUARIOS, 'a+');
    if ($f === false) {
        return;
    }
    flock($f, LOCK_EX);
    if (fstat($f)['size'] === 0) {
        fwrite($f, CABECERA_USUARIOS . "\n");
    }
    flock($f, LOCK_UN);
    fclose($f);
}

/** Convierte una línea del archivo en un array asociativo (o null si no es válida). */
function parsearLineaUsuario(string $linea): ?array
{
    $linea = rtrim($linea, "\r\n");
    if (trim($linea) === '') {
        return null;
    }
    $partes = explode('|', $linea);
    if (count($partes) < 6) {
        return null;
    }
    $partes = array_pad($partes, count(CAMPOS_USUARIO), '');
    $usuario = array_combine(CAMPOS_USUARIO, array_slice($partes, 0, count(CAMPOS_USUARIO)));
    $usuario['id'] = (int) $usuario['id'];
    return $usuario;
}

/** Convierte un array de usuario en una línea de texto (sin salto final). */
function formatearLineaUsuario(array $usuario): string
{
    $campos = [];
    foreach (CAMPOS_USUARIO as $campo) {
        $campos[] = (string) ($usuario[$campo] ?? '');
    }
    return implode('|', $campos);
}

/* ------------------------------------------------------------------ */
/*  API pública de usuarios                                           */
/* ------------------------------------------------------------------ */

/**
 * Lee el archivo con fgets, descarta la cabecera y las líneas vacías
 * y devuelve un array de arrays asociativos.
 */
function leerUsuarios(): array
{
    asegurarArchivoUsuarios();
    $f = fopen(ARCHIVO_USUARIOS, 'r');
    if ($f === false) {
        return [];
    }
    flock($f, LOCK_SH);
    $usuarios = [];
    $primera = true;
    while (($linea = fgets($f)) !== false) {
        if ($primera) {          // cabecera
            $primera = false;
            continue;
        }
        $u = parsearLineaUsuario($linea);
        if ($u !== null) {
            $usuarios[] = $u;
        }
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $usuarios;
}

/** Devuelve el usuario cuyo nombre coincide (sin distinguir mayúsculas) o null. */
function buscarUsuarioPorNombre(string $nombre): ?array
{
    $nombre = strtolower(trim($nombre));
    foreach (leerUsuarios() as $u) {
        if (strtolower($u['usuario']) === $nombre) {
            return $u;
        }
    }
    return null;
}

/** Devuelve el usuario cuyo email coincide (sin distinguir mayúsculas) o null. */
function buscarUsuarioPorEmail(string $email): ?array
{
    $email = strtolower(trim($email));
    foreach (leerUsuarios() as $u) {
        if (strtolower($u['email']) === $email) {
            return $u;
        }
    }
    return null;
}

/** Busca por nombre de usuario o, si no hay coincidencia, por email. */
function buscarUsuarioPorNombreOEmail(string $valor): ?array
{
    return buscarUsuarioPorNombre($valor) ?? buscarUsuarioPorEmail($valor);
}

/** Devuelve el último id del archivo más uno (1 si no hay usuarios). */
function siguienteId(): int
{
    $max = 0;
    foreach (leerUsuarios() as $u) {
        $max = max($max, $u['id']);
    }
    return $max + 1;
}

/**
 * Guarda el usuario al final del archivo.
 * Bajo un bloqueo exclusivo vuelve a comprobar que ni el id, ni el nombre ni el email
 * existan ya (por si dos registros simultáneos pasaron la validación a la vez).
 */
function guardarUsuario(array $usuario): bool
{
    asegurarArchivoUsuarios();
    $f = fopen(ARCHIVO_USUARIOS, 'a+');
    if ($f === false) {
        return false;
    }
    if (!flock($f, LOCK_EX)) {
        fclose($f);
        return false;
    }

    rewind($f);
    $primera = true;
    $ultimoCaracter = "\n";
    while (($linea = fgets($f)) !== false) {
        $ultimoCaracter = substr($linea, -1);
        if ($primera) {
            $primera = false;
            continue;
        }
        $u = parsearLineaUsuario($linea);
        if ($u === null) {
            continue;
        }
        if ($u['id'] === (int) $usuario['id']
            || strtolower($u['usuario']) === strtolower($usuario['usuario'])
            || strtolower($u['email']) === strtolower($usuario['email'])) {
            flock($f, LOCK_UN);
            fclose($f);
            return false;
        }
    }

    // Si el archivo (editado a mano) no acababa en salto de línea, lo añadimos.
    $texto = ($ultimoCaracter === "\n" ? '' : "\n") . formatearLineaUsuario($usuario) . "\n";
    $ok = fwrite($f, $texto) !== false;
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
    return $ok;
}

/** Actualiza el campo ultimo_acceso de un usuario reescribiendo el archivo. */
function actualizarUltimoAcceso(int $id, string $fecha): bool
{
    asegurarArchivoUsuarios();
    $f = fopen(ARCHIVO_USUARIOS, 'r+');
    if ($f === false) {
        return false;
    }
    if (!flock($f, LOCK_EX)) {
        fclose($f);
        return false;
    }

    $lineas = [];
    $primera = true;
    $encontrado = false;
    while (($linea = fgets($f)) !== false) {
        $linea = rtrim($linea, "\r\n");
        if ($primera) {
            $primera = false;
            $lineas[] = $linea;
            continue;
        }
        $u = parsearLineaUsuario($linea);
        if ($u !== null && $u['id'] === $id) {
            $u['ultimo_acceso'] = $fecha;
            $linea = formatearLineaUsuario($u);
            $encontrado = true;
        }
        if (trim($linea) !== '') {
            $lineas[] = $linea;
        }
    }

    $ok = false;
    if ($encontrado) {
        rewind($f);
        ftruncate($f, 0);
        $ok = fwrite($f, implode("\n", $lineas) . "\n") !== false;
        fflush($f);
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $ok;
}

/* ------------------------------------------------------------------ */
/*  Control de intentos de login (bloqueo temporal por IP)            */
/*  Formato de intentos.txt:  ip|fallos|bloqueado_hasta|ultimo_fallo  */
/* ------------------------------------------------------------------ */

/**
 * Abre intentos.txt con bloqueo exclusivo, ejecuta $operacion sobre el array
 * [ip => [fallos, bloqueado_hasta, ultimo_fallo]] y lo vuelve a guardar.
 */
function operarIntentos(callable $operacion)
{
    $dir = dirname(ARCHIVO_INTENTOS);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $f = fopen(ARCHIVO_INTENTOS, 'c+');
    if ($f === false) {
        $vacio = [];
        return $operacion($vacio);
    }
    flock($f, LOCK_EX);

    $ahora = time();
    $datos = [];
    while (($linea = fgets($f)) !== false) {
        $p = explode('|', rtrim($linea, "\r\n"));
        if (count($p) !== 4) {
            continue;
        }
        [$ip, $fallos, $hasta, $ultimo] = $p;
        $fallos = (int) $fallos;
        $hasta = (int) $hasta;
        $ultimo = (int) $ultimo;
        // Se descartan los bloqueos ya cumplidos y los fallos antiguos.
        if ($hasta > 0 && $hasta <= $ahora) {
            continue;
        }
        if ($hasta === 0 && $ultimo + SEGUNDOS_MEMORIA_INTENTOS < $ahora) {
            continue;
        }
        $datos[$ip] = [$fallos, $hasta, $ultimo];
    }

    $resultado = $operacion($datos);

    rewind($f);
    ftruncate($f, 0);
    $salida = '';
    foreach ($datos as $ip => [$fallos, $hasta, $ultimo]) {
        $salida .= "$ip|$fallos|$hasta|$ultimo\n";
    }
    fwrite($f, $salida);
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
    return $resultado;
}

/** Segundos que quedan de bloqueo para esa IP (0 si no está bloqueada). */
function segundosBloqueoLogin(string $ip): int
{
    return operarIntentos(function (array &$datos) use ($ip): int {
        return isset($datos[$ip]) ? max(0, $datos[$ip][1] - time()) : 0;
    });
}

/**
 * Anota un intento fallido. Al llegar al máximo bloquea la IP.
 * Devuelve los segundos de bloqueo resultantes (0 si todavía no está bloqueada).
 */
function registrarFalloLogin(string $ip): int
{
    return operarIntentos(function (array &$datos) use ($ip): int {
        $ahora = time();
        [$fallos, $hasta] = $datos[$ip] ?? [0, 0, 0];
        $fallos++;
        if ($fallos >= MAX_INTENTOS_LOGIN) {
            $datos[$ip] = [0, $ahora + SEGUNDOS_BLOQUEO_LOGIN, $ahora];
            return SEGUNDOS_BLOQUEO_LOGIN;
        }
        $datos[$ip] = [$fallos, 0, $ahora];
        return 0;
    });
}

/** Borra los fallos acumulados de una IP (tras un login correcto). */
function limpiarFallosLogin(string $ip): void
{
    operarIntentos(function (array &$datos) use ($ip): void {
        unset($datos[$ip]);
    });
}
