## 1. Backend: datos y modelo

- [x] 1.1 Crear la migración de `tasks` (`id`, `title` string 200, `status` string no nulo, `assignee_id` entero sin signo con FK a `users.id`, `created_at`, `updated_at`), correr `node ace migration:run` y verificar que `database/schema.ts` regenerado contiene `TaskSchema` con esas columnas
- [x] 1.2 Crear el módulo de estados (`pending`, `in_progress`, `done`) con el tipo `TaskStatus` derivado, y el modelo `Task` que extiende `TaskSchema` con la relación `belongsTo` `assignee` hacia `User`; verificar con `npm run typecheck`

## 2. Backend: validación, transformers y API

- [x] 2.1 Crear el validador de creación (`title: vine.string().trim().minLength(1).maxLength(200)`; `notEmpty()` no existe en `VineString`) y el de actualización (`status` enum opcional, `assigneeId` número opcional con `exists` sobre `users.id`); verificar con `npm run typecheck`
- [x] 2.2 Crear `AssigneeTransformer` (solo `id`, `fullName`) y `TaskTransformer` (`id`, `title`, `status`, `assignee`); verificar que ninguno expone email, fechas ni iniciales
- [x] 2.3 Crear `TasksController` con `index` (lista con `preload('assignee')` y sin `orderBy`), `store` (crea en `pending` con `auth.getUserOrFail()` como responsable, responde `201`, recarga `assignee`) y `update` (`findOrFail`, valida, `422` propio si no llega ni `status` ni `assigneeId`, recarga `assignee`, responde `200`)
- [x] 2.4 Registrar el grupo `tasks` bajo `/api/v1` con `middleware.auth()` y las rutas `GET`, `POST` y `PATCH /:id`; arrancar el dev server o correr `node ace list:routes` para regenerar `.adonisjs/` y verificar que aparecen exactamente esas tres rutas de tareas y que el diff generado queda para commitear
- [x] 2.5 Verificar la API con `curl` contra el dev server: registro de dos cuentas; `GET` sin token → 401; `POST` con título válido → 201 en `pending` con el creador como `assignee`; `POST` con título vacío, solo espacios y de 201 caracteres → 422 con `field: "title"`; `POST` con `status: "done"` extra → se ignora; `PATCH` de estado por la otra cuenta → 200; `PATCH` con `status: "Pendiente"` → 422 `rule: "enum"`; `PATCH` con `assigneeId` inexistente → 422; `PATCH` con `{}` → 422; `PATCH` con `title` → el título no cambia; `PATCH` a un id inexistente → 404; `GET` desde las dos cuentas devuelve la misma lista con `assignee` limitado a `id` y `fullName`

## 3. Frontend: tipos y cliente de API

- [ ] 3.1 Añadir a `lib/types.ts` los tipos `TaskStatus`, `Assignee` (`id`, `fullName | null`) y `Task`, y crear el módulo de estados del frontend con el mapa de etiquetas `Pendiente`, `En curso`, `Hecho`; verificar con `npm run build`
- [ ] 3.2 Añadir a `lib/api.ts` el método `PATCH` al tipo de opciones de petición, `listTasks`, `createTask({ title })` y `updateTaskStatus(id, status)` (vía `PATCH` con cuerpo parcial), la etiqueta `title` en el mapa de campos y la traducción para ese campo de `required` y `minLength` («Escribe un título para la tarea.») y de `maxLength` («El título no puede superar los 200 caracteres.»); verificar con `npm run build` y `npm run lint`

## 4. Frontend: pantalla de tareas

- [ ] 4.1 Crear el formulario de creación (un solo `Input` «Título» y `Button` «Crear tarea» / «Creando…», `noValidate`, comprobación local del blanco con «Escribe un título para la tarea.», error del servidor bajo el campo y aviso general para el resto, vaciado del campo al crear); verificar en pantalla los cuatro casos: válido, vacío, solo espacios, 201 caracteres
- [ ] 4.2 Crear la fila de tarea (título, nombre del responsable o «Sin nombre», grupo de tres `Button` con el estado actual en variante rellena, deshabilitados mientras la petición de esa fila está en curso, aviso en la fila si falla); verificar que no se muestra ninguna fecha ni el email del responsable
- [ ] 4.3 Crear la página `/tasks`: carga con indicador mientras llega la lista, aviso si falla, estado vacío con «Todavía no hay tareas. Escribe un título arriba para crear la primera.», lista en el orden recibido, la tarea creada se añade al final y el cambio de estado sustituye la fila con la respuesta del servidor, enlace «Perfil»; verificar en pantalla con dos sesiones en dos navegadores que ambas ven la misma lista y que una puede cambiar el estado de una tarea de la otra sin diálogo

## 5. Frontend: enrutado y enlaces

- [ ] 5.1 Añadir la ruta protegida `/tasks`, cambiar la ruta comodín y el destino de `PublicOnlyRoute` a `/tasks`, y añadir el enlace «Tareas» en la página de perfil; verificar en pantalla que registro e inicio de sesión aterrizan en `/tasks`, que una ruta desconocida lleva a `/tasks` (y a `/login` sin sesión), que `/profile` sigue protegida y que los enlaces cruzados funcionan
- [ ] 5.2 Correr `npm run build`, `npm run lint` y `npm run format` en `frontend/` y `npm run typecheck`, `npm run lint` y `npm run format` en `backend/` y verificar que todos terminan sin errores
