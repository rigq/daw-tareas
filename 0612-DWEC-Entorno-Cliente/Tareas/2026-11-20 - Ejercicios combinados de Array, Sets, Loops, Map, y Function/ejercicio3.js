// Ejercicio 3: Manipulación avanzada de arrays (push, pop, slice, splice)

// Array inicial con puertos de red comunes
let puertos = [21, 22, 80, 443, 3306]
console.log(puertos)

// 1. unshift() añade al inicio y push() añade al final (modifican el array)
puertos.unshift(53)
puertos.push(8080)
console.log(puertos)            // [53, 21, 22, 80, 443, 3306, 8080]

// 2. slice(2, 4): copia las posiciones 2 y 3 (la 4 es exclusiva). No modifica el original
const extraido = puertos.slice(2, 4)
console.log(extraido)           // [22, 80]
console.log(puertos)            // el original queda igual

// 3. splice(1, 2, 25): elimina 2 elementos desde la posición 1 y mete el 25 en su lugar
puertos.splice(1, 2, 25)
console.log(puertos)            // [53, 25, 80, 443, 3306, 8080]
