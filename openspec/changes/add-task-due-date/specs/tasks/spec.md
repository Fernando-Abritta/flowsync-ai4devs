## ADDED Requirements

### Requirement: Fecha de vencimiento y regla de vencimiento

El sistema SHALL admitir en cada tarea una fecha de vencimiento opcional de calendario, sin hora, representada como `AAAA-MM-DD` o `null`, y SHALL exponer en toda representación de tarea un booleano `isOverdue` calculado en el momento de cada lectura: `true` si y solo si la tarea tiene fecha, esa fecha es anterior al día de referencia y su estado no es `done`. El día de referencia SHALL ser el que el cliente declara en la cabecera `X-Client-Date` (`AAAA-MM-DD`) y, en su ausencia, el día en curso del servidor en UTC. El sistema NO SHALL guardar el veredicto en ningún sitio ni SHALL aceptar `isOverdue` del cliente.

#### Scenario: Representación de una tarea

- **WHEN** la API devuelve una tarea en cualquier operación (listado, lectura individual, creación o actualización)
- **THEN** la representación es `{ "id", "title", "status", "dueDate", "isOverdue", "assignee": { "id", "fullName" } }`
- **AND** `dueDate` es una cadena `AAAA-MM-DD` o `null`, e `isOverdue` es `true` o `false`

#### Scenario: Fecha anterior al día de referencia y tarea no hecha

- **WHEN** una tarea tiene `dueDate` anterior al día de referencia y su `status` es `pending` o `in_progress`
- **THEN** `isOverdue` es `true`

#### Scenario: Vencer hoy todavía no es estar vencida

- **WHEN** una tarea tiene `dueDate` igual al día de referencia y no está en `done`
- **THEN** `isOverdue` es `false`

#### Scenario: Fecha futura

- **WHEN** una tarea tiene `dueDate` posterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Sin fecha no se vence nunca

- **WHEN** una tarea tiene `dueDate` `null`, por antigua que sea
- **THEN** `isOverdue` es `false`

#### Scenario: Una tarea hecha nunca está vencida

- **WHEN** una tarea está en `done` y su `dueDate` es anterior al día de referencia
- **THEN** `isOverdue` es `false`
- **AND** `dueDate` conserva su valor

#### Scenario: Cada persona ve el vencimiento según su propio día

- **WHEN** dos peticiones piden la misma tarea con distinto `X-Client-Date`, uno igual a `dueDate` y otro posterior
- **THEN** la primera recibe `isOverdue: false` y la segunda `isOverdue: true`, sin que la tarea haya cambiado

#### Scenario: El vencimiento se decide al mirar, no al guardar

- **WHEN** una tarea con `dueDate` igual al día de hoy y no hecha se vuelve a pedir con un `X-Client-Date` del día siguiente
- **THEN** `isOverdue` pasa a `true` sin que nadie haya modificado la tarea

#### Scenario: Sin cabecera de día

- **WHEN** una petición de tareas no lleva `X-Client-Date`
- **THEN** `isOverdue` se calcula contra el día en curso del servidor en UTC

#### Scenario: Cabecera de día mal formada

