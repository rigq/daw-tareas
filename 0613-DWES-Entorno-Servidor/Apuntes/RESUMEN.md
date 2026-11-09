<!-- archivos:
Archivos fuente/applications.html
Archivos fuente/arrray_multidimensional_asociativo2.php
Archivos fuente/cargaarchivo.php
Archivos fuente/ejercicio1.php
Archivos fuente/ejercicio5.php
Archivos fuente/files1.php
Archivos fuente/formulario1.html
Archivos fuente/formulario1.php
Archivos fuente/get1.html
Archivos fuente/get1.php
Archivos fuente/get2.html
Archivos fuente/get2.php
Archivos fuente/include.php
Archivos fuente/required.php
Archivos fuente/subir.php
Archivos fuente/subir.txt
Archivos fuente/switch.php
Archivos fuente/texto.txt
Diseño wireframe/Elementos de un wireframe.txt
UD1 Servidores y tipos/Tema1_Servidores.pdf
UD1 Servidores y tipos/Tema2_Servidores.pdf
UD2 Lenguaje PHP/$_COOKIE.txt
UD2 Lenguaje PHP/$_SESSION.txt
UD2 Lenguaje PHP/$FILES.txt
UD2 Lenguaje PHP/$GET.txt
UD2 Lenguaje PHP/$POST.txt
UD2 Lenguaje PHP/ARRAYS.txt
UD2 Lenguaje PHP/FUNCIONES PARA EL TRABAJO DE ARRAYS.txt
UD2 Lenguaje PHP/Includerequired.txt
UD2 Lenguaje PHP/MATRICES.txt
UD2 Lenguaje PHP/OPERADORES LÓGICOS.txt
UD2 Lenguaje PHP/Variables,condicionales y bucles.pdf
UD3 Conexión php y mysql/Elementos de un wireframe.txt
UD4 Consultas desde PHP/borrar.php
UD4 Consultas desde PHP/carga_select.php
UD4 Consultas desde PHP/conexion_tipo.php
UD4 Consultas desde PHP/insert.php
UD4 Consultas desde PHP/update.php
UD4 Trabajo con archivos/archivo.php
UD4 Trabajo con archivos/Trabajo con archivos.txt
-->
# Desarrollo web en entorno servidor — Resumen

> Lo esencial de la 1ª evaluación: servidores (UD1), PHP (UD2), arrays del sistema, MySQL desde PHP (UD3-UD4) y trabajo con archivos. Al final tienes **lo que más cae** y los **errores de los apuntes** que no debes copiar en un examen.

## UD1 · Servidores

### Qué es un servidor web
- Programa que atiende peticiones HTTP y devuelve contenido. "Servidor" puede ser el **software** (Apache) o el **equipo** que lo ejecuta (el *host*).
- Contenido **estático** (HTML tal cual) frente a **dinámico** (se genera ejecutando PHP, Java… antes de responder).
- El navegador pide la URL, el servidor responde con HTML y después el navegador hace más peticiones (CSS, imágenes…).

### Funcionamiento interno (orden de las fases)
1. **Módulo de red**: recibe la petición.
2. **Resolución de direcciones** (preprocesado): **hosting virtual** (a qué dominio va), **direccionamiento** (¿estática o dinámica?) y **autenticación** (¿tiene permiso?).
3. **Procesamiento de respuesta**: submódulo estático o dinámico.
4. **Generación de respuesta**, que vuelve al módulo de red.

### Servidores web más usados
| Servidor | Claves |
|---|---|
| **Apache** | Libre, modular, estable, multiplataforma; PHP, Perl, JSP… |
| **IIS** | Microsoft (Windows); ASP/ASP.NET; también PHP; streaming |
| **NGINX** | Libre, alto rendimiento; también proxy (incluido de correo) |

