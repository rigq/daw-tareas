# Proyecto Foro Fase IV Registro,login

- **Curso:** DAW - 0613. Desarrollo web en entorno servidor
- **Cierre:** martes, 24 de noviembre de 2026, 14:30
- **Campus:** https://campus.digitechfp.com/mod/assign/view.php?id=69482&action=editsubmission
- **Adjunto del campus:** [Proyecto Foro Fase IV.pdf](https://campus.digitechfp.com/pluginfile.php/77825/mod_assign/introattachment/0/Proyecto%20Foro%20Fase%20IV.pdf?forcedownload=1) (copia local: [Proyecto-Foro-Fase-IV.pdf](Proyecto-Foro-Fase-IV.pdf)), publicado el 19 de noviembre de 2026, 10:37

---

## 1. Enunciado

> Transcripción íntegra del PDF. Dos observaciones sobre el original:
> - En el PDF se han perdido los números de apartado (el texto remite a «apartado 5.4», «5.5» y «6»). Corresponden, por el orden del documento, a *Sesión*, *Cookies* y *funciones.php*.
> - En el apartado de validación y en la prueba 5 el PDF muestra el carácter `` ` `` donde el texto de `usuarios.txt` dice que es `|` (la barra vertical, que es el separador de campos). Se ha implementado como `|`.

### Proyecto Foro Fase IV

Vas a desarrollar tres documentos php:

1. Registro (registro.php): alta de nuevos usuarios.
2. Acceso (login.php): inicio de sesión de los usuarios registrados.
3. Inicio (index.php): página principal, que cambia según el visitante esté o no conectado.

Además, al conectarse un usuario, la aplicación debe crear una sesión y una o varias cookies.

**Importante:** en esta fase los datos de los usuarios no se guardan en MySQL, sino en un archivo de texto (usuarios.txt). En las fases siguientes se migrarán a la tabla usuarios que diseñaste. Por eso es fundamental que todo el acceso a los datos esté aislado en unas pocas funciones (apartado 6): así, cambiar el archivo por la base de datos solo exigirá reescribir esas funciones y no las páginas.

### Objetivos

- Validar un formulario de registro en el servidor y mostrar los errores junto a cada campo.
- Guardar y leer registros en un archivo de texto con fopen, fgets y fwrite, evitando duplicados.
- Crear y destruir sesiones PHP y controlar el acceso a páginas protegidas.
- Crear, leer y eliminar cookies con las opciones de seguridad adecuadas.
- Distinguir qué conviene guardar en una sesión y qué en una cookie.

Puedes utilizar herramientas de inteligencia artificial, pero tienes que registrar los prompts que has utilizado, contrastando entre varias herramientas, cumplimentando la siguiente tabla:

| PROMPT | RESULTADOS1 | RESULTADOS2 |
|---|---|---|
| | | |

### Estructura de archivos

Esta fase completa la parte de la estructura del proyecto que corresponde al acceso de usuarios:

```
├── usuarios/
│   ├── registro.php
│   ├── login.php
│   └── logout.php
├── datos/
│   └── usuarios.txt
│
└── css/
    └── estilos.css
```

### usuarios.txt

Cada usuario ocupa una línea. Los campos se separan con el carácter `|`, que por tanto no puede aparecer dentro de ningún campo (hay que rechazarlo al validar). La primera línea es una cabecera.

| Campo | Descripción |
|---|---|
| id | Entero autoincremental: el último id del archivo más uno. |
| usuario | Nombre de usuario. Entre 3 y 20 caracteres: letras, números y guion bajo. Único sin distinguir mayúsculas. |
| email | Correo electrónico válido (filter_var con FILTER_VALIDATE_EMAIL). Único sin distinguir mayúsculas. |
| hash | Resultado de password_hash(). |
| rol | usuario o admin. Todo registro nuevo es usuario. El administrador se crea a mano. |
| fecha_alta | Fecha y hora del registro (Y-m-d H:i:s). |
| ultimo_acceso | Fecha y hora de la última conexión. Vacío si nunca se ha conectado. |

### registro.php

**Formulario:** usuario, email, contraseña y repetir contraseña.

**Validaciones en el servidor**

| Campo | Regla | Mensaje de ejemplo |
|---|---|---|
| Usuario | Obligatorio, 3 a 20 caracteres, solo letras, números y _ | El usuario debe tener entre 3 y 20 caracteres alfanuméricos. |
| Usuario | No existe ya (sin distinguir mayúsculas) | Ese nombre de usuario ya está en uso. |
| Email | Obligatorio y con formato válido | Introduce un correo electrónico válido. |
| Email | No existe ya (sin distinguir mayúsculas) | Ese correo ya está registrado. |
| Contraseña | Mínimo 8 caracteres, con al menos una letra y un número | La contraseña debe tener 8 caracteres como mínimo, con letras y números. |
| Repetir contraseña | Igual que la contraseña | Las contraseñas no coinciden. |
| Todos | No contienen el carácter `\|` | |

**Comportamiento**

1. Si hay errores, el formulario vuelve a mostrarse con los datos escritos (excepto las contraseñas, que nunca se rellenan de nuevo) y un mensaje junto a cada campo.
2. Si todo es correcto, se calcula el hash, se asigna el siguiente id, se guarda la línea en usuarios.txt con el rol usuario y la fecha de alta, y se redirige a login.php con un mensaje de confirmación («Registro completado. Ya puedes iniciar sesión»).
3. Si el usuario ya está conectado, no debe poder ver el registro: se le redirige a index.php.

### usuarios/login.php

**Formulario:** usuario (o email), contraseña y una casilla **«Recordar mi usuario»**.

**Comportamiento**

1. Se busca al usuario en usuarios.txt, recorriendo el archivo con fgets, por nombre de usuario o por email.
2. Se comprueba la contraseña con password_verify().
3. Si el usuario no existe o la contraseña no coincide, se muestra siempre el mismo mensaje genérico: «Usuario o contraseña incorrectos». Nunca se indica cuál de las dos cosas falló.
4. Si los datos son correctos:
   - Se crea la sesión (apartado 5.4).
   - Se crean las cookies (apartado 5.5).
   - Se actualiza el campo ultimo_acceso del usuario en el archivo.
   - Se redirige a index.php.
5. Si el usuario ya está conectado, se le redirige a index.php.
6. Si existe la cookie del usuario recordado, el campo de usuario aparece rellenado y la casilla marcada.

### index.php

Es la página principal del foro.

| Elemento | Visitante sin sesión | Usuario conectado |
|---|---|---|
| Barra de navegación | Enlaces a «Iniciar sesión» y «Registrarse» | Saludo con su nombre, su rol y enlace a «Cerrar sesión». Si es administrador, enlace a «Panel de administración» (aún en construcción) |
| Mensaje de bienvenida | Texto de presentación del foro e invitación a registrarse | «Hola, nombre» y la fecha y hora de su **última visita** (leída de la cookie) |
| Listado de temas | Se muestra, pero sin botón para crear temas | Se muestra con botón «Nuevo tema» (por ahora, deshabilitado o con aviso «Próximamente») |

### Sesión

La sesión guarda en el servidor los datos del usuario mientras navega. Debe hacer lo siguiente:

1. Iniciarse con session_start() en un único lugar (includes/auth.php), que se carga en todas las páginas.
2. Al conectarse, ejecutar session_regenerate_id(true) para evitar la fijación de sesión.
3. Guardar en $_SESSION solo lo necesario: id, usuario, rol y ultima_actividad.
4. Al cerrar sesión (logout.php): vaciar $_SESSION, destruir la sesión, eliminar la cookie de sesión y redirigir a index.php con el aviso «Has cerrado sesión».

### Cookies

Una cookie se guarda en el navegador del usuario. Es útil para recordar preferencias, pero no es de fiar, porque el usuario puede verla y modificarla. Por eso nunca se guarda en una cookie nada que dé acceso a la cuenta (como la contraseña).

Se crearán estas cookies:

| Cookie | Contenido | Duración | Para qué sirve |
|---|---|---|---|
| foro_usuario | Nombre de usuario | 30 días | Rellenar el campo de usuario en el login cuando se marcó «Recordar mi usuario». Si no se marca, se elimina. |
| foro_ultima_visita | Fecha y hora de la última conexión (Y-m-d H:i:s) | 90 días | Mostrar en index.php «Tu última visita fue el...». Se lee **antes** de actualizarla con la visita actual. |

### funciones.php

Todo el acceso a usuarios.txt debe hacerse a través de estas funciones. Ninguna página llama directamente a fopen.

| Función | Qué hace |
|---|---|
| `leerUsuarios(): array` | Lee el archivo con fgets, descarta la cabecera y las líneas vacías y devuelve un array de arrays asociativos. |
| `buscarUsuarioPorNombre(string $nombre): ?array` | Devuelve el usuario cuyo nombre coincide (sin distinguir mayúsculas) o null. |
| `siguienteId(): int` | Devuelve el último id más uno. |
| `guardarUsuario(array $usuario): bool` | Guarda el usuario en el archivo de texto |

### Diseño de pruebas

Genera un archivo README.md, y anota el resultado en la tabla del README.md.

| Nº | Prueba | Resultado esperado |
|---|---|---|
| 1 | Registrar un usuario con todos los datos correctos | Aparece una línea nueva en usuarios.txt con un hash (no la contraseña) y se redirige al login |
| 2 | Registrar un usuario con un nombre ya existente, escrito con otras mayúsculas | Error junto al campo usuario |
| 3 | Registrar con un email sin formato válido | Error junto al campo email |
| 4 | Registrar con contraseñas distintas | Error y los datos de usuario y email se conservan en el formulario |
| 5 | Registrar escribiendo el carácter `\|` en un campo | *(el PDF no indica resultado; se espera rechazo con error en ese campo)* |
| 6 | Iniciar sesión con una contraseña errónea | Mensaje genérico, sin indicar qué falló |
| 7 | Fallar el login cinco veces seguidas | Bloqueo de 60 segundos con cuenta atrás |
| 8 | Iniciar sesión correctamente | Redirección a index.php, saludo y última visita |
| 9 | Marcar «Recordar mi usuario», cerrar sesión y volver al login | El campo usuario aparece rellenado |
| 10 | Revisar las cookies en las herramientas del navegador (Aplicación o Almacenamiento) | Existen PHPSESSID, foro_usuario y foro_ultima_visita, con HttpOnly y SameSite=Lax |
| 11 | Cerrar sesión | Se vuelve al inicio y el menú muestra «Iniciar sesión» |
| 12 | Escribir la URL de una página protegida sin sesión | Redirección al login con aviso |
| 13 | Dejar la sesión inactiva más de 30 minutos (o cambiar la constante a 30 segundos para probar) | Sesión caducada y aviso |
| 14 | Estando conectado, abrir registro.php o login.php | Redirección a index.php |
| 15 | Abrir la URL de datos/usuarios.txt en el navegador | Acceso denegado |

---

## 2. Análisis

### Qué hay que entregar

| Entregable | Archivo | Papel |
|---|---|---|
| Registro | `usuarios/registro.php` | Alta con validación en servidor, errores junto a cada campo |
| Acceso | `usuarios/login.php` | Autenticación, sesión, cookies, «recordar usuario» |
| Salida | `usuarios/logout.php` | Destruye la sesión (aparece en la estructura de archivos) |
| Inicio | `index.php` | Página principal con dos vistas (visitante / conectado) |
| Sesión y cookies | `includes/auth.php` | Único `session_start()`; cargado en todas las páginas |
| Acceso a datos | `includes/funciones.php` | Única capa que toca el archivo (`fopen`/`fgets`/`fwrite`) |
| Datos | `datos/usuarios.txt` | «Tabla» de usuarios en texto plano |
| Estilos | `css/estilos.css` | Presentación |
| Documentación | `README.md` | Enunciado, análisis, pruebas y registro de prompts |

### Decisiones de diseño

- **Capa de datos aislada.** Ninguna página llama a `fopen`. Si en la fase siguiente se migra a MySQL solo se reescriben las funciones de `funciones.php` (misma firma, otra implementación) y las páginas no cambian. Además de las cuatro funciones obligatorias hay tres auxiliares que también viven ahí: `buscarUsuarioPorEmail`, `buscarUsuarioPorNombreOEmail` y `actualizarUltimoAcceso` (el enunciado exige actualizar `ultimo_acceso` pero no nombra la función).
- **Sesión frente a cookie.** La sesión (servidor, no manipulable) guarda lo que da acceso: `id`, `usuario`, `rol`, `ultima_actividad`. Las cookies (navegador, manipulables) solo guardan preferencias sin valor de seguridad: el nombre recordado y la fecha de la última visita. Por eso el rol o la contraseña jamás se guardan en una cookie, y las dos cookies se **validan al leerlas** (regex de usuario, formato estricto de fecha) y se escapan al pintarlas.
- **Cookies seguras.** Todas con `HttpOnly`, `SameSite=Lax`, `path=/` y `Secure` automático cuando la conexión es HTTPS. La cookie de sesión usa las mismas opciones (`session_set_cookie_params`) más `use_strict_mode` y `use_only_cookies`.
- **Mensaje de login genérico.** Siempre «Usuario o contraseña incorrectos». Si el usuario no existe se calcula igualmente un `password_hash` para que el tiempo de respuesta no delate si la cuenta existe.
- **Fuerza bruta (prueba 7).** El enunciado lo pide solo en la tabla de pruebas, no en el texto. Se implementa un bloqueo de 60 s tras 5 fallos seguidos, **en el servidor y por IP** (`datos/intentos.txt`, también a través de `funciones.php`). No se hace con la sesión ni con una cookie porque el atacante las descartaría y se saltaría el límite. Mientras dura el bloqueo no se evalúan las credenciales (ni siquiera si fueran correctas) y la página muestra una cuenta atrás.
- **Caducidad (prueba 13).** Constante `TIEMPO_INACTIVIDAD` en `auth.php` (30 min); en cada petición se compara con `ultima_actividad`.
- **Archivo protegido (prueba 15).** `datos/.htaccess` y `includes/.htaccess` deniegan el acceso con Apache. El servidor integrado de PHP no lee `.htaccess`, por eso se incluye `router.php` solo para desarrollo.
- **Avisos por código, no por texto.** Las redirecciones llevan `?aviso=codigo` y el texto sale de una lista cerrada en `auth.php`; así no se puede inyectar contenido por la URL ni hace falta guardar mensajes en `$_SESSION` (que debe contener solo 4 datos).
- **Concurrencia.** Todas las lecturas/escrituras usan `flock`. `guardarUsuario` vuelve a comprobar duplicados bajo el bloqueo exclusivo.
- **Separador `|`.** Se rechaza en los cuatro campos del formulario (prueba 5); como el hash de bcrypt no contiene `|` el archivo no se corrompe.

### Puntos donde el enunciado es ambiguo y qué se decidió

| Punto | Decisión |
|---|---|
| ¿Cuál es «la última visita» si la cookie se actualiza en el login? | La cookie guarda la conexión **anterior** a la actual (el valor que había en `ultimo_acceso` antes de actualizarlo). Así `index.php` muestra la visita previa y es por usuario, no por navegador. En el **primer** login no hay anterior: se guarda la fecha actual para que la cookie exista (prueba 10). |
| Mínimo del apartado 6 vs. más funciones | Se mantienen las 4 firmas pedidas y se añaden las auxiliares necesarias, siempre dentro de `funciones.php`. |
| Máximo de contraseña | `bcrypt` solo usa 72 bytes; se rechazan contraseñas más largas (el enunciado solo pide mínimo). |
| ¿Dónde va `funciones.php`? | En `includes/` junto a `auth.php`, que lo carga. El enunciado solo fija la ruta de `auth.php`. |
| Página protegida | El enunciado habla de «una página protegida» (prueba 12) pero no define ninguna: se añade `admin.php` (Panel de administración «en construcción», solo `admin`). Un usuario normal que entre es devuelto a `index.php` con aviso. |
| Listado de temas | Aún no hay base de datos de temas: se muestran 3 temas de ejemplo fijos. |
| Administrador | «Se crea a mano»: se incluye ya en `usuarios.txt` (ver abajo). |

---

## 3. Solución

### Estructura

```
Proyecto-Foro-Fase-IV-Registrologin/
├── index.php                 Página principal (visitante / conectado)
├── admin.php                 Página protegida: panel de administración (en construcción)
├── router.php                Solo para `php -S` (bloquea datos/ e includes/)
├── includes/
│   ├── auth.php              session_start() único, cookies, control de acceso, caducidad
│   ├── funciones.php         ÚNICO acceso a datos/usuarios.txt (+ intentos de login)
│   ├── cabecera.php          <head>, barra de navegación y avisos
│   ├── pie.php
│   └── .htaccess             Require all denied
├── usuarios/
│   ├── registro.php
│   ├── login.php
│   └── logout.php
├── datos/
│   ├── usuarios.txt          id|usuario|email|hash|rol|fecha_alta|ultimo_acceso
│   ├── intentos.txt          (se crea solo) ip|fallos|bloqueado_hasta|ultimo_fallo
│   └── .htaccess             Require all denied
└── css/
    └── estilos.css
```

### Cómo ejecutarlo

**XAMPP / Apache:** copiar la carpeta del proyecto a `htdocs` y abrir `http://localhost/<carpeta>/index.php` (las rutas son relativas, funciona en cualquier subcarpeta). Requiere PHP ≥ 8.1.

**Servidor integrado de PHP** (sin Apache):

```
php -S localhost:8000 router.php
```

### Cuenta de administrador (creada a mano)

| Usuario | Email | Contraseña | Rol |
|---|---|---|---|
| `admin` | admin@foro.local | `Admin1234` | admin |

Es la única línea de `usuarios.txt` además de la cabecera; **cambia la contraseña antes de publicar** (genera otro hash con `php -r 'echo password_hash("tu_clave", PASSWORD_DEFAULT);'` y pégalo en la línea).

### Flujo de login (resumen)

1. Si ya hay sesión → `index.php`.
2. Si la IP está bloqueada → se muestra la cuenta atrás y no se evalúa nada.
3. `buscarUsuarioPorNombreOEmail` + `password_verify`. Si falla: mensaje genérico y se anota el fallo (al 5.º, bloqueo de 60 s).
4. Si acierta: `session_regenerate_id(true)` → `$_SESSION` (id, usuario, rol, ultima_actividad) → cookie `foro_ultima_visita` → cookie `foro_usuario` (si se marcó la casilla; si no, se elimina) → `actualizarUltimoAcceso` → `index.php`.

### Mejoras posibles (fuera del alcance de esta fase)

- Token CSRF en los formularios (requeriría guardar algo más en `$_SESSION`, que el enunciado limita a cuatro datos; `SameSite=Lax` ya mitiga lo más habitual).
- Mover `datos/` fuera del directorio público del servidor (defensa más robusta que `.htaccess`).
- `password_needs_rehash` al hacer login.

---

## 4. Pruebas realizadas

Entorno: PHP 8.2.12 (servidor integrado con `router.php`), peticiones HTTP reales con `curl` y almacén de cookies, el 24/11/2026. Cada resultado se ha comprobado leyendo las cabeceras y el HTML devueltos, y el contenido de `datos/usuarios.txt`. Tras las pruebas se restauró `usuarios.txt` a su estado inicial (solo cabecera + admin).

| Nº | Prueba | Resultado esperado | Resultado obtenido | OK |
|---|---|---|---|---|
| 1 | Registrar un usuario con todos los datos correctos | Línea nueva en usuarios.txt con hash; redirige al login | `302 → login.php?aviso=registrado`; nueva línea `2\|ana_dev\|ana@correo.com\|$2y$10$…\|usuario\|2026-11-24 10:58:35\|` (hash bcrypt, no la contraseña) | ✅ |
| 2 | Usuario ya existente con otras mayúsculas (`ANA_DEV`) | Error junto al campo usuario | «Ese nombre de usuario ya está en uso.» junto al campo. Igual con el email duplicado `ANA@Correo.com`: «Ese correo ya está registrado.» | ✅ |
| 3 | Email sin formato válido | Error junto al campo email | «Introduce un correo electrónico válido.» junto al campo | ✅ |
| 4 | Contraseñas distintas | Error; usuario y email se conservan | «Las contraseñas no coinciden.»; `value="nuevo2"` y `value="n2@correo.com"` conservados; los `input` de contraseña salen sin `value` | ✅ |
| 5 | Carácter `\|` en un campo | Rechazo con error en el campo | «El carácter \| no está permitido.» en usuario, contraseña y repetir contraseña; el archivo no cambió (3 líneas) | ✅ |
| 6 | Login con contraseña errónea | Mensaje genérico | «Usuario o contraseña incorrectos» tanto con usuario existente + clave mala como con usuario inexistente | ✅ |
| 7 | Cinco fallos seguidos | Bloqueo de 60 s con cuenta atrás | Al 5.º fallo: «Demasiados intentos fallidos. Inténtalo de nuevo en 60 segundos» (3 s después: 56); botón `disabled`; con la contraseña **correcta** durante el bloqueo sigue sin entrar. Pasados 60 s: `302 → index.php` | ✅ |
| 8 | Login correcto | Redirección a index.php, saludo y última visita | `302 → ../index.php`; «Hola, ana_dev», rol `usuario`, «Tu última visita fue el 24/11/2026 a las 10:59»; `ultimo_acceso` actualizado en el archivo. Segundo login: muestra la fecha del primero | ✅ |
| 9 | «Recordar mi usuario», cerrar sesión, volver al login | Campo usuario relleno | `value="ana_dev"` y casilla `checked`. Si no se marca la casilla, la respuesta incluye `foro_usuario=deleted` (cookie eliminada) | ✅ |
| 10 | Cookies del navegador | PHPSESSID, foro_usuario y foro_ultima_visita con HttpOnly y SameSite=Lax | Las tres llegan con `HttpOnly; SameSite=Lax; path=/`; `foro_usuario` caduca a 30 días (`Max-Age=2592000`) y `foro_ultima_visita` a 90 (`Max-Age=7776000`) | ✅ |
| 11 | Cerrar sesión | Vuelve al inicio, menú «Iniciar sesión» | `302 → ../index.php?aviso=logout`, cookie `PHPSESSID` eliminada, aviso «Has cerrado sesión.» y menú con «Iniciar sesión» / «Registrarse» | ✅ |
| 12 | URL protegida sin sesión | Redirección al login con aviso | `admin.php` → `302 → usuarios/login.php?aviso=login_requerido` y «Debes iniciar sesión para acceder a esa página.». Usuario normal → `index.php?aviso=sin_permiso`; admin → ve el panel | ✅ |
| 13 | Inactividad (constante a 3 s para probar) | Sesión caducada y aviso | Petición inmediata `200`; tras 5 s `302 → usuarios/login.php?aviso=sesion_caducada` con «Tu sesión ha caducado por inactividad.». Constante restaurada a 30 min | ✅ |
| 14 | Conectado, abrir registro.php / login.php | Redirección a index.php | Ambos `302 → ../index.php` | ✅ |
| 15 | Abrir datos/usuarios.txt | Acceso denegado | `403` (también `datos/intentos.txt`, `includes/auth.php` y la variante `datos/../datos/usuarios.txt`) con `router.php`. Con Apache lo hace `datos/.htaccess` | ✅ ¹ |

¹ Con el servidor integrado la protección la aplica `router.php`. La regla `.htaccess` para Apache/XAMPP está incluida pero **no se ha podido ejecutar aquí**; conviene repetir la prueba 15 en el XAMPP de clase (requiere `AllowOverride All`, que es el valor por defecto de XAMPP).

Adicionales: cookie `foro_ultima_visita` manipulada con `<script>` → la página responde `200` sin reflejarla (se valida el formato y se escapa); el contenido de `usuarios.txt` solo almacena el hash.

> No se ha probado en un navegador gráfico (solo con `curl`): el aspecto visual y la cuenta atrás en JavaScript del bloqueo no están verificados visualmente.

---

## 5. Registro de prompts (IA)

El enunciado pide contrastar los resultados entre varias herramientas. Aquí solo consta lo realizado con una; **la columna RESULTADOS2 está pendiente** de rellenar con la respuesta de una segunda herramienta al mismo prompt.

| PROMPT | RESULTADOS1 (Claude Code) | RESULTADOS2 |
|---|---|---|
| «Lee Proyecto-Foro-Fase-IV.pdf, extrae el enunciado entero, ponlo en README.md, analízalo y resuélvelo» | Transcripción del enunciado, análisis de ambigüedades, implementación completa (`index.php`, `admin.php`, `usuarios/*`, `includes/*`, `css/`, `datos/`), prueba real de los 15 casos de la tabla y este README | *(pendiente: pegar aquí el prompt en otra herramienta y comparar)* |
| | | |
| | | |

---

## 6. Checklist

- [x] Leer el enunciado y los adjuntos
- [x] Hacer la práctica
- [x] Probarla (con `curl` y servidor integrado; falta repetir la prueba 15 con Apache y una revisión visual en el navegador)
- [ ] Completar la columna RESULTADOS2 de la tabla de prompts
- [ ] Subir la entrega al campus
