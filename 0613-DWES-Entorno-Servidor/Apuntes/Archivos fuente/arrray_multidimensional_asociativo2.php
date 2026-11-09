<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Documento sin título</title>
</head>
<?php
$jugadores_futbol=array("Contacto1"=>array("Nombre"=>"Santiago","Dirección:"=>"Ctra N II Km7","Móvil"=>"629352604"),

"Contacto2"=>array("Nombre"=>"David","Dirección:"=>"Gran via,16","Móvil"=>"634352604"),

"Contacto3"=>array("Nombre"=>"Lucia","Dirección:"=>"Canarias,52","Móvil"=>"6º2345678"));

/*recorrer el array con foreach*/
foreach($jugadores_futbol as $indice1)
			{
			foreach($indice1 as $indice3=>$valor)
					{
					echo($valor."<br>");	
					}
			
		
			}
			



?>

<body>
</body>
</html>