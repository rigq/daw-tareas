# Dashboard DAW — Diseño

**Fecha:** 10/11/2026 · **Estado:** pendiente de revisión

## Objetivo

Una página fácil de leer que muestre las tareas pendientes del campus (campus.digitechfp.com), que se actualice con un botón y que acelere ponerse con cada tarea: ver el enunciado, ir a la entrega y abrir la carpeta en VS Code.
Tiene que funcionar en el portátil de casa y en el de clase.

**Fuera de alcance:** entregar tareas desde el dashboard, notificaciones, calificaciones detalladas, foros.

## Restricción que decide la arquitectura

El campus rechaza peticiones que no vienen de un navegador (cortafuegos, error 406). Por eso la lectura del campus se hace **desde Chrome, con la sesión del usuario**, nunca desde un script local. Nada de tokens ni contraseñas.

## Arquitectura

Una **extensión de Chrome (Manifest V3) sin empaquetar** guardada en `DAW/dashboard/`, instalada con "Cargar descomprimida" en cada portátil.

```
dashboard/
├── manifest.json     permiso de host: https://campus.digitechfp.com/*
├── background.js     clic en el icono → abre dashboard.html en una pestaña
├── dashboard.html    la interfaz
├── style.css
├── app.js            interfaz: pinta las tarjetas y conecta los botones
├── campus.js         cliente del campus: lee módulos, tareas y adjuntos
├── carpeta.js        escribe en la carpeta DAW (File System Access API)
├── logica.js         funciones puras: fechas, clasificación, nombres, estados
├── markdown.js       genera fichas, README de módulo y PENDIENTES.md
└── tests/            tests de logica.js y markdown.js con `node --test`
```

Cada unidad tiene una sola responsabilidad. `logica.js` y `markdown.js` no tocan ni el navegador ni la red, así que se pueden probar con Node.

## Flujo de "Actualizar"

1. `campus.js` pide `/my/` y saca el `sesskey`. Si redirige al login, el dashboard muestra **"Inicia sesión en el campus"** con un enlace, y para.
2. Llama a la API AJAX de Moodle (lo mismo que ya funcionó): módulos matriculados → `core_courseformat_get_state` de cada módulo → página de cada tarea o cuestionario para sacar fechas, estado de entrega, calificación, enunciado y adjuntos. Máximo 6 peticiones a la vez, con barra de progreso.
3. Con el resultado, `carpeta.js` escribe en la carpeta DAW:
   - `dashboard/datos/campus.json`: el estado completo, para mostrarlo al instante en la siguiente apertura y para que llegue al otro portátil con `git pull`.
   - **Fichas nuevas** en `<Módulo>/Tareas/` o `<Módulo>/Examenes/`, con el mismo formato que las actuales, y sus adjuntos en la carpeta de la ficha. **Una ficha que ya existe nunca se sobrescribe**, porque puede tener notas tuyas. Un adjunto que ya existe tampoco se vuelve a descargar.
   - `README.md` de cada módulo y `PENDIENTES.md`: estos sí se regeneran siempre, porque son índices generados.
4. La interfaz se repinta y muestra un resumen: "3 tareas nuevas, 2 adjuntos descargados".

Si alguna tarea falla al leerse, se conserva su dato anterior y se avisa: "2 tareas no se pudieron actualizar".

## Carpeta DAW y VS Code

- **Primer uso en cada portátil:** botón "Elegir carpeta DAW" (`showDirectoryPicker`). El permiso se guarda en IndexedDB; si Chrome lo pide de nuevo, se renueva con el clic en "Actualizar".
- **Ruta para VS Code:** el navegador no conoce la ruta real de la carpeta elegida, así que en **Ajustes** se escribe una vez la ruta (por defecto `C:\Users\fabri\Desktop\DAW`), guardada en `chrome.storage.local`, es decir, por portátil. El botón "Carpeta" abre `vscode://file/<ruta>/<Módulo>/Tareas/<ficha>` y crea antes la carpeta de la tarea si no existe.

## Interfaz

- **Cabecera:** botón **Actualizar**, "última actualización hace 2 h" y Ajustes.
- **Contadores:** *Vence hoy/mañana* · *Esta semana* · *Vencidas sin entregar* · *Entregadas*. Al pulsar uno, filtra la lista.
- **Filtros:** un chip por módulo, cada uno con su color, y un buscador por nombre.
- **Lista principal:** las pendientes ordenadas por fecha de cierre. Cada tarjeta lleva:
  - módulo (en su color), nombre y cuenta atrás ("en 2 días", "¡hoy 11:15!") en rojo, naranja o gris;
  - estado: ✅ Entregada · ⏳ Pendiente · ❌ Vencida;
  - botones: **Enunciado** (despliega el texto y enlaza los adjuntos del campus), **Entregar** (abre la tarea en el campus) y **Carpeta** (VS Code);
  - **"Marcar como hecha"**, para las que se entregaron en papel o en clase. Se guarda en `dashboard/datos/marcas.json`, así que se sincroniza con git, y la tarea pasa al grupo "Hechas".
- **Grupos plegables** debajo: *Vencidas sin entregar*, *Entregadas / hechas*, *Carpetas abiertas todo el curso* (cierres en 2029 o más tarde).
- Tema claro y oscuro según el sistema; se puede leer en pantalla pequeña.

## Reglas (en `logica.js`)

- Fechas en español: "viernes, 13 de noviembre de 2026, 23:59", con etiquetas Apertura, Cierre y Vencimiento.
- **Examen** = cuestionario (quiz), o nombre que empieza por "Evaluación N" o que contiene "examen" o "prueba". Lo demás es tarea.
- **Entregada** = el estado contiene "Enviado", o está marcada como hecha.
- **Vencida** = no entregada y con cierre pasado.
- **Abierta todo el curso** = cierre en un año posterior a 2027.
- Nombres de fichas: `AAAA-MM-DD - <nombre limpio, 70 caracteres como máximo>.md`, o `sin-fecha - …`, idéntico al generador actual para que las fichas existentes se reconozcan. Además se identifican por el `id=` del campus que llevan dentro, aunque cambie el nombre.

## Errores

| Situación | Qué ve el usuario |
|---|---|
| Sesión del campus no iniciada | Aviso con enlace al login; los datos guardados siguen visibles |
| Sin permiso sobre la carpeta | Botón "Dar acceso a la carpeta DAW" |
| Carpeta nunca elegida | El dashboard funciona en modo solo lectura, con datos en memoria |
| Fallo en algunas tareas | Se conservan sus datos anteriores y se muestra el número de fallos |
| Sin conexión | "No se pudo conectar con el campus" y se muestran los datos guardados |

## Pruebas

- `node --test dashboard/tests`: parseo de fechas, clasificación, nombres de fichas, estados y contadores, y el markdown generado comparado con fichas reales actuales.
- Prueba manual en Chrome: instalar, elegir la carpeta, actualizar, comprobar que no se sobrescribe ninguna ficha existente (`git status` solo debe mostrar índices, `campus.json` y lo nuevo), y abrir una carpeta en VS Code.
