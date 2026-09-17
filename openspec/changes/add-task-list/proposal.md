## Why

FlowSync existe para responder «quién está en qué» de un vistazo, y hoy la aplicación solo tiene cuentas y acceso: no hay dónde anotar una tarea ni dónde verla. Este change da de alta la capability de tareas del equipo con el mínimo que hace útil el producto: una lista compartida, crear con solo el título y cambiar el estado desde la propia lista. Cubre las historias E3-1, E2-1, E2-2, E2-3 y E2-4 del backlog (RF-5 a RF-9, RF-16 y RF-17 del PRD).

## What Changes

- **API de tareas** bajo `/api/v1/tasks`, protegida por el mismo token portador que el perfil, con exactamente tres operaciones: listar todas las tareas, crear una y actualizarla (estado y responsable). No hay lectura individual, ni borrado, ni endpoints de equipo.
- **Modelo de tarea** con título, estado y responsable. El estado es un conjunto cerrado que viaja por la API como `pending`, `in_progress` y `done`; cualquier otro valor se rechaza con `422`. Sin fecha de vencimiento.
- **Creación con solo el título**: la tarea nace en `pending` y con quien la crea como responsable. Título obligatorio, sin contar espacios, y con un máximo de 200 caracteres que se avisa en lugar de recortar.
- **Lo que se expone del responsable** en la lista es únicamente su id y su nombre; nunca su email ni el resto de la cuenta.
- **Pantalla de lista** en `/tasks`, protegida: cada fila muestra título, responsable por su nombre (o «Sin nombre») y estado como Pendiente, En curso o Hecho. Desde la fila se cambia el estado con un gesto, sin diálogo. Formulario de creación con un único campo. Estado vacío con explicación e invitación a crear la primera.
- **`/tasks` pasa a ser la pantalla de aterrizaje**: tras registrarse o iniciar sesión, y para cualquier ruta desconocida, la persona llega a la lista en vez de a `/profile`. El perfil sigue en `/profile` y ambas pantallas enlazan entre sí.
- Sin tests en este change, por decisión explícita: ni base de pruebas ni casos.

## Capabilities

### New Capabilities

- `tasks`: la lista compartida de tareas del equipo. Listar, crear con solo el título y actualizar estado o responsable por la API; pantalla de lista con creación y cambio de estado desde la fila.

### Modified Capabilities

- `auth`: cambia el destino tras registro e inicio de sesión y la ruta por defecto (de `/profile` a `/tasks`), y la pantalla de perfil gana un enlace «Tareas».

## Decisions taken in this change

Decisiones cerradas con la persona responsable del producto al proponer este change, porque las historias las dejaban abiertas:

- **Longitud máxima del título: 200 caracteres.** E2-2 pide avisar ante un título «desmedido» sin fijar el umbral (PA-9). El número es una decisión de este change, revisable cuando se resuelva PA-9.
- **Qué acepta la actualización:** la API admite `status` y `assigneeId` (cualquier usuario existente, sobre cualquier tarea, sin comprobación de propiedad). La interfaz solo ofrece el cambio de estado; reasignar desde pantalla queda fuera porque no hay endpoint de equipo con el que listar miembros. El título no se edita.
- **HTTP:** `POST` responde `201`; la actualización es `PATCH` con cuerpo parcial y responde `200`.

## Open points

- **Orden de la lista (PA-3).** No hay regla de orden decidida. La API devuelve las tareas en el orden en que las entrega el almacenamiento, sin ordenar explícitamente, y la pantalla las pinta en ese mismo orden; una tarea recién creada se añade al final de lo que ya se ve. No se inventa ningún criterio en este change.
- **Transiciones de estado (PA-7).** Se permite pasar de cualquier estado a cualquiera de los otros dos, incluida la vuelta atrás desde «Hecho». Es la lectura literal de RF-8 y RF-9, no una decisión sobre el grafo de transiciones.
- **Cuántas tareas «En curso» por persona (PA-4).** Sin límite.

## Impact

- **Backend:** nueva migración (`tasks`), regeneración del esquema, nuevo modelo con relación al usuario, nuevo controlador, validadores, transformers y tres rutas nuevas. El registro generado de controladores y rutas en `.adonisjs/` cambia y se commitea.
- **Frontend:** cliente de API con tres llamadas nuevas y traducción de los errores del título, nuevos tipos, nueva página `/tasks` con sus componentes, cambio de la ruta de aterrizaje y de los redirects tras registro e inicio de sesión, enlace desde el perfil. Se reutilizan los componentes de `frontend/src/components/ui/` existentes (button, input, label, card, alert) y no se añaden dependencias.
- **Specs:** nueva `specs/tasks/spec.md`; delta MODIFIED sobre `auth` en cuatro requisitos (registro, inicio de sesión, protección de rutas y pantalla de perfil).
- **Datos:** ninguna migración de datos; la tabla nace vacía.
