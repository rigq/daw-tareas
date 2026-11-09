# DAW — 2º curso

Tareas, apuntes y exámenes de **Desarrollo de Aplicaciones Web** (Digitech FP), organizados a partir del campus virtual.

👉 **[PENDIENTES.md](PENDIENTES.md)**: próximas entregas y tareas vencidas sin entregar.

## Módulos

| Carpeta | Módulo |
|---|---|
| [0612-DWEC-Entorno-Cliente](0612-DWEC-Entorno-Cliente/) | Desarrollo web en entorno cliente (JavaScript) |
| [0613-DWES-Entorno-Servidor](0613-DWES-Entorno-Servidor/) | Desarrollo web en entorno servidor (PHP + MySQL) |
| [0614-Despliegue-Aplicaciones](0614-Despliegue-Aplicaciones/) | Despliegue de aplicaciones web |
| [0615-DIW-Diseno-Interfaces](0615-DIW-Diseno-Interfaces/) | Diseño de interfaces web |
| [COM314-Ciberseguridad](COM314-Ciberseguridad/) | Ciberseguridad |
| [0179-Ingles-Profesional](0179-Ingles-Profesional/) | Inglés profesional |
| [1708-Sostenibilidad](1708-Sostenibilidad/) | Sostenibilidad aplicada al sistema productivo |
| [1665-Digitalizacion](1665-Digitalizacion/) | Digitalización aplicada al sistema productivo |
| [1710-IPE-II](1710-IPE-II/) | Itinerario para la empleabilidad II |
| [Practicas-Empresa](Practicas-Empresa/) | Prácticas (estancia en empresa, marzo 2027) |
| [Tutoria](Tutoria/) | Tutoría: horario y calendario escolar |

Cada módulo tiene:

- `README.md`: enlace al campus y a Teams, avisos y tabla de tareas con su estado (✅ entregada · ⏳ pendiente · ❌ vencida sin entregar)
- `Apuntes/`: los documentos del campus y un índice
- `Tareas/`: una ficha por tarea (`AAAA-MM-DD - nombre.md`) con fechas, estado y enunciado
- `Examenes/`: evaluaciones y cuestionarios

Para hacer una tarea, crea una subcarpeta en `Tareas/` con el mismo nombre que la ficha y guarda ahí tu código.

## Trabajar en varios portátiles

Al empezar: `git pull` · Al terminar: `git add .` → `git commit -m "..."` → `git push`

Primera vez en un portátil nuevo:

```bash
git clone https://github.com/rigq/daw-tareas.git
```

## Dashboard de tareas

Extensión de Chrome en [`dashboard/`](dashboard/) con tus pendientes ordenadas por urgencia.

**Instalar (una vez por portátil):**
1. Chrome → `chrome://extensions` → activa **Modo de desarrollador**.
2. **Cargar descomprimida** → elige la carpeta `DAW/dashboard`.
3. Fija el icono "Tareas DAW" en la barra y púlsalo.
4. ⚙ → **Elegir carpeta DAW** (la carpeta del repo) y comprueba la ruta para VS Code.

**Usar:** inicia sesión en el campus en Chrome y pulsa **Actualizar** (o `R`).
**Entregar** abre directamente el formulario de envío. 📄 enunciado · 📁 carpeta en VS Code · ✓ marcar como hecha (en papel o en clase).
Al terminar, `git add . && git commit -m "..." && git push` para llevar las fichas nuevas y las marcas al otro portátil.

Tests: `cd dashboard && node --test`
