<!-- archivos:
10-arrays.js
Evaluación TP.docx
-->
# Desarrollo web en entorno cliente — Resumen (JavaScript)

> Temario de la 1ª evaluación: variables y tipos, operadores, strings, condicionales, bucles, arrays, Set, Map y funciones. Los exámenes (1B y 1C, el 20 % cada uno) tienen **20 preguntas tipo test de "¿qué muestra la consola?"** y **2 ejercicios prácticos en papel**. Al final están las preguntas reales resueltas.

## 1. Variables y tipos

- `let` se puede reasignar y tiene alcance de **bloque**. `const` no se puede reasignar. `var` es el antiguo (alcance de función): evítalo.
- Una variable declarada sin valor vale **`undefined`** (`let x;`). `null` es un "vacío" que se asigna a propósito.
- **Tipos primitivos**: `number`, `string`, `boolean`, `undefined`, `null`, `bigint` (`123n`), `symbol` (`Symbol("id")`).
- `typeof`: `typeof 5` da `"number"`, `typeof "a"` da `"string"`, `typeof undefined` da `"undefined"` y **`typeof null` da `"object"`** (un fallo histórico del lenguaje que cae en examen).
- Conversiones: `Number("45")` da `45`, `String(5)` da `"5"`, `parseInt("12px")` da `12`.
- **Coerción**:
  - `"5" + 2` da `"52"`: el `+` con un string **concatena**.
  - `"5" - 2` da `3`: `-`, `*` y `/` convierten a número.

## 2. Operadores

| Tipo | Operadores |
|---|---|
| Aritméticos | `+ - * / % **` |
| Asignación compuesta | `+= -= *= /=` |
| Incremento | `x++` (devuelve el valor viejo y luego suma), `++x` (suma y luego devuelve) |
| Comparación | `== !=` (con coerción) · `=== !==` (**estricta**: valor **y** tipo) · `< > <= >=` |
| Lógicos | `&&` · `\|\|` · `!` (**`&&` va antes que `\|\|`**) |
| Ternario | `cond ? siVerdad : siFalso` |

- **Falsy** (cuentan como `false`): `false`, `0`, `""`, `null`, `undefined`, `NaN`. **Todo lo demás es truthy**, incluidos `[]`, `{}` y `"0"`.
- **Cortocircuito**:
  - `a || b` devuelve el **primer valor truthy** (o el último). Sirve para valores por defecto: `null || "Guest"` da `"Guest"`.
  - `a && b` devuelve el **primer valor falsy** (o el último): `"Hola" && "X"` da `"X"`.
- Igualdades típicas de examen:
  - `0 == false` es `true`, pero `0 === false` es `false`.
  - `undefined == null` es `true`, pero `undefined === null` es `false`.
  - `[] == false` es `true` (`[]` → `""` → `0`), y `"" == 0` es `true`.
- Año bisiesto: `(y % 4 === 0 && y % 100 !== 0) || y % 400 === 0`.

## 3. Strings

```js
let s = "  Hola JavaScript  ";
s.length              // longitud (los espacios cuentan)
s.trim()              // quita los espacios de los extremos
s.toUpperCase() / s.toLowerCase()
s[0]  /  s[s.length - 1]          // primer y último carácter
s.includes("Java")    // true/false
s.startsWith("LIC-") / s.endsWith(".com")
s.indexOf("a")        // primera posición, o -1 si no está
s.indexOf("a", 2)     // empieza a buscar desde la posición 2
s.lastIndexOf("a")    // última posición
s.slice(0, 4)         // del índice 0 al 3 (el final no se incluye)
s.slice(-3)           // los 3 últimos caracteres
s.substring(0, 10)    // como slice, pero sin negativos
s.replace("a", "b") / s.replaceAll(" ", "-")
s.split(" ")          // separa en un array
`Hola ${nombre}`      // template literal: interpola variables y expresiones
```
Los métodos se pueden **encadenar** y se leen de izquierda a derecha: `" JS-2026 ".trim().toLowerCase().length` da `7`.

## 4. Condicionales

```js
if (edad >= 18) { … } else if (edad >= 16) { … } else { … }

let estado = stock > 0 ? "Disponible" : "Agotado";       // ternario
let nota = p >= 90 ? "Sobresaliente" : p >= 70 ? "Notable" : "Aprobado"; // ternario en cascada

switch (rol.toLowerCase()) {
  case "administrador":
  case "supervisordb":        // casos agrupados
    console.log("Acceso total"); break;
  case "invitado":
    console.log("Solo lectura"); break;
  default:
    console.log("Rol no reconocido");
}
```
**Si falta un `break`, hay *fall-through***: la ejecución sigue con los `case` siguientes hasta el próximo `break`.

