<?php

//mostramos las propiedades del array $FILES
echo("Nombre:" .$_FILES['archivo']['name']);
echo("<br>Tipo:" .$_FILES['archivo']['type']);
echo("<br>Tamaño:" .$_FILES['archivo']['size']);
echo("<br>Archivo Temporal:".$_FILES['archivo']['tmp_name']);
echo("<br>Error:".$_FILES['archivo']['error']);




?>


