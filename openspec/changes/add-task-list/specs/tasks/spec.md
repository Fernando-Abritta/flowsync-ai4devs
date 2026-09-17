## Purpose

La lista compartida de tareas del equipo: la misma para todas las personas del espacio, donde cada tarea muestra título, responsable y estado, se crea escribiendo solo el título y cambia de estado desde la propia lista.

## ADDED Requirements

### Requirement: Listado de todas las tareas

El sistema SHALL devolver en `GET /api/v1/tasks` todas las tareas del espacio, idénticas para cualquier cuenta autenticada, exponiendo de cada una su título, su estado y de su responsable únicamente el id y el nombre.

#### Scenario: Lista completa

- **WHEN** se envía `GET /api/v1/tasks` con un token válido
- **THEN** la respuesta es `200` con `{ "data": [ { "id", "title", "status", "assignee": { "id", "fullName" } }, ... ] }` con todas las tareas existentes
- **AND** `status` es uno de `pending`, `in_progress` o `done`
- **AND** de `assignee` no se expone ningún otro dato de la cuenta (ni email, ni fechas, ni iniciales)

#### Scenario: El contenido no depende de quién mira

- **WHEN** dos cuentas distintas envían `GET /api/v1/tasks`
- **THEN** ambas reciben exactamente el mismo conjunto de tareas, incluidas las que cada una creó o tiene asignadas

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre en su cuenta
- **THEN** `assignee.fullName` es `null`

#### Scenario: Espacio sin tareas

- **WHEN** no se ha creado ninguna tarea
- **THEN** la respuesta es `200` con `{ "data": [] }`

#### Scenario: Listar no altera nada

- **WHEN** se pide la lista cualquier número de veces
- **THEN** ninguna tarea cambia de estado ni de responsable

#### Scenario: Sin sesión

- **WHEN** se envía `GET /api/v1/tasks` sin token válido
- **THEN** la respuesta es `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }` y no se devuelve ninguna tarea

### Requirement: Creación de una tarea con solo el título

El sistema SHALL crear una tarea en `POST /api/v1/tasks` a partir de un cuerpo JSON `{ title }`, dejándola en estado `pending` y con la cuenta autenticada como responsable, e ignorando cualquier otro campo del cuerpo.

#### Scenario: Creación válida

- **WHEN** se envía `POST /api/v1/tasks` con un token válido y `{ "title": "Preparar la demo" }`
- **THEN** la respuesta es `201` con `{ "data": { "id", "title": "Preparar la demo", "status": "pending", "assignee": { "id", "fullName" } } }`
- **AND** `assignee.id` es el id de la cuenta que hizo la petición
- **AND** la tarea aparece en el siguiente `GET /api/v1/tasks` de cualquier cuenta

#### Scenario: Espacios alrededor del título

- **WHEN** el `title` lleva espacios al principio o al final
- **THEN** la tarea se crea con el título sin esos espacios

#### Scenario: Título ausente o en blanco

- **WHEN** el cuerpo no trae `title`, o `title` es una cadena vacía o compuesta solo de espacios
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule", "field": "title" } ] }`, con `rule` igual a `required` si falta la clave y a `minLength` si está en blanco
- **AND** no se crea ninguna tarea

#### Scenario: Título demasiado largo