- **WHEN** `X-Client-Date` no es una fecha de calendario válida con el formato `AAAA-MM-DD` (por ejemplo `18/09/2026`, `2026-02-30` o `hoy`)
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "date", "field": "clientDate" } ] }` y la operación no se ejecuta

#### Scenario: El cliente no decide el vencimiento

- **WHEN** el cuerpo de una creación o de una actualización incluye `isOverdue`
- **THEN** se ignora y el valor devuelto es el calculado por el servidor

#### Scenario: Reasignar no toca la fecha

- **WHEN** se cambia el responsable de una tarea con fecha
- **THEN** `dueDate` e `isOverdue` no varían

### Requirement: Lectura individual de una tarea

El sistema SHALL devolver en `GET /api/v1/tasks/:id`, a cualquier cuenta autenticada, la representación completa de una única tarea.

#### Scenario: Lectura correcta

- **WHEN** se envía `GET /api/v1/tasks/:id` con un token válido sobre una tarea existente
- **THEN** la respuesta es `200` con `{ "data": { "id", "title", "status", "dueDate", "isOverdue", "assignee": { "id", "fullName" } } }`

#### Scenario: Cualquier tarea, no solo las propias

- **WHEN** la cuenta autenticada no es la responsable de la tarea
- **THEN** la respuesta es exactamente la misma que para la responsable

#### Scenario: Leer no altera nada

- **WHEN** se lee una tarea cualquier número de veces
- **THEN** ni su fecha, ni su estado, ni su responsable cambian

#### Scenario: Tarea inexistente

- **WHEN** el `:id` no corresponde a ninguna tarea
- **THEN** la respuesta es `404`

#### Scenario: Sin sesión

- **WHEN** se envía `GET /api/v1/tasks/:id` sin token válido
- **THEN** la respuesta es `401` y no se devuelve ninguna tarea

### Requirement: Pantalla de la tarea con su fecha de vencimiento

La aplicación web SHALL mostrar en `/tasks/:id`, solo a personas con sesión iniciada, una única tarea con su título, el nombre de su responsable y su estado en solo lectura, un único campo «Fecha de vencimiento» que se guarda solo al cambiarlo, una señal explícita «Vencida» cuando la API la devuelve vencida, y un enlace «Volver a la lista» hacia `/tasks`. NO SHALL ofrecer edición del título, del estado ni del responsable, NO SHALL pedir confirmación para quitar la fecha y NO SHALL señalar de ninguna forma que a una tarea le falte la fecha.

#### Scenario: Abrir una tarea desde la lista

- **WHEN** la persona pulsa el título de una tarea en `/tasks`
- **THEN** es llevada a `/tasks/:id` y ve el título, el nombre del responsable (o «Sin nombre»), el estado como «Pendiente», «En curso» o «Hecho» y el campo «Fecha de vencimiento» con la fecha actual de la tarea o vacío

#### Scenario: Poner una fecha

- **WHEN** la tarea no tiene fecha y la persona indica una fecha completa en el campo
- **THEN** el cambio se envía sin pulsar ningún botón, el campo queda deshabilitado hasta la respuesta y, en cuanto el servidor confirma, la pantalla refleja la fecha guardada y la señal de vencimiento que devuelve la API, sin recargar ni volver a abrir la tarea

#### Scenario: Cambiar la fecha

- **WHEN** la tarea tiene fecha y la persona indica otra completa
- **THEN** la nueva fecha sustituye a la anterior con el mismo comportamiento que al ponerla

#### Scenario: Quitar la fecha

- **WHEN** la persona vacía el campo
- **THEN** el cambio se envía sin diálogo de confirmación, la tarea queda sin fecha y la señal «Vencida» desaparece si estaba

#### Scenario: Fecha incompleta o imposible

- **WHEN** lo escrito en el campo no forma una fecha válida y completa
- **THEN** no se envía nada al servidor, la tarea conserva la fecha que tuviera y bajo el campo se lee «La fecha no es válida o está incompleta.»

#### Scenario: Rechazo del servidor

- **WHEN** el servidor rechaza la fecha
- **THEN** bajo el campo aparece el motivo en castellano y la pantalla conserva la fecha anterior

#### Scenario: Fallo al guardar

- **WHEN** el servidor no responde o devuelve un error que no es de validación
- **THEN** se muestra un aviso con el motivo en castellano y la pantalla conserva la fecha anterior

#### Scenario: Señal de vencida

- **WHEN** la API devuelve la tarea con `isOverdue: true`
- **THEN** la pantalla muestra la señal «Vencida» con texto, no solo con color, sin que la persona tenga que comparar la fecha con el día de hoy

#### Scenario: Sin señal cuando no está vencida

- **WHEN** la API devuelve la tarea con `isOverdue: false`, tenga fecha o no
- **THEN** no se muestra la señal «Vencida» ni ningún aviso de que falte la fecha

#### Scenario: Cualquier tarea, no solo las propias

- **WHEN** la persona cambia la fecha de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica sin advertencia ni permiso especial

#### Scenario: Cargando la tarea

- **WHEN** la tarea aún no ha llegado del servidor
- **THEN** se muestra un indicador de carga

#### Scenario: Tarea que no existe

- **WHEN** el `:id` de la ruta no corresponde a ninguna tarea
- **THEN** se muestra un aviso en castellano y el enlace «Volver a la lista», sin campo de fecha

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/tasks/:id`
- **THEN** es llevada a `/login`

## MODIFIED Requirements

### Requirement: Listado de todas las tareas

El sistema SHALL devolver en `GET /api/v1/tasks` todas las tareas del espacio, idénticas para cualquier cuenta autenticada, exponiendo de cada una su título, su estado, su fecha de vencimiento, su condición de vencida y de su responsable únicamente el id y el nombre.

#### Scenario: Lista completa

