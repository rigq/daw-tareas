<!doctype html>
<html>

<head>

</head>


<body>
<h2>Include </h2>
<?php
include("include.php");
?>

<h2>Required</h2>
<?php
required("requireddd.php");
?>

<h2>Texto desde bloc de notas</h2>
<br>
<?php
echo("<table border=''2><tr><td><p align='center'>");
include("texto.txt");
echo("</p></td></table>");
?>

</body>



</html>