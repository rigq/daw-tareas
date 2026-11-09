<!doctype html>
<html>
<head>
</head>

<body>
<?php
/*creamos la cadena de conexión*/
$conexion=mysqli_connect("localhost","root","","lunes26");

/*creamos la consulta select */
$consulta="select nombre from alumnos";

/*lanzamos consulta */
$resultado=mysqli_query($conexion,$consulta);

/*analizamos si falla la consulta */
if($resultado)
    {
        echo("La consulta se ejecuta correctamente");
    }
else
    {
        echo("la consulta ha fallado");
    }

/*construimos el formulario */
echo("<form method='post' action='carga_select.php'>");
echo("<h1>Buscador de alumnos</h1>");
echo("<br>Seleccione un alumno");
echo("<select name='nombre'>");
echo("<option value='seleccionar'>"."Seleccione"."</option>");

/*analizamos la consulta, que devuelve x filas, guardar los 
datos que devuelve en cada opción de la lista */
while($filas=mysqli_fetch_row($resultado))
    {
    /*cargamos la lista de valores */
    echo("<option value='$filas[0]'>".$filas[0]."</option>");
    }
echo("</select>");
echo("<input type='submit' value='buscar'>");

/*mostramos el resultado en una tabla cuando se pulsa el boton de buscar*/
if($_POST)
{
/*tenemos el nombre del elemento seleccionado */
$nombreseleccionado=$_POST['nombre'];
/*lanzamos la nueva query */
$consulta2="select * from alumnos where nombre like '$nombreseleccionado'";

/*$consulta2="select nombre from alumnos where nombre like '$nombreseleccionado'";*/
$resultado2=mysqli_query($conexion,$consulta2);

echo("<table border='1'>");
echo("<tr>");
echo("<td>IDALUMNO</td>");
echo("<td>NOMBRE</td>");
echo("<td>APELLIDOS</td>");
 /*pintamos la tabla con el resultado de la consulta */
while($filas2=mysqli_fetch_row($resultado2))
    {
    echo("<tr><td>".$filas2[0]."</td><td>".$filas2[1]."</td><td>".$filas2[2]."</td></tr>");    
    }
echo("</table>");
}
mysqli_close($conexion);



?>


</body>
</hmtl>

