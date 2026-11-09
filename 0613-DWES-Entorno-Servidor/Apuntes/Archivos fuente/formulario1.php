<?php
//coprobamos que el $_POST se ha creado
if($_POST)
{
//cogemos los datos de la celda del formulario
$nombre=$_POST['nombre'];
$apellidos=$_POST['apellidos']; 
echo("Nombre: " . $nombre);
echo("Apellidos:" .$apellidos);
}
else
{
echo("Error de conexión!!!!!");    
}


?>