- **WHEN** el `title`, una vez quitados los espacios de los extremos, supera los 200 caracteres
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "maxLength", "field": "title", "meta": { "max": 200 } } ] }`
- **AND** no se guarda ninguna versión recortada

#### Scenario: Otros campos se ignoran

- **WHEN** el cuerpo incluye, además de `title`, claves como `status`, `assigneeId` o cualquier otra
- **THEN** la tarea se crea igualmente en `pending` y con la cuenta autenticada como responsable, sin tener en cuenta esas claves

#### Scenario: Sin sesión

- **WHEN** se envía `POST /api/v1/tasks` sin token válido
- **THEN** la respuesta es `401` y no se crea ninguna tarea

### Requirement: Actualización del estado o del responsable

El sistema SHALL permitir en `PATCH /api/v1/tasks/:id`, a cualquier cuenta autenticada y sobre cualquier tarea, cambiar el estado, el responsable o ambos mediante un cuerpo JSON parcial `{ status?, assigneeId? }`, y NO SHALL permitir modificar el título.

#### Scenario: Cambio de estado

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con un token válido y `{ "status": "in_progress" }` sobre una tarea existente
- **THEN** la respuesta es `200` con `{ "data": { "id", "title", "status": "in_progress", "assignee": { "id", "fullName" } } }`
- **AND** el siguiente `GET /api/v1/tasks` refleja el nuevo estado para todas las cuentas

#### Scenario: Cualquier tarea, no solo las propias

- **WHEN** la cuenta autenticada no es la responsable de la tarea
- **THEN** el cambio se aplica exactamente igual que si lo fuera, sin ningún error ni advertencia

#### Scenario: Cualquier transición entre los tres estados

- **WHEN** la tarea está en cualquiera de los tres estados y se pide cualquiera de los otros dos (incluida la vuelta desde `done` a `pending` o `in_progress`)
- **THEN** el cambio se aplica

#### Scenario: Cambio de responsable

- **WHEN** se envía `{ "assigneeId": <id de una cuenta existente> }`
- **THEN** la respuesta es `200` y `assignee` pasa a ser esa cuenta, con su `id` y su `fullName`

#### Scenario: Responsable inexistente

- **WHEN** `assigneeId` no corresponde a ninguna cuenta
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "database.exists", "field": "assigneeId" } ] }` y la tarea no cambia

#### Scenario: Cuerpo sin nada que actualizar

- **WHEN** el cuerpo no trae ni `status` ni `assigneeId`
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "field" } ] }` y la tarea no cambia

#### Scenario: El título no se edita por esta operación

- **WHEN** el cuerpo incluye `title` junto a un `status` válido
- **THEN** el estado cambia y el título permanece como estaba

#### Scenario: Tarea inexistente

- **WHEN** el `:id` no corresponde a ninguna tarea
- **THEN** la respuesta es `404`

#### Scenario: Sin sesión

- **WHEN** se envía `PATCH /api/v1/tasks/:id` sin token válido
- **THEN** la respuesta es `401` y la tarea no cambia

### Requirement: Conjunto cerrado de estados

El sistema SHALL admitir exactamente tres estados de tarea, identificados en la API como `pending`, `in_progress` y `done`, y NO SHALL ofrecer ninguna operación para añadir, renombrar o eliminar estados.

#### Scenario: Valor fuera del conjunto

- **WHEN** se envía a `PATCH /api/v1/tasks/:id` un `status` distinto de `pending`, `in_progress` o `done` (por ejemplo `Pendiente`, `PENDING`, `archived` o una cadena vacía)
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "enum", "field": "status" } ] }` y la tarea no cambia

#### Scenario: Toda tarea está siempre en un estado

- **WHEN** se consulta cualquier tarea en cualquier momento
- **THEN** su `status` es exactamente uno de los tres valores

### Requirement: Pantalla de la lista compartida

La aplicación web SHALL mostrar en `/tasks`, solo a personas con sesión iniciada, una única lista con todas las tareas del espacio, donde cada fila muestra el título, el nombre del responsable y el estado como «Pendiente», «En curso» o «Hecho», sin fechas ni filtros ni vistas personales.

#### Scenario: Cada fila responde quién está en qué

- **WHEN** una persona con sesión iniciada abre `/tasks` y hay tareas
- **THEN** ve cada tarea con su título, el nombre completo de su responsable y su estado pintado como «Pendiente», «En curso» o «Hecho», sin abrir nada

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre en su cuenta
- **THEN** en la fila se lee «Sin nombre», nunca su email ni su id

#### Scenario: La misma lista para todos

- **WHEN** dos personas distintas abren `/tasks`
- **THEN** ven el mismo conjunto de tareas, y no existe ninguna vista «mis tareas», filtro por persona ni forma de crear una tarea que las demás no vean

#### Scenario: Sin fechas ni vencimientos

- **WHEN** se mira cualquier fila de la lista
- **THEN** no aparece ninguna fecha ni ninguna marca de vencida

#### Scenario: Sin señales de presencia

- **WHEN** otras personas del equipo están usando la aplicación al mismo tiempo
- **THEN** la lista no muestra quién está conectado, ni quién está en línea, ni actividad por persona