## 5. Bucles

```js
for (let i = 1; i <= 20; i++) { … }          // con contador
while (cond) { … }                           // comprueba antes
do { … } while (cond);                       // se ejecuta al menos una vez
for (const x of array) { … }                 // VALORES de un array, string, Set o Map
for (const clave in objeto) { … }            // CLAVES de un objeto
break;    // sale del bucle
continue; // pasa a la siguiente vuelta
```
Ejercicios típicos: sumar del 1 al 100, contar vocales, invertir un string, Fibonacci, tabla de multiplicar, filtrar los mayores de 10.

## 6. Arrays

```js
let a = ["Ana", "Carlos", "Bea", "David"];
a.push("Mateo")         // añade al FINAL y devuelve la nueva longitud
a.pop()                 // quita el ÚLTIMO y lo devuelve
a.unshift("Zoe", "Leo") // añade al PRINCIPIO
a.shift()               // quita el PRIMERO y lo devuelve
a.length
a.slice(1, 4)           // COPIA de los índices 1 a 3 (no modifica a)
a.splice(1, 3)          // ELIMINA 3 elementos desde el índice 1 (sí modifica a)
a.splice(2, 1, "Nuevo") // sustituye 1 elemento en el índice 2
a.includes("Bea") / a.indexOf("Bea")
a.join(", ")
```
- `new Array(3)` crea un array **vacío de longitud 3**, mientras que `[3]` es un array con el número 3.
- `slice` **no** modifica el array original; `splice` **sí**.

## 7. Set: valores únicos

```js
const correos = new Set(["a@x.com", "b@x.com", "a@x.com"]); // los duplicados se eliminan solos
correos.add("root@daw.com");  correos.has("a@x.com");  correos.delete("b@x.com");
correos.size;               // ¡size, no length!
const lista = [...correos]; // o Array.from(correos): vuelve a ser un array
```

## 8. Map: pares clave → valor

```js
const perfil = new Map([["nombre", "Lucía"], ["rol", "Estudiante"], ["edad", 22], ["activo", true]]);
perfil.set("alias", "Lucy");  perfil.set("rol", "Desarrolladora"); // añade o actualiza
perfil.get("nombre");  perfil.has("edad");  perfil.delete("activo");
perfil.size;  [...perfil.keys()];  [...perfil.values()];
for (const [clave, valor] of perfil) console.log(clave, valor);
perfil.clear();  perfil.size === 0;   // true
```
Para calcular la media de un array guardado en un Map: `const media = notas.reduce((s, n) => s + n, 0) / notas.length;` (o con un bucle `for…of` y un acumulador).

## 9. Funciones

```js
function suma(a, b) { return a + b; }                 // declaración
const resta = function (a, b) { return a - b; };      // expresión (anónima)
const doble = n => n * 2;                             // flecha
function salario(horas = 40, tarifa = 15) { … }       // parámetros por defecto
```
- Una función devuelve `undefined` si no tiene `return`.
- Funciones de los ejercicios: suma, mayor de un array, contar vocales, pasar a mayúsculas, ¿es primo?, elementos comunes, suma de pares, cuadrados, invertir palabras, factorial.

```js
const esPrimo = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
const invertirPalabras = s => s.split(" ").reverse().join(" ");
const comunes = (a, b) => a.filter(x => b.includes(x));
```

## 10. Preguntas de examen resueltas (Evaluación 1B / 1C)

