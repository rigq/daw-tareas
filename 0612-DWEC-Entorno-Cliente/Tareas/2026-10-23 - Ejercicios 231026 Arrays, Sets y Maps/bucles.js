// 1. Crea un bucle que imprima los números del 1 al 20
for (let i = 1; i <= 20; i++) {
    console.log(i)
}

// 2. Crea un bucle que sume todos los números del 1 al 100 y muestre el resultado
let suma = 0
for (let i = 1; i <= 100; i++) {
    suma += i
}
console.log(suma) // 5050

// 3. Crea un bucle que imprima todos los números pares entre 1 y 50
for (let i = 2; i <= 50; i += 2) {
    console.log(i)
}

// 4. Dado un array de nombres, usa un bucle para imprimir cada nombre en la consola
let nombres = ["Jorge", "Moya", "Ana", "Luis"]
for (let i = 0; i < nombres.length; i++) {
    console.log(nombres[i])
}

// 5. Escribe un bucle que cuente el número de vocales en una cadena de texto
let texto = "Desarrollo web en entorno cliente"
let vocales = "aeiouáéíóú"
let contadorVocales = 0
for (let i = 0; i < texto.length; i++) {
    if (vocales.includes(texto[i].toLowerCase())) {
        contadorVocales++
    }
}
console.log(contadorVocales)

// 6. Dado un array de números, usa un bucle para multiplicar todos los números y mostrar el producto
let numeros = [2, 3, 4, 5]
let producto = 1
for (let i = 0; i < numeros.length; i++) {
    producto *= numeros[i]
}
console.log(producto) // 120

// 7. Escribe un bucle que imprima la tabla de multiplicar del 5
for (let i = 1; i <= 10; i++) {
    console.log(`5 x ${i} = ${5 * i}`)
}

// 8. Usa un bucle para invertir una cadena de texto
let cadena = "JORGEMOYA"
let invertida = ""
for (let i = cadena.length - 1; i >= 0; i--) {
    invertida += cadena[i]
}
console.log(invertida) // AYOMEGROJ

// 9. Usa un bucle para generar los primeros 10 números de la secuencia de Fibonacci
let fibonacci = [0, 1]
for (let i = 2; i < 10; i++) {
    fibonacci.push(fibonacci[i - 1] + fibonacci[i - 2])
}
console.log(fibonacci) // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

// 10. Dado un array de números, usa un bucle para crear un nuevo array que contenga solo los números mayores a 10
let lista = [4, 12, 7, 25, 10, 33, 1]
let mayoresA10 = []
for (let i = 0; i < lista.length; i++) {
    if (lista[i] > 10) {
        mayoresA10.push(lista[i])
    }
}
console.log(mayoresA10) // [12, 25, 33]