**Criterios para elegir uno:** sistemas operativos, lenguajes de servidor compatibles, mensajes de error configurables, archivos **log**, streaming, libre o propietario, **hosts virtuales** (varios dominios en una máquina: barato, pero comparten recursos y seguridad), escalabilidad, rendimiento, autenticación y **balanceo de carga**.

### Tipos de servidores (los que suelen preguntar)
- **Archivos** (FTP/HTTP), **impresión**, **correo**, **fax**, **telefonía**.
- **Proxy**: intermediario entre la red interna e Internet; cachea y filtra (actúa como cliente y como servidor).
- **Acceso remoto (RAS)** y **VPN**; **autenticación** (802.1x, RADIUS).
- **Base de datos** (SGBD, SQL); **aplicaciones** (lógica de negocio: J2EE, JBoss, GlassFish, WebLogic, WebSphere; Zope en Python).
- **DNS**: traduce nombres de dominio a IP. **DHCP**: asigna IP automáticamente.
- **Streaming**, **reserva (standby)**, **monitorización** (SNMP), **mensajería** (XMPP, puerto **5222**), **antivirus/filtrado**, **Terminal Server**.

### Correo
- **SMTP**: envío (correo saliente).
- **POP3**: descarga los mensajes al equipo (cuentas personales).
- **IMAP**: los gestiona en el servidor sin descargarlos (cuentas corporativas).

### Seguridad
- Control de accesos físicos y remotos (FTP/TFTP) y una buena política de contraseñas.
- Permisos de carpetas compartidas; impedir subir a directorios superiores al virtual.
- **HTTPS** = HTTP sobre **SSL/TLS**. Primero un intercambio **asimétrico** (el navegador cifra una *preclave* con la clave **pública** del servidor, que la descifra con su **privada**). Después, cifrado **simétrico** con la clave acordada, porque es mucho más rápido.
- **Firewall**: aísla la LAN y solo abre los puertos necesarios; los equipos salen a Internet a través de un proxy.

### Bases de datos: alta disponibilidad
- **Servidor de reserva de solo lectura**: copia del de producción; sirve para informes y toma el relevo si el principal cae.
- **Federación**: varios servidores, cada uno con una parte de la tabla, vistos como una sola tabla.

### Nube
| Modelo | Quién gestiona qué | Ejemplo |
|---|---|---|
| **SaaS** | El proveedor gestiona todo; tú solo lo usas | Gmail, CRM online |
| **PaaS** | Tú desarrollas la aplicación sobre su plataforma | |
| **IaaS** | Tú gestionas la infraestructura (máquina virtual) | |

- **Ventajas:** pago por uso, sin inversión, acceso desde cualquier sitio, datos en tiempo real.
- **Inconvenientes:** privacidad, dependencia de Internet, problemas legales (¿qué ley se aplica?) y de propiedad de los datos.

## UD2 · PHP básico

- PHP se ejecuta **en el servidor**: el cliente solo recibe HTML y nunca ve el código. El servidor detecta la extensión `.php` y pasa la página al **intérprete PHP**.
- Variables con `$`; el tipo es dinámico (entero, decimal con punto, cadena, booleano).
- Constantes con `define("EUROS", 166.386);`, sin `$`.
- `echo` y `print` muestran texto; el operador `.` concatena.

```php
<?php
$edad = 23;  $pi = 3.14;  $nombre = "Pedro";  $cansado = true;
define("EUROS", 166.386);
echo "Edad: " . $edad . "<br>";
?>
```

### Operadores y condicionales
- Lógicos: `&&` (AND), `||` (OR), `!` (NOT). Incremento y decremento: `++`, `--`.
- `if / else / else if` y `switch` (que lleva `break` en cada `case` y `default`):

```php
switch ($dato) {
  case 23: echo "Has acertado"; break;
  case 12: echo "No"; break;
  default: echo "Dato no válido";
}
```

### Bucles
- `while`: comprueba antes, así que puede no ejecutarse nunca.
- `do … while`: comprueba después, así que se ejecuta **al menos una vez**.
- `for ($i = 0; $i < 5; $i++)`: con contador; ideal para tablas HTML.
- `break` sale del bucle; `continue` salta a la siguiente vuelta.
- `foreach` recorre arrays.

