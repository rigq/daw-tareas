<!doctype html>
<html>
    <head>
</head>
<?php

error_reporting(1);

if($_POST)
    {
//La copia se realiza cuando se pulsa el botón de enviar
//Creamos una variable para guardar el archivo y el archivo temporal
$archivo1=$_FILES['archivo']['name'];
$temporal=$_FILES['archivo']['tmp_name'];


//cogemos el nombre del archivo para posteriormente copiarlo
$nombrearchivo=$archivo1;
echo($nombrearchivo);
$copia="C:/xampp/htdocs/EjerciciosPHP/".$nombrearchivo;
echo($copia);

//Utilizamos la función copy para realizar la copia
//copy($temporal,$copia);
move_uploaded_file($temporal,$copia);
if(move_uploaded_file($temporal,$copia))
    {
echo("archivo subido correctamente");
    }
else{
echo("archivo no se ha subido correctamente");

 }
    
?>

<body>
    <h1>Formulario php</h1>
    <br>
    <form method="post" action="files1.php" enctype="multipart/form-data">
    Selecciona un documento
    <input type="file" name="archivo">
    <input type="submit" value="subir archivo">
    


    </form>
</body> 
</html>