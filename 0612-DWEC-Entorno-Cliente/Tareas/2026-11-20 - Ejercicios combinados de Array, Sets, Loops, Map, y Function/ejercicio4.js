// Ejercicio 4: Conversión de estructuras y orden superior (Set a Array y forEach)

// 1. Array con registros de conexiones que contiene IPs repetidas
const conexiones = ["10.0.0.1", "10.0.0.2", "10.0.0.1", "10.0.0.3", "10.0.0.2"]
console.log(conexiones)

// 2. Set: elimina los duplicados automáticamente
const ipsUnicas = new Set(conexiones)
console.log(ipsUnicas)

// 3. Array.from(): vuelve a convertir el Set en un array
const listaLimpia = Array.from(ipsUnicas)
console.log(listaLimpia)

// 4. forEach con función flecha: simula el análisis de cada IP única
listaLimpia.forEach((ip) => {
    console.log("Analizando la IP " + ip + "...")
})