- **WHEN** se envía `GET /api/v1/tasks` con un token válido
- **THEN** la respuesta es `200` con `{ "data": [ { "id", "title", "status", "dueDate", "isOverdue", "assignee": { "id", "fullName" } }, ... ] }` con todas las tareas existentes
- **AND** `status` es uno de `pending`, `in_progress` o `done`
- **AND** `isOverdue` se calcula contra el día de referencia de la petición
- **AND** de `assignee` no se expone ningún otro dato de la cuenta (ni email, ni fechas, ni iniciales)

#### Scenario: El contenido no depende de quién mira

- **WHEN** dos cuentas distintas envían `GET /api/v1/tasks` con el mismo `X-Client-Date`
- **THEN** ambas reciben exactamente el mismo conjunto de tareas, incluidas las que cada una creó o tiene asignadas

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre en su cuenta
- **THEN** `assignee.fullName` es `null`

#### Scenario: Espacio sin tareas

- **WHEN** no se ha creado ninguna tarea
- **THEN** la respuesta es `200` con `{ "data": [] }`

#### Scenario: Listar no altera nada

- **WHEN** se pide la lista cualquier número de veces
- **THEN** ninguna tarea cambia de estado, de responsable ni de fecha

#### Scenario: Sin sesión

- **WHEN** se envía `GET /api/v1/tasks` sin token válido
- **THEN** la respuesta es `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }` y no se devuelve ninguna tarea

### Requirement: Creación de una tarea con solo el título

El sistema SHALL crear una tarea en `POST /api/v1/tasks` a partir de un cuerpo JSON `{ title, dueDate? }`, dejándola en estado `pending`, con la cuenta autenticada como responsable y sin fecha salvo que el cuerpo la traiga, e ignorando cualquier otro campo del cuerpo.

#### Scenario: Creación válida

- **WHEN** se envía `POST /api/v1/tasks` con un token válido y `{ "title": "Preparar la demo" }`
- **THEN** la respuesta es `201` con `{ "data": { "id", "title": "Preparar la demo", "status": "pending", "dueDate": null, "isOverdue": false, "assignee": { "id", "fullName" } } }`
- **AND** `assignee.id` es el id de la cuenta que hizo la petición
- **AND** la tarea aparece en el siguiente `GET /api/v1/tasks` de cualquier cuenta

#### Scenario: Creación con fecha

- **WHEN** el cuerpo incluye `dueDate` con una fecha válida `AAAA-MM-DD`
- **THEN** la respuesta es `201` con esa `dueDate` e `isOverdue` calculado contra el día de referencia

#### Scenario: Creación con fecha ya pasada

- **WHEN** el cuerpo incluye `dueDate` anterior al día de referencia
- **THEN** la tarea se crea igualmente y la respuesta lleva `isOverdue: true`

#### Scenario: Fecha de creación inválida

- **WHEN** `dueDate` no es una fecha de calendario válida con el formato `AAAA-MM-DD`
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "date", "field": "dueDate" } ] }` y no se crea ninguna tarea

#### Scenario: Espacios alrededor del título

- **WHEN** el `title` lleva espacios al principio o al final
- **THEN** la tarea se crea con el título sin esos espacios

#### Scenario: Título ausente o en blanco

- **WHEN** el cuerpo no trae `title`, o `title` es una cadena vacía o compuesta solo de espacios
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "required", "field": "title" } ] }`: un título vacío o de solo espacios se trata igual que uno ausente
- **AND** no se crea ninguna tarea

#### Scenario: Título demasiado largo

