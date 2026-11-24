// 1. Crea un array que almacene cinco animales

let animales = new Array("perro", "gato", "caballo", "vaca", "oveja")
console.log(animales)

// 2. Añade dos más. Uno al principio y otro al final

animales.unshift("aguila")
animales.push("tortuga")
console.log(animales)

// 3. Elimina el que se encuentra en tercera posición

animales.splice(2, 1)
console.log(animales)

// 4. Crea un set que almacene cinco libros

let libros = new Set()
libros.add("Don Quijote")
libros.add("1984")
libros.add("El Hobbit")
libros.add("Dune")
libros.add("Fahrenheit 451")
console.log(libros)

// 5. Añade dos más. Uno de ellos repetido

libros.add("Rayuela")
libros.add("1984")
console.log(libros)
console.log(libros.size)

// 6. Elimina uno concreto a tu elección

libros.delete("Dune")
console.log(libros)

// 7. Crea un mapa que asocie el número del mes a su nombre

let meses = new Map()
meses.set(1, "Enero")
meses.set(2, "Febrero")
meses.set(3, "Marzo")
meses.set(4, "Abril")
meses.set(5, "Mayo")
meses.set(6, "Junio")
meses.set(7, "Julio")
meses.set(8, "Agosto")
meses.set(9, "Septiembre")
meses.set(10, "Octubre")
meses.set(11, "Noviembre")
meses.set(12, "Diciembre")
console.log(meses)

// 8. Comprueba si el mes número 5 existe en el map e imprime su valor

console.log(meses.has(5))
console.log(meses.get(5))

// 9. Añade al mapa una clave con un array que almacene los meses de verano

meses.set("verano", ["Junio", "Julio", "Agosto"])
console.log(meses.get("verano"))

// 10. Crea un Array, transfórmalo a un Set y almacénalo en un Map

let numeros = [1, 2, 2, 3, 3, 4]
let numerosSet = new Set(numeros)
let miMapa = new Map()
miMapa.set("numerosUnicos", numerosSet)
console.log(miMapa)