```php
// Tabla 4x4 con bucles (típico de práctica)
echo "<table border='1'>";
for ($f = 1; $f <= 4; $f++) {
  echo "<tr>";
  for ($c = 1; $c <= 4; $c++) echo "<td>$f-$c</td>";
  echo "</tr>";
}
echo "</table>";
```

### Arrays
- **Numérico**: `$t = [3, 45, 23];` y `$t[0]`. Se recorre con `for` usando `count($t)`.
- **Asociativo**: `$p = ["nombre" => "Pedro", "edad" => 23];` se recorre con `foreach ($p as $clave => $valor)`.
- **Matrices (multidimensionales)**: `$datos[1][0]`, o un array de arrays asociativos que se recorre con `foreach` anidado.

```php
foreach ($alumnos as $alumno) {
  foreach ($alumno as $campo => $valor) echo "$campo: $valor<br>";
}
```

**Funciones de arrays que piden en las prácticas:**

| Función | Qué hace |
|---|---|
| `count($a)` | Número de elementos |
| `array_push($a, $x)` / `array_pop($a)` | Añade al final / quita el último |
| `array_unshift($a, $x)` / `array_shift($a)` | Añade al principio / quita el primero |
| `in_array($x, $a)` | ¿Está el valor? (true/false) |
| `array_search($x, $a)` | Devuelve la **clave** del valor, o `false` |
| `array_sum($a)` | Suma los valores |
| `array_unique($a)` | Quita duplicados |
| `sort` / `rsort` / `asort` / `ksort` | Ordenan (por valor; `asort` mantiene claves; `ksort` ordena por clave) |
| `implode(", ", $a)` | Une el array en una cadena |
| `explode(",", $s)` | Parte una cadena en un array |

### include y require
| Instrucción | Si falla | Uso típico |
|---|---|---|
| `include("f.php")` | Aviso y **sigue** | Cabecera, menú, pie |
| `require("f.php")` | Error fatal y **se detiene** | Conexión a la base de datos |
| `include_once` / `require_once` | Igual, pero lo incluye **solo una vez** | Funciones, configuración |

## Arrays del sistema (superglobales)

### `$_POST`: datos de un formulario
- Se rellena al pulsar **submit** en `<form method="post">`.
- Cada celda se llama como el atributo **`name`** del input.
- Para recibir varios valores (checkbox), pon `name="conocimientos[]"` y PHP recibirá un array.

```php
if ($_POST) {                       // o: if ($_SERVER['REQUEST_METHOD'] === 'POST')
  $nombre = $_POST['nombre'];
  $cursos = $_POST['conocimientos'] ?? [];   // array de checkbox
}
```

### `$_GET`: datos en la URL
- Los datos viajan en la URL (`pagina.php?nombre=pepe&edad=25`), así que **no es seguro** para datos sensibles.
- Se rellena con un formulario `method="get"` o con un enlace `<a href="get2.php?eleccion=rojo">`.
- Para redirigir pasando datos: `header("Location: get2.php?edad=$edad");`.

### `$_FILES`: subida de archivos
- En el formulario: `method="post"` **y** `enctype="multipart/form-data"`, más un `<input type="file" name="archivo">`.
- Campos disponibles: `['name']`, `['type']`, `['size']`, `['tmp_name']` (archivo temporal) y `['error']` (0 = sin error).

```php
if ($_FILES['archivo']['error'] === 0) {
  $ext = strtolower(pathinfo($_FILES['archivo']['name'], PATHINFO_EXTENSION));
  if (in_array($ext, ['jpg','jpeg','png','gif']) && $_FILES['archivo']['size'] <= 2*1024*1024) {
    if (!is_dir('uploads')) mkdir('uploads');
    move_uploaded_file($_FILES['archivo']['tmp_name'], 'uploads/' . $_FILES['archivo']['name']);
  }
}
```
`move_uploaded_file()` (recomendado) o `copy()` mueven el archivo temporal a su sitio definitivo.

