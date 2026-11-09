

<?php
//creamos la conexión
$conexion=mysqli_connect("localhost","root","","lunes26");

$consulta="INSERT INTO ALUMNOS VALUES(10,'LUIS','GOMEZ GOMEZ')";

$resultado=mysqli_query($conexion,$consulta);

if($resultado)
    {
        echo("El registro se ha insertado correctamente!!!");
    }

//Tendremos que realizar una select para ver si el registro se ha insertado

//segunda consulta
$consulta2="SELECT * FROM ALUMNOS";
$resultado2=mysqli_query($conexion,$consulta2);

//pintamos los datos
echo("<table border='1'><tr>");
echo("<td>Id</td>");
echo("<td>Nombre</td>");
echo("<td>Apellidos</td></tr>");

if(empty($resultado2))
    {
        echo("no hay datos");
    }

while($fila=mysqli_fetch_row($resultado2))
    {
    echo("<tr><td>".$fila[0]."</td>");
    echo("<td>".$fila[1]."</td>");
    echo("<td>".$fila[2]."</td></tr>");
    
    
    }
echo("</table>");


?>