- **WHEN** el `title`, una vez quitados los espacios de los extremos, supera los 200 caracteres
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "maxLength", "field": "title", "meta": { "max": 200 } } ] }`
- **AND** no se guarda ninguna versión recortada

#### Scenario: Otros campos se ignoran

- **WHEN** el cuerpo incluye, además de `title` y `dueDate`, claves como `status`, `assigneeId`, `isOverdue` o cualquier otra
- **THEN** la tarea se crea igualmente en `pending`, con la cuenta autenticada como responsable y con `isOverdue` calculado por el servidor, sin tener en cuenta esas claves

#### Scenario: Sin sesión

- **WHEN** se envía `POST /api/v1/tasks` sin token válido
- **THEN** la respuesta es `401` y no se crea ninguna tarea

### Requirement: Actualización del estado o del responsable

El sistema SHALL permitir en `PATCH /api/v1/tasks/:id`, a cualquier cuenta autenticada y sobre cualquier tarea, cambiar el estado, el responsable, la fecha de vencimiento o cualquier combinación de ellos mediante un cuerpo JSON parcial `{ status?, assigneeId?, dueDate? }`, donde `dueDate: null` quita la fecha, y NO SHALL permitir modificar el título.

#### Scenario: Cambio de estado

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con un token válido y `{ "status": "in_progress" }` sobre una tarea existente
- **THEN** la respuesta es `200` con `{ "data": { "id", "title", "status": "in_progress", "dueDate", "isOverdue", "assignee": { "id", "fullName" } } }`
- **AND** el siguiente `GET /api/v1/tasks` refleja el nuevo estado para todas las cuentas

#### Scenario: Cualquier tarea, no solo las propias

- **WHEN** la cuenta autenticada no es la responsable de la tarea
- **THEN** el cambio se aplica exactamente igual que si lo fuera, sin ningún error ni advertencia

#### Scenario: Cualquier transición entre los tres estados

- **WHEN** la tarea está en cualquiera de los tres estados y se pide cualquiera de los otros dos (incluida la vuelta desde `done` a `pending` o `in_progress`)
- **THEN** el cambio se aplica

#### Scenario: Darla por hecha la deja de vencer

- **WHEN** una tarea con `isOverdue: true` recibe `{ "status": "done" }`
- **THEN** la respuesta lleva `isOverdue: false` y `dueDate` sin ningún cambio

#### Scenario: Cambio de responsable

- **WHEN** se envía `{ "assigneeId": <id de una cuenta existente> }`
- **THEN** la respuesta es `200` y `assignee` pasa a ser esa cuenta, con su `id` y su `fullName`

#### Scenario: Responsable inexistente

- **WHEN** `assigneeId` no corresponde a ninguna cuenta
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "database.exists", "field": "assigneeId" } ] }` y la tarea no cambia

#### Scenario: Responsable que no es un id

- **WHEN** `assigneeId` no es un número entero JSON (por ejemplo `true`, `"1"` o `1.5`)
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule", "field": "assigneeId" } ] }` y la tarea no cambia, sin convertir el valor en ningún id

#### Scenario: Poner o cambiar la fecha

- **WHEN** se envía `{ "dueDate": "AAAA-MM-DD" }` con una fecha válida, incluida una anterior al día de referencia
- **THEN** la respuesta es `200` con esa `dueDate` e `isOverdue` calculado contra el día de referencia

#### Scenario: Aplazar la fecha resuelve el vencimiento

- **WHEN** una tarea con `isOverdue: true` recibe una `dueDate` igual o posterior al día de referencia
- **THEN** la respuesta lleva `isOverdue: false`

#### Scenario: Quitar la fecha

- **WHEN** se envía `{ "dueDate": null }` (o `dueDate` vacía) sobre una tarea con fecha
- **THEN** la respuesta es `200` con `dueDate: null` e `isOverdue: false`

#### Scenario: Fecha inválida

- **WHEN** `dueDate` no es `null` ni una fecha de calendario válida con el formato `AAAA-MM-DD` (por ejemplo `18/09/2026`, `2026-02-30`, `2026-09-18T10:00:00Z` o un número)
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "date", "field": "dueDate" } ] }` y la tarea conserva la fecha que tuviera

#### Scenario: Cuerpo sin nada que actualizar

- **WHEN** el cuerpo no trae ni `status`, ni `assigneeId`, ni `dueDate`
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

### Requirement: Pantalla de la lista compartida

La aplicación web SHALL mostrar en `/tasks`, solo a personas con sesión iniciada, una única lista con todas las tareas del espacio, donde cada fila muestra el título como enlace a la tarea, el nombre del responsable y el estado como «Pendiente», «En curso» o «Hecho», sin fechas, sin marcas de vencida, sin filtros ni vistas personales.

#### Scenario: Cada fila responde quién está en qué

- **WHEN** una persona con sesión iniciada abre `/tasks` y hay tareas
- **THEN** ve cada tarea con su título, el nombre completo de su responsable y su estado pintado como «Pendiente», «En curso» o «Hecho», sin abrir nada

#### Scenario: El título abre la tarea

- **WHEN** la persona pulsa el título de una fila
- **THEN** es llevada a `/tasks/:id` de esa tarea

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre en su cuenta
- **THEN** en la fila se lee «Sin nombre», nunca su email ni su id

#### Scenario: La misma lista para todos

- **WHEN** dos personas distintas abren `/tasks`
- **THEN** ven el mismo conjunto de tareas, y no existe ninguna vista «mis tareas», filtro por persona ni forma de crear una tarea que las demás no vean

#### Scenario: Sin fechas ni vencimientos

- **WHEN** se mira cualquier fila de la lista, tenga la tarea fecha o no y esté vencida o no
- **THEN** no aparece ninguna fecha, ninguna marca de vencida ni ningún aviso de que falte la fecha

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
