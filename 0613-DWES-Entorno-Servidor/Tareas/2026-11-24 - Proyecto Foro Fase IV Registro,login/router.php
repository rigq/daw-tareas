<?php
// Router SOLO para el servidor integrado de PHP (php -S), que no lee .htaccess.
// Con Apache/XAMPP no se usa: allí protege datos/.htaccess.
//   php -S localhost:8000 router.php
$ruta = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if (preg_match('#(^|/)(datos|includes)(/|$)#i', $ruta) || str_contains($ruta, '..')) {
    http_response_code(403);
    echo '403 Acceso denegado';
    return true;
}
return false; // el servidor sirve el archivo o ejecuta el PHP normalmente
