<?php

include("conexion_tipo.php");
//cargamos el archivo
//$conexion=mysqli_connect("localhost","root","","lunes26");
//creamos la consulta de borrar
$consulta="DELETE FROM ALUMNOS";

//lanzamos la consulta
$resultado=mysqli_query($conexion,$consulta);



echo("Se han eliminado los registros");


?>