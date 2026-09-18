## Why

La lista compartida ya dice quién está en qué, pero no cuándo debería estar: una tarea con plazo se descubre tarde porque nadie la mira contra el calendario. La historia FS-118 (RF-13, RF-14, RF-15 del PRD) pide poder poner o quitar una fecha de vencimiento al abrir una tarea y que el sistema diga por sí mismo si se ha pasado de plazo, sin cálculo mental y sin que la fecha invada la lista.

## What Changes

- **Fecha de vencimiento opcional en la tarea.** Una tarea puede tener una fecha de calendario (sin hora) o ninguna. Crear sin fecha sigue siendo el camino por defecto; el formulario de creación no la ofrece ni la sugiere.
- **Veredicto de vencimiento calculado por el servidor.** Toda representación de tarea que devuelve la API (lista, lectura individual, creación y actualización) incorpora `dueDate` (`AAAA-MM-DD` o `null`) e `isOverdue` (booleano). Una tarea está vencida si y solo si tiene fecha, esa fecha es anterior al día de referencia y su estado no es `done`. El veredicto se calcula en cada lectura, no se guarda en ninguna columna y el cliente no puede enviarlo.
- **Día de referencia de quien mira.** El cliente envía su día de calendario local en la cabecera `X-Client-Date` (`AAAA-MM-DD`) y el servidor resuelve `isOverdue` contra ese día; sin cabecera, usa su propio día en UTC. Una cabecera mal formada se rechaza con `422`, no se ignora en silencio.
- **Poner, cambiar y quitar la fecha por la API.** `PATCH /api/v1/tasks/:id` admite `dueDate`; enviarla como `null` (o vacía, que la pila HTTP convierte en `null`) la quita. Una fecha ya pasada se acepta al crear y al actualizar: la tarea nace o pasa a estar vencida. `POST /api/v1/tasks` admite `dueDate` opcional por la misma regla, aunque la interfaz no lo use.
- **Lectura individual de una tarea.** Nueva operación `GET /api/v1/tasks/:id`: la historia habla de «abrir la tarea» y hoy la API solo lista. Es la superficie mínima que la historia necesita; no es la pantalla de detalle completa (PA-6 del PRD).
- **Pantalla mínima de la tarea en `/tasks/:id`.** Se llega pulsando el título en su fila. Muestra título, responsable y estado en solo lectura, un único campo «Fecha de vencimiento» que se guarda solo (sin botón ni confirmación) y una señal explícita «Vencida» cuando procede. Enlace «Volver a la lista».
- **La lista no cambia lo que muestra.** Cada fila sigue enseñando título, responsable y estado: sin fecha, sin marca de vencida, sin aviso a las tareas que no tienen fecha. El único cambio en la fila es que el título pasa a ser un enlace a la tarea.
- **Sin tests**, por decisión del autor: la verificación es manual (`curl` y navegador), como en `add-task-list`.

Fuera de alcance: notificaciones, recordatorios, recurrencia, ordenar o filtrar por fecha, edición del título, cambio de estado o de responsable desde la pantalla de la tarea, y tests de cualquier tipo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks`: «Listado de todas las tareas», «Creación de una tarea con solo el título», «Actualización del estado o del responsable» y «Pantalla de la lista compartida» cambian (representación con `dueDate` e `isOverdue`, `dueDate` en los cuerpos, cabecera de día de referencia, título enlazado en la fila). Se añaden «Lectura individual de una tarea», «Fecha de vencimiento y regla de vencimiento» y «Pantalla de la tarea con su fecha de vencimiento».
- `auth`: «Protección de rutas en la aplicación web» incorpora `/tasks/:id` entre las rutas protegidas y conocidas.

## Decisiones tomadas al proponer

- **La fecha es de calendario, sin hora.** Viaja siempre como `AAAA-MM-DD`; una tarea cuya fecha es hoy no está vencida, lo estará mañana.
- **Día de referencia por cabecera con el día del cliente**, no por huso horario ni solo por reloj del servidor. Respeta CA-19 y CA-20 (cada persona ve el vencimiento según su propio día) y permite verificar a mano el paso de medianoche enviando cualquier día con `curl`, lo que sin tests es lo único que hace comprobable la regla. Confiar en el día que declara el cliente es aceptable en un producto sin roles ni permisos.
- **`dueDate` también al crear**, porque «poner una fecha anterior a hoy se acepta al crear y al actualizar» exige que el cuerpo de creación la admita. La interfaz de creación sigue pidiendo solo el título (CA-1).
- **Pantalla mínima `/tasks/:id`** en lugar de un panel desplegable en la fila o de dejar el frontend sin fecha: usa la lectura individual nueva, deja la lista intacta y no compromete la pantalla de detalle completa, que sigue fuera (PA-6).
- **Campo de fecha nativo del navegador** (`type="date"`) con el componente de entrada existente: sin dependencias nuevas, operable con teclado, y permite distinguir una fecha incompleta de quitar la fecha (CA-14 frente a CA-15).
- **Cabecera mal formada → `422`.** Un veredicto calculado contra un día equivocado es peor que un error visible; el único cliente que la envía es el frontend.
- **`isOverdue` en la lista también.** La API expone una sola representación de tarea; que la pantalla de lista no lo pinte es una decisión de interfaz (RF-15), no de la API.

## Open points

- **Vuelta atrás desde «Hecho» con la fecha pasada (PA-7).** Con la regla tal cual, volver de `done` a otro estado hace que la tarea vuelva a estar vencida si su fecha ya pasó. Es la consecuencia literal de RF-14; no se toma ninguna decisión adicional sobre transiciones.
- **Dos personas cambiando la fecha a la vez (PA-8).** Gana la última escritura; quien pierde no recibe ningún aviso. Pendiente de PA-8, igual que el resto de ediciones.
- **Lectura individual sin pantalla de detalle completa (PA-6).** `GET /api/v1/tasks/:id` nace para servir a `/tasks/:id`, que hoy solo edita la fecha. Cuando se decida el detalle completo, esta ruta es su punto de partida.
- **Día de referencia declarado por el cliente.** Se confía en el reloj y el huso del navegador; si algún día hay que endurecerlo, la alternativa es enviar el huso IANA y calcular el día en el servidor, sin cambiar la forma de la respuesta.
- **Vencimiento en la lista (PA-1).** Sigue sin verse de un vistazo por decisión del PRD; la API ya lo devuelve, así que mostrarlo después sería un cambio solo de interfaz.

## Impact

- **Backend:** migración que añade `due_date` (fecha, nula) a `tasks` y regenera el esquema; regla de vencimiento en el modelo; resolución del día de referencia desde la cabecera; validadores de creación y actualización con `dueDate`; transformer de tarea con `dueDate` e `isOverdue`; controlador con `show`; ruta `GET /api/v1/tasks/:id`; registro generado en `.adonisjs/`.
- **Frontend:** tipos de tarea con `dueDate` e `isOverdue`; cliente de API con la cabecera `X-Client-Date`, `getTask` y `updateTask` (que sustituye a `updateTaskStatus`); traducción del error de fecha; fila con el título enlazado; página `/tasks/:id`; ruta protegida nueva.
- **Sin dependencias nuevas.** Sin cambios en auth más allá de la ruta protegida.
