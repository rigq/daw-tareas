// Ejercicio 1: Bucles y funciones flecha básicas

// 1. Bucle for clásico: recorre el array de servicios de red
const servicios = ["DNS", "DHCP", "FTP", "SSH"]
for (let i = 0; i < servicios.length; i++) {
    console.log("Servicio activo: " + servicios[i])
}

// 2. Bucle while: simula 3 intentos de conexión
let i = 1                       // contador declarado antes del bucle
while (i <= 3) {
    console.log("Intento número " + i)
    i++                         // sin este incremento el bucle sería infinito
}

// 3. Función flecha: recibe el nombre de un equipo y devuelve el mensaje
const conectar = (equipo) => "Conectado exitosamente a " + equipo

console.log(conectar("Servidor01"))
console.log(conectar("Router-Principal"))
