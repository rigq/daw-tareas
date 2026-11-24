// Ejercicio 5: Lógica combinada con Map, bucles y control de flujo (break / continue)

// 1. Map con servicios y sus puertos
const servicios = new Map([
    ["SSH", 22],
    ["HTTP", 80],
    ["HTTPS", 443],
    ["FTP", 21],
    ["RDP", 3389]
])

// 2. Recorrido con for...of, desestructurando cada entrada en [servicio, puerto]
for (const [servicio, puerto] of servicios) {
    // Puerto específico que detiene la auditoría (RDP, 3389)
    if (puerto === 3389) {
        console.log("Puerto crítico detectado: " + puerto + " (" + servicio + "). Auditoría detenida")
        break                   // sale del bucle por completo
    }

    // Puertos privilegiados (< 100): se avisa y se salta el resto de la iteración
    if (puerto < 100) {
        console.log("Puerto privilegiado detectado: " + puerto)
        continue                // pasa directamente al siguiente servicio
    }

    // Solo llegan aquí los puertos que no son privilegiados
    console.log("Servicio " + servicio + " en el puerto " + puerto + ": revisado")
}