### `$_COOKIE`: se guarda en el **cliente**
- Sirve para recordar el usuario, el idioma o la última acción; también para la publicidad programática.

```php
setcookie("usuario", "Sara", time() + 7*24*3600);    // crear (7 días) ANTES de cualquier echo
if (isset($_COOKIE['usuario'])) echo $_COOKIE['usuario'];   // leer (en la siguiente carga)
setcookie("usuario", "", time() - 3600);             // borrar
```

### `$_SESSION`: se guarda en el **servidor**
- Datos del usuario mientras dura la sesión (login, contador de visitas…).

```php
session_start();                     // siempre lo primero de la página
$_SESSION['usuario'] = 'root';
$_SESSION['visitas'] = ($_SESSION['visitas'] ?? 0) + 1;
echo session_id();  echo session_name();
session_destroy();                   // cerrar sesión (logout)
```

> **Cookie o sesión:** la cookie la guarda el **navegador** y dura hasta que caduca; la sesión la guarda el **servidor** y dura hasta que se cierra el navegador o se hace `session_destroy()`.

## UD3-UD4 · PHP + MySQL (mysqli)

Pasos de siempre: **conectar → escribir la consulta → ejecutarla → recorrer el resultado → cerrar**.

```php
$conexion = mysqli_connect("localhost", "root", "", "lunes26");   // servidor, usuario, contraseña, base de datos
if (!$conexion) die("Error de conexión: " . mysqli_connect_error());

$resultado = mysqli_query($conexion, "SELECT * FROM alumnos");
echo "<table border='1'>";
while ($fila = mysqli_fetch_row($resultado)) {        // $fila[0], $fila[1]…
  echo "<tr><td>$fila[0]</td><td>$fila[1]</td><td>$fila[2]</td></tr>";
}
echo "</table>";
mysqli_close($conexion);
```

| Operación | SQL |
|---|---|
| Insertar | `INSERT INTO contactos (nombre, email, telefono) VALUES ('Ana','ana@x.com','600…')` |
| Consultar | `SELECT * FROM alumnos WHERE nombre LIKE 'Ana%'` |
| Modificar | `UPDATE contactos SET email='…' WHERE id=3` (**¡siempre con WHERE!**) |
| Borrar | `DELETE FROM alumnos WHERE id=3` (sin WHERE borra **todo**) |

- `mysqli_fetch_row` devuelve las columnas por número; `mysqli_fetch_assoc` las devuelve por nombre (`$fila['nombre']`).
- Pon la conexión en un archivo aparte (`conexion.php`) y cárgala con `require` en cada página.
- **Buscador con `<select>`**: un primer `SELECT` rellena las `<option>`; al enviar, un segundo `SELECT … WHERE` pinta la tabla de resultados.
- **Patrón de editar (práctica Update)**: tabla con un enlace `editar.php?id=3` → formulario con los datos actuales (sacados con `$_GET['id']`) → `UPDATE … WHERE id=…` → volver al listado con el mensaje "Registro actualizado correctamente".
- **Relación 1:N** (profesores-cursos): `cursos.codprofesor` es una **clave foránea** a `profesores.codprofesor`. Para consultar las dos tablas, usa `JOIN … ON`.
- **Buena práctica (y lo que pide el proyecto Foro)**: consultas preparadas contra la inyección SQL (`mysqli_prepare` + `bind_param`), contraseñas con `password_hash()` / `password_verify()` y codificación `utf8mb4`.

## Trabajo con archivos

```php
$f = fopen("C:/balance/octubre.txt", "a+");    // abrir con un modo
fwrite($f, "Texto" . PHP_EOL);                  // escribir
rewind($f);                                     // volver al inicio para leer
while (($linea = fgets($f)) !== false) echo $linea . "<br>";   // leer línea a línea
fclose($f);
// Atajos: file_get_contents("f.txt") / file_put_contents("f.txt", $texto, FILE_APPEND)
```

