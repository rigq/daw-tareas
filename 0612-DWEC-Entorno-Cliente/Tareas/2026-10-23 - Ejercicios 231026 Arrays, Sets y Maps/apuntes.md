// Arreglos

//Declarar 

let myArray = []
let myArray2 = new Array()

console.log(myArray)
console.log(myArray2)

// Inicializar un Array

myArray = [3]
myArray2 = new Array(3)

console.log(myArray)
console.log(myArray2)

myArray = [1, 2, 3, 4]
myArray2 = new Array(1, 2, 3, 4)

console.log(myArray)
console.log(myArray2)

myArray = ["Jorge", "Moya", "JORGEMOYA", 47, true]
myArray2 = new Array("Jorge", "Moya", "JORGEMOYA", 47, true)

console.log(myArray)
console.log(myArray2)

myArray2 = new Array(3)
myArray2[0] = "Jorge"
myArray2[2] = "Moya"
myArray2[3] = "JORGEMOYA"
myArray2[4] = 47

console.log(myArray2)

myArray = []
myArray[0] = "Jorge"
myArray[1] = "Moya"
myArray[2] = "JORGEMOYA"

console.log(myArray)

// MÃ©todos comunes

// push y pop

myArray= []
myArray.push("Jorge")
myArray.push("Moya")
myArray.push("JORGEMOYA")

console.log(myArray)

myArray.pop()
console.log(myArray)
console.log(myArray.pop())
console.log(myArray)

// shift y unshift

console.log(myArray.shift())
console.log(myArray)

myArray.unshift("JOrge", "Moya", 47, "JORGEMOYA")
console.log(myArray)

console.log(myArray.length)

// clear
myArray = []
console.log(myArray)

// slice
myArray = ["Jorge", "moya", "JORGEMOYA", 47, true]

let myNewArray = myArray.slice(2,4)
console.log(myNewArray)
console.log(myArray)

//splice

myArray.splice(1,3)
console.log(myArray)
console.log(myNewArray)

