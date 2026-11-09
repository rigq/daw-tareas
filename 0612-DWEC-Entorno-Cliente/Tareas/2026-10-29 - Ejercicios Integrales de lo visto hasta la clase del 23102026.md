# Ejercicios Integrales de lo visto hasta la clase del 23/10/2026

- **Módulo:** 0612. Desarrollo web en entorno cliente
- **Sección:** 1ª Evaluación
- **Apertura:** 23/10/2026 00:00
- **Cierre:** 29/10/2026 23:00
- **Estado de la entrega:** Todavía no se han realizado envíos
- **Calificación:** Sin calificar
- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=66807

## Enunciado

1. Sistema de Gestión de Inventario para una Tienda Online

- 
Enunciado:

- 
Declara variables utilizando let y const para almacenar la información de la tienda (nombre, año de fundación con BigInt, y estado de apertura con boolean).

- 
Crea un Array inicial con al menos 5 productos (strings) y utiliza los métodos push y pop para actualizar el catálogo base. 

- 
Convierte ese array en un Set para asegurarte de que no existan productos duplicados. 

- 
Utiliza un bucle for...of para recorrer el Set y mostrar cada producto disponible en la consola. 

2. Plataforma de Análisis de Calificaciones Escolares

- 
Enunciado:

- 
Crea un Map donde las claves sean nombres de estudiantes y los valores sean arrays con 4 notas numéricas cada uno (del 0 al 10).

- 
Añade un nuevo estudiante usando el método set y comprueba si existe un estudiante en específico con has. 

- 
Recorre el Map utilizando un bucle for...of. 

- 
Dentro del bucle, utiliza operadores aritméticos para calcular el promedio de notas de cada alumno, y operadores de comparación junto con una estructura if para determinar si el estudiante está "Aprobado" (promedio $\ge 6$) o "Reprobado". Imprime el resultado usando template literals.

3. Simulador de Control de Acceso a un Concierto Exclusivo

- 
Enunciado:

- 
Declara variables para el aforo máximo (number), el identificador de seguridad (Symbol), y el estado de la puerta (boolean). 

- 
Crea un Set con los correos de usuarios VIP que tienen acceso garantizado. 

- 
Crea un Array con una lista de intentos de acceso (correos electrónicos, algunos repetidos y otros incorrectos).

- 
Utiliza un bucle for tradicional para recorrer el array de intentos. 

- 
Dentro del bucle, utiliza el método has del Set para validar si el asistente puede entrar, empleando operadores lógicos para denegar el acceso si el aforo ya se ha completado. Usa break si ocurre una alerta de seguridad (por ejemplo, un intento malicioso detectado). 

4. Gestor de Tareas Pendientes (To-Do List Avanzada)

- 
Enunciado:

- 
Crea un Array vacío para almacenar las tareas iniciales y utiliza unshift y shift para organizar las tareas prioritarias del día. 

- 
Utiliza el método splice para modificar una tarea intermedia en el array y slice para extraer las primeras tareas de la mañana. 

- 
Pasa el array final a un Set para eliminar tareas duplicadas por error. 

- 
Implementa un bucle while que simule la ejecución de las tareas una a una: en cada iteración del bucle, resta la longitud del set utilizando operadores aritméticos y de comparación hasta que todas las tareas hayan sido completadas (tamaño 0).

5. Directorio de Empleados y Control de Salarios

- 
Enunciado:

- 
Crea un Map donde la clave sea el ID del empleado (string o number) y el valor sea un objeto o array con su nombre, puesto y sueldo.

- 
Utiliza los métodos keys() y values() del Map para obtener los listados por separado. 

- 
Implementa un bucle for...of para recorrer el Map. 

- 
Utiliza operadores aritméticos y de comparación para aplicar un aumento salarial del 10% exclusivamente a aquellos empleados cuyo sueldo actual sea menor a una cantidad específica, saltando a los demás mediante el uso de continue.

6. Sistema de Autenticación de Intentos Fallidos

- 
Enunciado:

- 
Declara las credenciales del sistema (usuario correcto y contraseña correcta usando tipos string).

- 
Crea un bucle do...while que simule un panel de inicio de sesión que se ejecute al menos una vez. 

- 
Dentro del bucle, define un contador de intentos fallidos utilizando operadores aritméticos (++).

- 
Utiliza operadores lógicos (&&, ||) para validar si el usuario introdujo bien los datos o si superó el límite máximo de 3 intentos permitidos. Si supera el límite, usa un bucle con break para bloquear el acceso de forma definitiva.

7. Análisis de Frecuencia de Caracteres en un Mensaje Secreto

- 
Enunciado:

- 
Define una variable string con una frase o mensaje codificado.

- 
Utiliza un bucle for...of para recorrer cada carácter de la cadena de texto. 

- 
Almacena las letras únicas encontradas en un Set utilizando el método add. 

- 
Crea un Map para contar cuántas veces aparece cada vocal analizando los elementos con operadores de comparación y estructuras condicionales dentro del mismo bucle, mostrando el reporte final en consola.

8. Torneo de Videojuegos: Registro y Puntuaciones

- 
Enunciado:

- 
Utiliza un Map para registrar los nombres de los jugadores y un Array con las puntuaciones obtenidas en 3 rondas.

- 
Añade, elimina (delete) y comprueba (has) jugadores utilizando los métodos propios de los Map. 

- 
Recorre el Map mediante un bucle for...of. 

- 
Utiliza operadores aritméticos para sumar las puntuaciones de cada array interno y operadores de comparación para declarar al ganador que obtenga la puntuación más alta acumulada.

9. Control de Stock en Almacenes Múltiples

- 
Enunciado:

- 
Crea un Array con los códigos de barras de los productos disponibles en la central.

- 
Transforma ese array en un Set para depurar entradas duplicadas en el sistema de inventario. 

- 
Implementa un bucle for clásico para recorrer el inventario combinándolo con operadores lógicos. 

- 
Si el código de barras coincide con una lista de productos prohibidos almacenada en un Set secundario, utiliza continue para ignorarlo, o break si se detecta un lote completamente corrupto, imprimiendo el estado final del almacén.

10. Centro de Procesamiento de Datos Multiestructura (Proyecto Cierre)

- 
Enunciado:

- 
Diseña un script que integre: variables primitivas (let, const, tipos de datos especiales como BigInt y Symbol), operadores aritméticos, de comparación y lógicos. 

- 
Declara un Array para almacenar registros en bruto, manipúlalo usando push, pop, splice y conviértelo posteriormente en un Set. 

- 
Vincula la información limpia a un Map estructurado por categorías. 

- 
Utiliza una combinación de bucles (for...of y while) junto con sentencias de control de flujo (break, continue) para procesar la información del Map y generar un informe automatizado completo en consola.

## Mi solución

_Guarda aquí (en esta misma carpeta o en una subcarpeta) tu código y notas._
