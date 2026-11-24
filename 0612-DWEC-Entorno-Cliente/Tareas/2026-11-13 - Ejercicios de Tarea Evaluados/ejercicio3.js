// Ejercicio 3: Registro y validación de correos únicos

// 1. Colección inicial con correos repetidos
let correosIngresados = ["admin@daw.com", "user1@daw.com", "admin@daw.com", "user2@daw.com", "user1@daw.com"]

// 2. Set: elimina los duplicados automáticamente
const correosUnicos = new Set(correosIngresados)
console.log(correosUnicos)

// 3. Comprobación directa con has(); si no está, se agrega con add()
if (!correosUnicos.has("root@daw.com")) {
    correosUnicos.add("root@daw.com")
}
console.log(correosUnicos)

// 4. Volver a un array (estructura indexada)
let listaCorreos = Array.from(correosUnicos)
console.log(listaCorreos)

// 5. Recorrido directo con for...of
for (const correo of listaCorreos) {
    if (correo === "root@daw.com") {      // caso crítico: cuenta de superusuario
        console.log("Caso crítico: " + correo + ". Se detiene el bucle")
        break
    }
    if (correo === "user2@daw.com") {     // se salta esta iteración
        continue
    }
    if (correo.length > 12) {
        console.log("Correo: " + correo.toUpperCase())
    }
}
