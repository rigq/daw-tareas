# Ejercicios combinados de Array, Sets, Loops, Map, y Function

- **Módulo:** 0612. Desarrollo web en entorno cliente
- **Sección:** 1ª Evaluación
- **Apertura:** 12/11/2026 00:00
- **Cierre:** 20/11/2026 00:00
- **Estado de la entrega:** Todavía no se han realizado envíos
- **Calificación:** Sin calificar
- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68977

## Enunciado

Ejercicio 1: Bucles y Funciones Flecha básicas

-
Bucle for: Crea un array con 4 nombres de servicios de red (ej: "DNS", "DHCP", "FTP", "SSH") y recórrelo con un bucle for clásico imprimiendo por consola: Servicio activo: [nombre].

-
Bucle while: Implementa un bucle while que simule 3 intentos de conexión, imprimiendo en cada iteración Intento número [i].

-
Función Flecha: Escribe una función flecha que reciba el nombre de un equipo y devuelva o imprima el mensaje: Conectado exitosamente a [equipo]. Pruébala con dos nombres diferentes.

Ejercicio 2: Mapas y Sets básicos

-
Creación de un Set: Crea un Set que almacene 4 direcciones IP (en formato string). Añade una IP repetida y comprueba con .has() si una IP concreta existe en el Set.

-
Creación de un Map: Crea un Map que relacione la configuración básica de un servidor con las siguientes claves: ["host", "server01"], ["ip", "192.168.1.10"], ["puerto", 80].

-
Consulta y Tamaño: Utiliza el método .get() para mostrar la IP del servidor por consola y muestra el número total de elementos que tiene el mapa usando .size.

Ejercicio 3: Manipulación avanzada de Arrays (push, pop, slice, splice)

-
Enunciado: Partiendo de un array inicial con 5 números de puertos de red comunes: [21, 22, 80, 443, 3306]:

-
Utiliza .unshift() para añadir el puerto 53 al inicio y .push() para añadir el puerto 8080 al final.

-
Utiliza .slice() para extraer un nuevo array que contenga únicamente los elementos desde la posición 2 hasta la 4 (exclusiva), mostrando el resultado sin modificar el array original.

-
Utiliza .splice() para eliminar 2 elementos a partir de la posición 1 del array principal y añade en su lugar el puerto 25. Imprime el estado final del array.

Ejercicio 4: Conversión de Estructuras y Orden Superior (Set a Array y forEach)

-
Enunciado: Trabajar con colecciones de datos duplicados y funciones de orden superior:

-
Define un array con registros de conexiones que contenga IPs repetidas: ["10.0.0.1", "10.0.0.2", "10.0.0.1", "10.0.0.3", "10.0.0.2"].

-
Convierte dicho array en un Set para eliminar automáticamente los duplicados, y a continuación vuelve a convertir ese Set en un nuevo array utilizando Array.from().

-
Utiliza el método .forEach() junto con una función flecha para recorrer el array limpio e imprimir por consola un mensaje simulando el análisis de cada IP única.

Ejercicio 5: Lógica combinada con Mapas, Bucles y Control de Flujo (break / continue)

-
Enunciado: Simulación de auditoría de puertos utilizando estructuras de datos y control de flujo:

-
Crea un Map que almacene pares de clave-valor con nombres de servicios y sus respectivos puertos (ej: ["SSH", 22], ["HTTP", 80], ["HTTPS", 443], ["FTP", 21], ["RDP", 3389]).

-
Recorre el Map utilizando un bucle for...of (iterando sobre sus entries o usando forEach).

-
Dentro del bucle, añade una condición: si el puerto es menor de 100, imprime Puerto privilegiado detectado: [puerto], utiliza continue para saltar el resto de la iteración si es necesario, o usa un break para detener la ejecución si encuentras un puerto específico (por ejemplo, el 3389).

## Mi solución

_Guarda tu código y notas en la carpeta `2026-11-20 - Ejercicios combinados de Array, Sets, Loops, Map, y Function/`, junto a los adjuntos._