| # | Código (resumido) | Respuesta | Por qué |
|---|---|---|---|
| 1 | `" JS-2026 ".trim().toLowerCase().length` | **7** | `trim` quita los 2 espacios |
| 2 | `switch(2)` sin `break` en el case 2; puntos = 10 | **60** | fall-through: +20 (case 2) y +30 (case 3) |
| 3 | `!true \|\| 3 > 3 && 3 <= 5` | **false** | `&&` va primero: `false && …` es false; `false \|\| false` |
| 4 | `"5" + 2` y `"5" - 2` | **52 y 3** | `+` concatena; `-` convierte a número |
| 5 | `[] == false`, `[] === false`, `"" == 0` | **true, false, true** | coerción con `==` |
| 6 | `"/api/v1/users"`: startsWith, indexOf("admin"), includes("v1") | **true, -1, true** | `-1` = no encontrado |
| 7 | `0 \|\| "Predeterminado"` y luego `"Hola" && mensaje` | **"Predeterminado"** | `0` es falsy; `&&` devuelve el último valor si todos son truthy |
| 8 | `"Secur3Pass"`: length, `[4]`, último | **10, r, s** | índices desde 0 |
| 9 | if anidado, x = 10, y = 20 | **B** | x > 5 sí; y < 15 no |
| 10 | ternario en cascada con 75 | **Notable** | |
| 11 | `c=5; c++ + ++c` | **12 y 7** | `c++` vale 5 (c pasa a 6); `++c` vale 7 |
| 12 | `substring(0,10)` y `slice(-3)` | **Desarrollo, Web** | |
| 13 | `let stock; if (stock)` | **Sin stock o indefinido** | `undefined` es falsy |
| 14 | `"JavaScript".indexOf("a",2)` y `lastIndexOf("a")` | **3 y 3** | J0 a1 v2 **a3** S4… (en el 1B no estaba la opción correcta; en el 1C es la E) |
| 15 | `(a&&b) \|\| (c&&!b) && (a\|\|c)` | **true** | |
| 16 | `Number("199.99") + 20`, typeof y `toFixed(1)` | **number y "220.0"** | `toFixed` redondea (ninguna opción lo pone exacto; la más cercana es "220") |
| 17 | temp = 30, humedad = 80 | **Alerta Naranja** | la 1ª condición falla (80 > 85 es falso) |
| 18 | `null \|\| "Guest_01" \|\| "Admin"` | **Guest_01** | el primer valor truthy |
| 19 | template literal | **Total a pagar por 3 Laptop(s): 2400€** | |
| 20 | `typeof null`, `typeof undefined`, `null === undefined` | **object, undefined, false** | |

Del test teórico (Evaluación TP):
- `" app_server ".trim().toUpperCase().length` da **10**.
- `let x;` vale **undefined**.
- Para comprobar el prefijo de un token: **`startsWith("Bearer ")`**.
- `""` es **falsy**.
- `let nombre-Dia` es un **error de sintaxis**: los nombres no pueden llevar guion.

## 11. Ejercicios prácticos del examen (solución modelo)

```js
// Ejercicio 1: tarifa de envío
if (typeof pesoKg !== "number") {
  console.log("Error: El peso debe ser un número");
} else {
  let costo;
  switch (zona) {
    case "Nacional": costo = pesoKg * 5; break;
    case "Internacional": costo = pesoKg * 12; break;
    default: costo = 50; console.log("Zona desconocida, tarifa fija aplicada");
  }
  if (esUrgente) costo += 15;
  if (pesoKg > 10) costo *= 0.90;
  console.log("El costo total del envío es: " + costo);
}

// Ejercicio 2: descuentos por antigüedad
if (typeof aniosAntiguedad !== "number" || typeof montoFactura !== "number") {
  console.log("Error en los datos de entrada");
} else {
  if (codigoSocio === "PREMIUM" && aniosAntiguedad >= 5) montoFactura -= 40;
  else if (codigoSocio !== "PREMIUM" && montoFactura >= 200 && aniosAntiguedad >= 2) montoFactura *= 0.85;
  else if (montoFactura > 500) montoFactura -= 60;
  const estadoMensaje = aniosAntiguedad > 3 ? "Cliente Fidelecido" : "Cliente Regular"; // copia el texto tal cual viene en el enunciado
  console.log("Perfil: " + estadoMensaje + " | Total a pagar: " + montoFactura);
}
```
**Claves para la nota:** valida el tipo primero con `typeof`, respeta el **orden** de las condiciones (`if / else if / else`), usa los operadores que pide el enunciado (`-=`, `*=`) y escribe el mensaje **exactamente** como se pide.

## Lo más importante para el examen
1. **Coerción e igualdades**: `+` con strings, `==` frente a `===`, valores falsy, `typeof null`.
2. **Precedencia**: `&&` va antes que `||`; diferencia entre `x++` y `++x`.
3. **Índices de strings**: empiezan en 0; en `slice` y `substring` el final no se incluye; `indexOf` devuelve -1 si no encuentra.
4. **switch sin break**: fall-through.
5. **Arrays**: `push/pop` (final), `unshift/shift` (principio), `slice` (copia) frente a `splice` (modifica).
6. **Set** (`size`, `has`, quita duplicados) y **Map** (`set/get/has/delete/size/keys/values/clear`).
7. Saber escribir **a mano** un ejercicio con `typeof`, `switch`, `if/else if` y un ternario: el práctico se hace en papel y con bolígrafo.
