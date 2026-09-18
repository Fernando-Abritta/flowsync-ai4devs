## Context

Ver proposal.md para la motivación. Lo que condiciona el diseño:

- La capability `tasks` ya está construida por el carril completo del backend (migración → esquema generado → modelo sin columnas → validador VineJS → controlador con `serialize(Transformer.transform(...))` → ruta del mapa generado) y del frontend (`lib/api.ts` como único contacto, página con estado local, fila con botones de estado, guards de ruta). Este change añade una columna, una regla de dominio, una operación de lectura y una pantalla mínima, sin abrir ningún patrón nuevo.
- El generador de esquema convierte una columna `date` en `@column.date()` tipada como `DateTime` de luxon, que serializa con `toISODate()` (`AAAA-MM-DD`) y consume desde SQLite con `DateTime.fromSQL`. Encaja con «fecha de calendario, sin hora».
- VineJS 4.4 tiene `vine.date({ formats: ['YYYY-MM-DD'] })`: es estricto (rechaza `2026-02-30`, `2026-9-1`, `18/09/2026`, ISO con hora, números, booleanos y la cadena vacía) con `rule: "date"`, produce un `Date` a medianoche local del servidor, y con `.nullable().optional()` el resultado lleva la clave con `null` si se envió `null` y no la lleva si se omitió. Comprobado con un script contra la versión instalada.
- `BaseTransformer.transform(resource, ...rest)` acepta argumentos extra que llegan al constructor del transformer: sirve para pasar el día de referencia sin estado global.
- La pila HTTP convierte las cadenas vacías del cuerpo en `null` antes de validar (`convertEmptyStringsToNull`), así que «enviarla vacía» y «enviar `null`» son la misma cosa para el servidor.
- El proceso del backend corre con `TZ=UTC`; el frontend corre en el huso del navegador.
- Restricciones cerradas en el proposal: sin tests, sin dependencias nuevas, veredicto en el backend sin persistir, lista sin fecha ni marca, pantalla de detalle completa fuera.

## Goals / Non-Goals

**Goals:**

- Una sola regla de vencimiento, en el dominio, que toda representación de tarea consuma; ninguna capa la reimplementa.
- Que el día de referencia sea explícito en cada petición y verificable a mano.
- Que la fecha viaje como texto de calendario de punta a punta, sin pasar nunca por una hora ni por un huso que la desplace de día.

**Non-Goals:**

- Detalle completo de la tarea, edición de título, estado o responsable desde `/tasks/:id`.
- Refresco automático, orden o filtro por fecha, notificaciones.
- Aislamiento de la base de datos para pruebas (no hay tests).

## Decisions

### D1. Columna `due_date` de tipo `date`, nula, sin índice

Migración `alter table tasks add due_date date null`; `down` la elimina. El generador produce `@column.date() declare dueDate: DateTime | null` en `TaskSchema`.

Por qué: `date` sin hora es literalmente el dominio; una `timestamp` invitaría a comparar instantes y a que el huso desplace el día. Nula porque «sin fecha» es el estado por defecto y no un centinela. Sin índice porque no se ordena ni se filtra por fecha en este change. Alternativa descartada: `string` con formato `AAAA-MM-DD`, que evitaría luxon en el modelo pero perdería el tipo del generador y la conversión que ya hace `@column.date()`. Trade-off: el modelo maneja `DateTime` aunque solo use su día; se acota con `toISODate()` en la única salida (transformer) y `DateTime.fromISO` en la única entrada (controlador).

### D2. La regla vive en el modelo `Task` como `isOverdueOn(referenceDay)`

Un método del modelo que recibe el día de referencia como `DateTime` (a medianoche, sin huso relevante) y devuelve `dueDate !== null && dueDate < referenceDay && status !== 'done'`, comparando por día (`toISODate()` de ambos, o `startOf('day')`), nunca por instante.

