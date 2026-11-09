<?php

//conexion
$conexion=mysqli_connect("localhost","root","","lunes26");

//query
$consulta="UPDATE alumnos set nombre='Luis Miguel' where nombre='Luis'";

//lanzamos la query
$resultado=mysqli_query($conexion,$consulta);

echo("Los datos se han actualizado correctamente");

//mostramos los datos de la tabla
$consulta2="SELECT * FROM ALUMNOS";

//lanzamos la segunda query
$resultado2=mysqli_query($conexion,$consulta2);
echo("<table border='1'>");
echo("<tr><td>ID</td>");
echo("<td>NOMBRE</td>");
echo("<td>APELLIDOS</td></tr>");

while($filas=mysqli_fetch_row($resultado2))
    {
   echo("<tr><td>".$filas[0]."</td>");
   echo("<td>".$filas[1]."</td>");
   echo("<td>".$filas[2]."</td></tr>");
   }
   echo("</table>");






?>