| Modo | Significado |
|---|---|
| `r` | Solo lectura |
| `r+` | Lectura y escritura (el archivo debe existir) |
| `w` | Solo escritura: **borra** el contenido o crea el archivo |
| `w+` | Como `w`, pero también lectura |
| `a` | Añadir al final (no sobrescribe; lo crea si no existe) |
| `a+` | Como `a`, pero también lectura |

Uso típico: backups o logs. Para listar los archivos de una carpeta, usa `scandir("uploads")`.

## Wireframes y diseño previo (prácticas Logging y Foro)
- **Elementos de un wireframe**: cabecera (logo, título, navegación, acceso), menú, área de contenido (cajas o `div`), imágenes (caja vacía), formularios, pie. Otros: iconos, tablas, **migas de pan**, indicadores de carga.
- **Proyecto Foro, Fase I**:
  - requisitos funcionales y no funcionales, y casos de uso (visitante, usuario registrado, administrador);
  - 8 pantallas con su **mapa de navegación**;
  - modelo E/R y relacional en **3FN** (usuarios, categorías, temas, mensajes);
  - claves primarias y foráneas con su política `ON DELETE` justificada, `UNIQUE` en el email, `DATETIME` con valor por defecto, InnoDB y utf8mb4;
  - **diccionario de datos** y `foro.sql` con datos de prueba (5 usuarios, 4 categorías, 20 temas, 60 mensajes).
- **Aplicación Logging**: `login.php` → `validar.php` (crea la cookie "Recordar mi nombre", 7 días) → `bienvenida.php` (contador de visitas) → `subirPractica.php` → `guardarPractica.php` (cookie con el último archivo entregado).

## Lo más importante para el examen
1. **Diferencias clave**:
   - `GET` (en la URL, visible) frente a `POST` (en el cuerpo de la petición);
   - cookie (en el cliente) frente a sesión (en el servidor);
   - `include` (sigue si falla) frente a `require` (se detiene);
   - `while` frente a `do…while` (este se ejecuta al menos una vez).
2. **Formulario de subida**: `enctype="multipart/form-data"`, `$_FILES[...]['tmp_name']` y `move_uploaded_file`, y validar el error, la extensión y el tamaño.
3. **Recorrer arrays** asociativos y multidimensionales con `foreach`, y las funciones `count`, `in_array`, `array_search`, `sort`, `implode` y `explode`.
4. **CRUD con mysqli**: conectar, consultar, recorrer con `while ($fila = mysqli_fetch_row(...))` y pintar una tabla HTML.
5. **Teoría de servidores**: tipos, fases del funcionamiento, Apache/IIS/NGINX, HTTPS (asimétrico y luego simétrico), SaaS/PaaS/IaaS, SMTP/POP3/IMAP.
6. Comentar el código y justificar las decisiones: lo piden en casi todas las prácticas, también al usar IA (prompts, comparativa y valoración crítica).

## Ojo: errores que aparecen en los apuntes (no los copies)
- `required("x.php")` **no existe**: es `require("x.php")`.
- `$FILES`, `$GET` y `$POST` se escriben con guion bajo: **`$_FILES`, `$_GET`, `$_POST`**.
- En el ejemplo de `foreach` de ARRAYS.txt la variable es `$nombre => $valor`, pero luego se usa `$clave`: deben coincidir.
- `if(!login)` debe ser `if(!$login)` (falta el `$`).
- `while($linea=fgets($f)!== false)` necesita paréntesis: `while(($linea = fgets($f)) !== false)`.
- `setcookie()` y `header()` tienen que ir **antes** de cualquier `echo` o HTML.
- La página de teoría de PHP dice que las variables se crean con `var` y `let`: eso es **JavaScript**. En PHP solo se usa `$`.