Por qué: es la única definición de «vencida» y el ticket FS-118.2 exige que no se reimplemente en otra capa; el transformer la llama y el frontend la lee. Recibe el día en vez de calcularlo dentro para que el veredicto sea una función pura de tarea y día: así se verifica a mano enviando cualquier día. Alternativa descartada: getter `isOverdue` en el modelo que use `DateTime.now()`, más cómodo pero incapaz de respetar el día de quien mira (CA-19) y de simular el paso de medianoche (CA-20). Alternativa descartada: columna calculada o job nocturno, prohibidos por el proposal y además incompatibles con «se decide al mirar».

### D3. Día de referencia desde `X-Client-Date`, resuelto por un servicio pequeño y pasado al transformer

`app/services/reference_day.ts` expone `referenceDayFrom(request): Promise<DateTime>`: lee la cabecera `X-Client-Date` y la valida con un validador VineJS de un solo campo, `clientDate: vine.date({ formats: ['YYYY-MM-DD'] }).optional()`, aplicado a `{ clientDate: request.header('x-client-date') }`. Es exactamente el mismo esquema estricto que `dueDate`, así que rechaza un ISO con hora, `2026-9-1` o `2026-02-30` igual que el cuerpo, y el error sale del propio VineJS con `rule: "date"` y `field: "clientDate"` sin construir nada a mano; el manejador de errores lo convierte en el mismo `422` de cualquier validación. Si la cabecera no viene, devuelve el día en curso en UTC. No se usa `DateTime.fromISO(...).isValid` porque acepta `2026-09-18T10:00:00Z`, y una regex propia sería una segunda definición de «fecha válida». Cada acción del controlador llama al servicio una vez y pasa el día a `TaskTransformer.transform(tasks, referenceDay)`; el transformer lo recibe en su constructor y calcula `isOverdue` con `resource.isOverdueOn(referenceDay)`.

Por qué cabecera y no query string: el día tiene que llegar en `GET`, `POST` y `PATCH` por igual, y una cabecera no ensucia ni la URL ni el cuerpo. Por qué el día del cliente y no su huso: decidido en el proposal; permite verificar CA-19 y CA-20 con `curl`. Por qué un servicio llamado desde el controlador y no un middleware que enriquezca el contexto: es una función explícita con un argumento, sin extender `HttpContext` ni añadir magia; son cuatro llamadas. Por qué `422` y no ignorar la cabecera inválida: un veredicto calculado contra otro día es un error silencioso; el único cliente es el frontend y el error señala un bug suyo. El nombre `clientDate` en `field` es el nombre lógico de la cabecera, no una clave del cuerpo; se documenta en la spec.

### D4. `dueDate` en los validadores con `vine.date`, convertido a día en el controlador

`dueDate: vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional()` tanto en el validador de creación como en el de actualización. El controlador convierte el `Date` validado a `DateTime` con `DateTime.fromJSDate(value).startOf('day')` (o `null`) antes de asignarlo al modelo. En `update`, la comprobación de «cuerpo sin nada que actualizar» pasa a exigir que `status`, `assigneeId` y `dueDate` sean todos `undefined`; `dueDate === null` cuenta como «quitar la fecha», no como ausencia.

Por qué `vine.date` y no `vine.string().regex(...)`: la regex aceptaría `2026-02-30`; `vine.date` con formato único es estricto y devuelve `rule: "date"`, que el cliente traduce. Por qué convertir en el controlador: es el único punto donde un `Date` de VineJS se encuentra con el `DateTime` del modelo, y así ninguna otra capa ve `Date`. El `Date` nace a medianoche en el huso del proceso (`TZ=UTC`) y `fromJSDate` lo lee en ese mismo huso, de modo que el día no se desplaza. Trade-off: `isOverdue` en el cuerpo no necesita tratamiento: VineJS descarta lo no declarado, igual que hoy `title` en `update`.

### D5. `show` en el mismo controlador y `GET /api/v1/tasks/:id` en el mismo grupo

