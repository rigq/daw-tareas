// Ejercicio 4: Perfil de usuario con Map

// 1. Map con los pares clave-valor iniciales
const perfil = new Map([
    ["nombre", "Lucía"],
    ["rol", "Estudiante"],
    ["edad", 22],
    ["activo", true]
])
console.log(perfil)

// 2. Añadir "alias" y actualizar "rol" (set añade o actualiza)
perfil.set("alias", "Lucy")
perfil.set("rol", "Desarrolladora")
console.log(perfil)

// 3. Consultar "nombre" y comprobar si existe "edad"
console.log(perfil.get("nombre"))
console.log(perfil.has("edad"))

// 4. Eliminar "activo"
perfil.delete("activo")

// 5. Total de elementos, claves y valores
console.log(perfil.size)
console.log(perfil.keys())
console.log(perfil.values())

// 6. Vaciar el Map y comprobar que su tamaño es 0
perfil.clear()
console.log(perfil.size === 0)
