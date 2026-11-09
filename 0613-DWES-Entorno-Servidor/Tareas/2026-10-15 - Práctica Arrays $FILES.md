# Práctica Arrays $FILES

- **Módulo:** 0613. Desarrollo web en entorno servidor
- **Sección:** 1ª Evaluación
- **Apertura:** 13/10/2026 09:30
- **Cierre:** 15/10/2026 14:30
- **Estado de la entrega:** Todavía no se han realizado envíos
- **Calificación:** Sin calificar
- **En el campus:** https://campus.digitechfp.com/mod/assign/view.php?id=65064

## Enunciado

PAUTAS REALIZACIÓN ACTIVIDAD GUIADA

1.Diseñar el formulario, en un documento php.

(formulario.php)

-Asignar name a todos los controles de formulario, porque esa referencia será el nombre de la celda del array $_POST, y $_GET.

-Agregamos el código if($_POST), y almacenamos los valores en variables.

2.plantilla, diseñamos la estructura con capas div, como lo hacemos habitutalmente.

Dentro de la capa, utilizamos php para coger los datos de los arrays, $_GET.

EJ.

<div>

<?php

$imagen=$_GET['foto'];

echo("<img src='$imagen'">);

?>

</div>

Como $_GET, me permite pasar los datos a través de la url, tenemos que pasar los parámetros cuando pulsamos el botón.

<a href="plantilla.php?file=<?=$nombrefoto?>&file2=<?=$texto1?>&file3=<?=$texto2?>&file4=<?=$texto3?>&file5=<?=$texto4?>?>"><input type="BUTTON" name="b1" value="Ver plantilla"></a>

2.Configurar el código para conseguir subir una copia del archivo al servidor.

-Utilizamos el $_FILES, para seleccionar el archivo y crear el archivo temporal.

-Método copy, lanzamos la orden de que copie el archivo en el directorio especificado.

if($_POST)

{

$temporal=$_FILES["foto"]["tmp_name"];

$archivo=$_FILES["foto"]["name"];

$copia="C:xampp/htdocs/img/".$archivo;

copy ($temporal,$copia);

echo("El archivo se ha subido con éxito");

echo("<br>".$archivo);

}

- Práctica SFILES,include y required.pdf 
13 de octubre de 2026, 10:38

## Archivos adjuntos

- [Práctica SFILES,include y required.pdf](2026-10-15%20-%20Pr%C3%A1ctica%20Arrays%20%24FILES/Pr%C3%A1ctica%20SFILES%2Cinclude%20y%20required.pdf)

## Mi solución

_Guarda tu código y notas en la carpeta `2026-10-15 - Práctica Arrays $FILES/`, junto a los adjuntos._