`TasksController.show` con `findOrFail` (`404` si no existe), `preload`/`load` del responsable y el mismo transformer. La ruta se añade al grupo `tasks` ya protegido. El registro generado de `.adonisjs/` se regenera arrancando el servidor con la ruta ya presente (el controlador ya existe en el mapa, así que esta vez no hay problema de arranque) y se commitea.

Por qué: es la superficie mínima para «abrir la tarea» y evita que la pantalla dependa de que la lista esté cargada. Alternativa descartada: que `/tasks/:id` busque la tarea en la lista traída por `/tasks`; funciona al navegar desde la lista pero no al recargar o al abrir un enlace, y duplicaría la carga de la lista en una pantalla que no la necesita.

### D6. Frontend: la cabecera se añade en el cliente de API, no en las páginas

`lib/api.ts` calcula el día local del navegador con `getFullYear`/`getMonth`/`getDate` (nunca con `toISOString`, que daría el día en UTC) y lo envía como `X-Client-Date` en todas las llamadas de tareas. `updateTaskStatus` se sustituye por `updateTask(token, id, patch)` con `patch: { status? , dueDate? }` (tipo `UpdateTaskPayload`), y se añade `getTask(token, id)`. El tipo `Task` gana `dueDate: string | null` e `isOverdue: boolean`. La traducción de errores añade `dueDate` al mapa de etiquetas y la regla `date` («Introduce una fecha válida.»). `clientDate` solo puede fallar por un bug del cálculo del día local o por un reloj del equipo imposible, pero como ese `422` tumba también la carga de la lista, se traduce con un mensaje accionable en vez de dejarlo caer en «Revisa el campo.»: «No se ha podido determinar la fecha de hoy. Comprueba la fecha y la hora del equipo.».

Por qué: la regla del proyecto es que `lib/api.ts` es el único contacto con el backend; la cabecera es un detalle del transporte y las páginas no deben conocerla. Por qué una función `updateTask` en vez de dos: el `PATCH` es uno y parcial; dos envoltorios serían dos nombres para la misma petición. Se calcula el día en cada petición, no al cargar el módulo, para que una pestaña abierta durante días envíe el día correcto.

### D7. Pantalla `/tasks/:id` con estado local, campo de fecha nativo y autoguardado en `onChange`

Nueva página que carga la tarea con `getTask` al montar (mismo patrón `useEffect` + bandera `cancelled` que la lista), muestra título, nombre del responsable o «Sin nombre» y la etiqueta del estado en solo lectura, y un `Input` con `type="date"` etiquetado «Fecha de vencimiento». Reglas del campo:

- `onChange` con un valor completo (`AAAA-MM-DD`) → `updateTask(id, { dueDate: valor })`.
- `onChange` con valor vacío y `validity.badInput === false` → la persona ha vaciado el campo → `updateTask(id, { dueDate: null })`, sin confirmación.
- `onChange` con valor vacío y `validity.badInput === true` → fecha incompleta o imposible según el navegador → no se envía nada, se muestra «La fecha no es válida o está incompleta.» bajo el campo y la tarea conserva su fecha.
- Mientras la petición está en curso el campo queda deshabilitado; al confirmar, la tarea local se sustituye por la respuesta del servidor (con su `isOverdue`); si falla, se conserva la tarea anterior y se muestra el error bajo el campo (validación) o como aviso general (resto).

La señal de vencida es un `Badge`-like con texto «Vencida» e icono, construido con utilidades de Tailwind sobre los tokens existentes (no hay componente Badge instalado y no se añade uno), en color destructivo pero con el texto como portador del significado. Enlace «Volver a la lista» con `Link` a `/tasks`.

Por qué el campo nativo: sin dependencias, con selector y teclado del navegador, y `validity.badInput` es lo que separa CA-14 (incompleta → conservar) de CA-15 (vaciar → quitar). Por qué guardar en `onChange`: con un campo de fecha nativo `onChange` solo dispara con una fecha completa o con el campo vaciado, que son exactamente los dos momentos en que hay algo que guardar (CA-16, «sin paso extra»). Alternativa descartada: guardar en `onBlur`, que retrasaría la confirmación y haría que cerrar la pestaña justo después perdiera el cambio. Alternativa descartada: texto libre, que trasladaría el formato a la persona y perdería el selector. Sin actualización optimista, igual que en la lista (D6 de `add-task-list`).

