# Ejercicios de Tarea Evaluados.

- **Módulo:** 0612. Desarrollo web en entorno cliente
- **Sección:** 1ª Evaluación
- **Apertura:** 05/11/2026 00:00
- **Cierre:** 13/11/2026 00:00
- **Estado de la entrega:** Todavía no se han realizado envíos
- **Calificación:** Sin calificar
- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=68320

## Enunciado

Tenemos 4 Ejercicios que incluyen el ytemario visto en Clase hasta hoy 05/11/26

El ejercicio 1 debe ser entregado mañana 06/11/26 en papel escrito a bolígrafo 

El ejercicio 2 debe ser resuelto y entregado mañana 06/11/26 en clase en papel escrito a bolígrafo 

El ejercicio 3 y 4 debe ser entregado el jueves 12/11/26 en papel escrito a bolígrafo 

Ejercicio 1: Control de Acceso y Gestión de Filas en una Atracción

Crea un programa en JavaScript que gestiona una lista de espera para una atracción basada en las siguientes operaciones secuenciales:

- 
Se parte de una lista inicial de personas en espera cuyos nombres son: , , y . "Ana" "Carlos" "Bea""David"

- 
Incorpora de golpe dos personas nuevas al principio de la lista ( "Zoe"y "Leo"), y posteriormente añade a una persona más al final de la misma ( "Mateo").

- 
Por motivos de aforo, la última persona que se agregó al final de la lista debe ser retirada y eliminada de la estructura.

- 
Asimismo, la primera persona de la lista debe ser atendida y retirada de la misma, mostrando su nombre por consolación.

- 
Recorra la lista resultante elemento por elemento mediante una estructura repetitiva. Para cada posición numérica de la iteración, evalúe si el índice es par para mostrar un mensaje de acceso preferente, o impar para mostrar un acceso estándar.

- 
Extrae y muestra de forma independiente únicamente un subconjunto de la lista que contiene exclusivamente a los elementos ubicados entre la segunda y la cuarta posición (considerando los límites estándar de indexación).

Ejercicio 2: Sistema de Cálculo de Nóminas y Niveles Salariales

Desarrolla un sistema mediante funciones para calcular,clasificar y bonificar el salario de los trabajadores de una empresa:

- 
Defina una función principal que reciba dos parámetros obligatorios:las horas trabajadas y la tarifa por hora.Si al invocar la función no se proporciona alguno de estos valores,deben tomar por defecto 40horas y una tarifa de 15euros respectivamente.

- 
Dentro de la función,calcula el salario bruto multiplicando las horas por la tarifa.Si las horas trabajadas superan las40,el exceso de horas debe calcularse aplicando una asignación especial utilizando operadores aritméticos y de asignación combinadas.

- 
Almacena en una constante una función anónima que recibe el salario bruto calculado y devuelva una clasificación del empleado utilizando operadores lógicos y de comparación: si el salario se encuentra en un rango determinado (por ejemplo,mayor o igual a1000y menor a2000,o superior a este último),de devolver etiquetas como"Nivel Medio", "Nivel Alto"o"Nivel Básico".

- 
Implementa una estructura condicional múltiple basada en un código numérico de departamento (1para Administración, 2para Desarrollo, 3para Sistemas) para sumar un complemento fijo al resultado final impreso por consola.

Ejercicio 3: Registro y Validación de Correos Únicos

Diseña un sistema para validar la unicidad y el filtrado de correos electrónicos que se registran en una plataforma web:

- 
Parte de una colección inicial de correos ingresados ​​que contiene valores repetidos: "admin@daw.com", "user1@daw.com", "admin@daw.com", "user2@daw.com"y "user1@daw.com".

- 
Almacena dicha colección de manera que se eliminan automáticamente los elementos duplicados.

- 
Comprueba mediante una verificación directa si el correo"root@daw.com"se encuentra dentro de la estructura de datos única.Si no está presente,Agrégalo de manera inmediata.

- 
Transforma la estructura de datos única de vuelta a una estructura secuencial indexada tradicional para poder recorrerla.

- 
Emplea una estructura iterativa de recorrido directo sobre los elementos para evaluar cada correo:si el correo contiene una longitud de caracteres mayor a12,imprime el correo formateado; si el correo coincide exactamente con"user2@daw.com",salta esa iteración específica utilizando una estructura de control de salto,y detén por completo el bucle si se encuentra un caso crítico determinado.

Ejercicio 4: Perfil de Usuario Avanzado mediante Pares Asociativos

Crea un programa que gestione la información detallada de un perfil de usuario utilizando estructuras de almacenamiento basadas en clave-valor:

- 
Inicializa una estructura de datos asociativa que almacene los siguientes pares clave-valor iniciales: con valor , con valor , con valor y con valor . "nombre""Lucía" "rol""Estudiante" "edad"22"activo"true

- 
Agrega una nueva propiedad con clave "alias"y valor "Lucy", y actualiza el valor de la clave "rol"a "Desarrolladora".

- 
Consulta y muestra por consola de forma independiente el valor asociado a la clave"nombre"y verifica mediante una comprobación booleana si la clave"edad"existe en la estructura.

- 
Elimina la propiedad correspondiente a la clave "activo".

- 
Obtiene y muestra mediante comandos específicos el total de elementos almacenados actualmente en la estructura asociativa,así como la lista completa de todas sus claves y todos sus valores de manera independiente.

- 
Finalmente,Limpia por completo la estructura asociativa y verifica mediante una comprobación de que su tamaño real 0.

## Mi solución

_Guarda aquí (en esta misma carpeta o en una subcarpeta) tu código y notas._
