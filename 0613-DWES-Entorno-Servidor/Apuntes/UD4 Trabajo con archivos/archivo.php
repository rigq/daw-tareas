<?php

//lanzamos una orden para que abra el archivo
//si no existe lo crea

$archivo=fopen("C:\datos\misdatos.txt","a+");

//escribir en el archivo 
fwrite($archivo,"Texto desde PHP");
fwrite($archivo,"Texto2 desde PHP" .PHP_EOL);

//recorrer el archivo fgets

while($linea=fgets($archivo)!== false)
    {
    echo $linea."<br>";

    }



?>