#### Scenario: Cargando la lista

- **WHEN** la lista aún no ha llegado del servidor
- **THEN** se muestra un indicador de carga en lugar de una lista vacía

#### Scenario: Fallo al cargar

- **WHEN** el servidor no responde o devuelve un error al pedir la lista
- **THEN** se muestra un aviso con el motivo en castellano y ninguna tarea

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a `/login` y no ve ninguna tarea

#### Scenario: Enlace al perfil

- **WHEN** la persona pulsa el enlace «Perfil» en la pantalla de la lista
- **THEN** es llevada a `/profile`

### Requirement: Estado vacío de la lista

La aplicación web SHALL explicar, cuando no existe ninguna tarea, qué es la lista y SHALL invitar a crear la primera, en lugar de mostrar una lista vacía sin más.

#### Scenario: Todavía no hay nada

- **WHEN** una persona abre `/tasks` y el espacio no tiene tareas
- **THEN** ve el texto «Todavía no hay tareas. Escribe un título arriba para crear la primera.» y el formulario de creación disponible

#### Scenario: Aparece la primera

- **WHEN** se crea la primera tarea
- **THEN** el texto de estado vacío desaparece y la lista muestra esa tarea

### Requirement: Creación desde la lista con un único campo

La aplicación web SHALL ofrecer en `/tasks` un formulario con un único campo «Título» y un botón «Crear tarea», y NO SHALL pedir ni sugerir responsable, estado, fecha ni ningún otro dato.

#### Scenario: Crear con solo el título

- **WHEN** la persona escribe un título y pulsa «Crear tarea»
- **THEN** el botón muestra «Creando…» y queda deshabilitado hasta la respuesta
- **AND** la tarea aparece en la lista sin recargar ni navegar, en estado «Pendiente» y con el nombre de la persona como responsable
- **AND** el campo «Título» queda vacío y listo para la siguiente

#### Scenario: El formulario no pide nada más

- **WHEN** la persona recorre el formulario de creación
- **THEN** el único campo es «Título»; no hay selector de responsable, de estado ni de fecha

#### Scenario: Título vacío o en blanco

- **WHEN** la persona pulsa «Crear tarea» con el campo vacío o con solo espacios
- **THEN** no se envía nada al servidor y bajo el campo aparece «Escribe un título para la tarea.»
- **AND** no aparece ninguna fila sin texto

#### Scenario: Título demasiado largo

- **WHEN** el servidor rechaza el título por superar los 200 caracteres
- **THEN** bajo el campo aparece «El título no puede superar los 200 caracteres.» y no se añade ninguna fila

#### Scenario: Fallo al crear

- **WHEN** el servidor no responde o devuelve un error que no es de validación
- **THEN** el formulario muestra un aviso con el motivo en castellano, conserva el título escrito y no añade ninguna fila

### Requirement: Cambio de estado desde la fila

La aplicación web SHALL permitir cambiar el estado de cualquier tarea desde su propia fila, ofreciendo como únicos destinos «Pendiente», «En curso» y «Hecho», sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo.

#### Scenario: Cambio con un gesto

- **WHEN** la persona pulsa en la fila el estado al que quiere pasar la tarea
- **THEN** no se abre ningún diálogo ni se pide ningún dato
- **AND** en cuanto el servidor confirma, la fila muestra el nuevo estado

#### Scenario: Solo tres destinos

- **WHEN** la persona mira los controles de estado de una fila
- **THEN** los únicos destinos ofrecidos son «Pendiente», «En curso» y «Hecho», con el estado actual señalado como tal

#### Scenario: Cualquier tarea, no solo las propias

- **WHEN** la persona cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual que en una tarea propia, sin advertencia ni permiso especial

#### Scenario: Mientras se aplica el cambio

- **WHEN** el cambio de estado está en curso
- **THEN** los controles de estado de esa fila quedan deshabilitados hasta la respuesta, y las demás filas siguen operativas

#### Scenario: Fallo al cambiar

- **WHEN** el servidor no responde o rechaza el cambio
- **THEN** la fila conserva el estado anterior y se muestra un aviso con el motivo en castellano