El campo vacío no lleva pista, aviso ni placeholder que sugiera que falta algo (CA-12): solo su etiqueta.

### D8. La fila enlaza el título; la lista no cambia nada más

En `TaskRow`, el título se pinta como `Link` a `/tasks/:id` con el mismo estilo de texto más subrayado al pasar por encima. Ni `dueDate` ni `isOverdue` se leen en la fila ni en la página de lista, aunque lleguen en la respuesta.

Por qué: la historia exige «abrir la tarea» y no hay otro gesto en la lista; el título es el elemento identificador de la fila y el enlace no añade columnas ni marcas. Alternativa descartada: un botón «Abrir» por fila, que añadiría un control más junto a los tres de estado.

### D9. Ruta `/tasks/:id` bajo el guard de sesión, antes del comodín

Se añade `<Route path="/tasks/:id" element={<TaskPage />} />` dentro del grupo protegido. El comodín sigue llevando a `/tasks`. Un `:id` que no es número o no existe no redirige: la página muestra el aviso de «no existe» con el enlace de vuelta, porque el `404` del servidor ya está traducido en el cliente de API.

## Risks / Trade-offs

- [Toda la API de tareas, incluida la lista, depende de una cabecera que el cliente construye a mano en cada petición: un bug en el cálculo del día local devuelve `422` en `GET /api/v1/tasks` y no solo en el campo de fecha] → decisión asumida al proponer (un veredicto contra otro día es peor que un error visible); se mitiga validando la cabecera con el mismo esquema que `dueDate`, verificando en la pestaña de red que sale bien formada (3.1) y con un mensaje propio en el cliente (D6).
- [Un `Date` de VineJS y un `DateTime` de luxon en la misma capa pueden desplazar el día si el huso del proceso cambia] → conversión en un único punto con `fromJSDate(...).startOf('day')` y `TZ=UTC` fijado en `.env.example`; la batería `curl` incluye una fecha igual al día de referencia para detectar el desplazamiento.
- [El día lo declara el cliente: un reloj o huso mal configurados dan un veredicto «correcto para ese navegador» pero distinto al de los demás] → asumido en el proposal; la alternativa (huso IANA) se anota como punto abierto y no cambia la forma de la respuesta.
- [`validity.badInput` depende del navegador: algunos no reportan `badInput` para fechas parciales y devuelven `""` sin más] → en ese caso vaciar y escribir a medias son indistinguibles y la fecha se quita; se verifica a mano en el navegador de referencia y, si falla, la alternativa es esperar a `onBlur` para el caso vacío.
- [Autoguardado en `onChange` con selector nativo dispara una petición por cada fecha elegida] → aceptable: una fecha por gesto; el campo se deshabilita durante la petición, así que no se encolan.
- [El `404` de `/tasks/:id` con un `:id` no numérico depende de que `findOrFail` lo trate como inexistente] → se comprueba en la batería `curl` con `/tasks/abc`.
- [Sin tests, la regla de los cuatro bordes (día anterior, mismo día, día posterior, sin fecha) solo se verifica a mano] → la batería `curl` de tasks.md la recorre con `X-Client-Date` explícito.

## Migration Plan

Una migración `alter` sobre `tasks` que añade `due_date` nula; las tareas existentes quedan sin fecha y no vencidas, sin tocar ninguna fila. `node ace migration:run` regenera el esquema. Rollback: `node ace migration:rollback` elimina la columna; el frontend anterior no lee `dueDate` ni `isOverdue`, así que la lista sigue funcionando; `/tasks/:id` devolvería `404` de ruta hasta desplegar el backend con `show`.

## Open Questions

Ninguna que cambie specs, enfoque o tareas. Los puntos de producto (PA-6, PA-7, PA-8, huso del cliente) están en el proposal.
