## Context

Ver proposal.md para la motivación. Lo que condiciona el diseño:

- El backend ya tiene el patrón completo que hay que seguir: migración → esquema generado → modelo sin columnas → validador VineJS → controlador que devuelve `serialize(Transformer.transform(...))` → ruta registrada desde el mapa generado de controladores. Las rutas protegidas viven en grupos con el middleware de auth y el token portador ya resuelve la cuenta autenticada.
- El frontend ya tiene un único punto de contacto con la API que desenvuelve `{ data }`, adjunta el token y traduce los errores de VineJS a castellano por campo, más un patrón de páginas (layout con tarjeta, formulario con `noValidate`, errores bajo el campo o aviso general) y guards de rutas. Los componentes disponibles son button, input, label, card y alert.
- Restricciones cerradas en el proposal: sin tests, sin dependencias nuevas, sin fecha de vencimiento, tres operaciones exactas, sin orden explícito, sin vistas privadas.

## Goals / Non-Goals

**Goals:**

- Que la capability entre por el mismo carril que auth en las dos capas, sin abrir un patrón nuevo.
- Que del responsable salga solo lo que la lista necesita, y que ampliarlo después sea una decisión y no un accidente.
- Que el conjunto de estados sea uno solo en todo el sistema: un valor de API, una etiqueta en pantalla, sin duplicar listas.

**Non-Goals:**

- Refresco automático de la lista cuando otra persona cambia algo (historia E3-2).
- Reasignación desde pantalla, filtros, agrupación, orden, borrado, edición del título, lectura individual.
- Actualización optimista de la interfaz.

## Decisions

### D1. Tabla `tasks` con `status` como texto validado en la aplicación, no como enum de base de datos

Columnas: `id`, `title` (string de 200), `status` (string, no nulo), `assignee_id` (entero sin signo, no nulo, clave foránea a `users.id`), `created_at`, `updated_at`. El conjunto cerrado de estados lo impone el validador (`vine.enum`), no una restricción `CHECK`.

Por qué: el esquema de los modelos se genera desde las migraciones y no se ha comprobado cómo tipa el generador una columna `enum`; un `string` produce un tipo conocido y el enum de VineJS es lo que de todas formas convierte cualquier otro valor en un `422` con `rule: "enum"`. Alternativa descartada: `table.enum(...)` en la migración, que añade una segunda fuente de verdad del conjunto y un `CHECK` de SQLite que fallaría con un `500`, nunca con un `422`. Trade-off: la integridad del estado depende de que toda escritura pase por el validador; en este change solo hay una.

`assignee_id` sin `onDelete` en cascada: no existe borrado de cuentas y una tarea sin responsable rompería la promesa de la lista. `title` con longitud 200 en la columna además de en el validador, para que el límite tenga el mismo valor en los dos sitios.

### D2. Un único módulo de estados compartido por validador, modelo y pantalla

En el backend, una constante con los tres valores (`pending`, `in_progress`, `done`) de la que derivan el tipo `TaskStatus` y el `vine.enum`. En el frontend, un módulo equivalente con los tres valores y su etiqueta en castellano (`Pendiente`, `En curso`, `Hecho`), que consumen la fila y el tipo `Task`.

Por qué: la restricción «los valores en castellano no son identificadores» se cumple sola si las etiquetas viven en un mapa de presentación y todo lo demás habla en los tres valores de API. Alternativa descartada: definir el tipo en el registro Tuyau generado y consumirlo desde el frontend; el frontend hoy no importa nada de `.adonisjs/` y no conviene abrir ese acoplamiento en un change que no lo necesita.

### D3. Transformer propio para el responsable, en vez de reutilizar el de usuario

`TaskTransformer` expone `id`, `title`, `status` y `assignee`, y `assignee` sale de un `AssigneeTransformer` que escoge solo `id` y `fullName`.

Por qué: es la advertencia explícita de la historia E3-1. `UserTransformer` expone email, fechas e iniciales; una vez que el cliente los consume ya no se recortan sin romperlo. Un transformer aparte hace que ampliar lo expuesto sea un cambio visible en la spec. Trade-off: dos transformers para la misma entidad. Asumido.

### D4. Tres rutas en un grupo `tasks` protegido, `PATCH` parcial y `201` al crear

`GET /api/v1/tasks`, `POST /api/v1/tasks`, `PATCH /api/v1/tasks/:id`, en un grupo con `middleware.auth()` igual que `account`. Un solo controlador con `index`, `store` y `update`.

`store` toma el responsable de `auth.getUserOrFail()`, como el controlador de perfil, y responde `201` con `response.created(...)`, a diferencia del registro de cuentas, que responde `200`: es la convención REST y se decidió al proponer. `update` usa `findOrFail` (`404` si no existe), valida con un validador de campos opcionales y, si tras validar no llega ni `status` ni `assigneeId`, lanza un error de validación de VineJS construido a mano con `field` y `message`, para que el cliente reciba el mismo `422` que en cualquier otro fallo de validación. Alternativa descartada: aceptar `{}` como no-op con `200`; es más simple pero convierte un error del cliente en silencio.

La lista se obtiene con `Task.query().preload('assignee')` sin `orderBy`: el orden queda como punto abierto (PA-3) y no se codifica ningún criterio. `store` y `update` recargan la relación antes de transformar, para que la respuesta lleve siempre `assignee`.

### D5. Validación del título: recorte y longitud mínima de uno

`title: vine.string().trim().minLength(1).maxLength(200)`. `trim` corre antes que las demás reglas, así que un título con espacios en los extremos se guarda limpio. En la pila HTTP las cadenas vacías o de solo espacios del cuerpo se convierten en nulo antes de llegar al validador, de modo que un título vacío, en blanco o ausente falla siempre con `rule: "required"`; `minLength(1)` queda como red de seguridad para quien llame al validador fuera de una petición HTTP. `VineString` no tiene `notEmpty()` en la versión instalada de VineJS (4.4): esa regla solo existe para arrays, y como `vine.create` construye el esquema al importar el módulo, usarla rompería el arranque, no un caso límite. En la actualización, cualquier `title` que llegue se descarta porque el validador no lo declara: VineJS solo devuelve los campos conocidos.

### D6. Página `/tasks` con estado local, sin contexto global ni librería de datos

La página carga la lista una vez al montar (`useEffect` + `useState`), como hace el provider de auth con el perfil, y mantiene la lista en memoria: crear añade la tarea devuelta al final; cambiar el estado sustituye la tarea por la que devuelve el servidor. Ningún cambio se pinta antes de que el servidor lo confirme.

Por qué: no hay dependencias nuevas y no hay más de una pantalla que consuma tareas; un contexto o una caché serían infraestructura sin segundo consumidor. Sin actualización optimista porque «de inmediato» se cumple igual con una respuesta local y evita el caso de revertir un cambio pintado. Alternativa descartada: refetch de la lista completa tras cada escritura; es más simple pero hace que el orden visible pueda cambiar bajo los pies de la persona en un change donde el orden no está decidido.

### D7. Cambio de estado con un grupo de tres botones en la fila, no con un selector

Cada fila pinta tres botones (`Pendiente`, `En curso`, `Hecho`) con el componente Button existente; el estado actual va con la variante rellena y los otros dos con la de contorno; los tres se deshabilitan mientras la petición de esa fila está en curso.

Por qué: cumple «un gesto, sin diálogo, sin campo» con un clic y sin traer un componente Select (que exigiría añadir un componente de shadcn, y son dos interacciones). Un `<select>` nativo también valdría con dos interacciones pero no se estiliza con lo que hay. Trade-off: tres botones por fila ocupan más ancho; con tres estados es asumible y en móvil se apilan.

### D8. Formulario de creación integrado en la página, con comprobación local del blanco

Un `Input` con etiqueta «Título» y un `Button` «Crear tarea» en la cabecera de la página, con `noValidate` como en auth. Antes de llamar a la API se comprueba el título recortado: si está vacío se muestra «Escribe un título para la tarea.» bajo el campo sin ir al servidor, igual que hace el registro con la confirmación de contraseña. El resto de errores llega del servidor y se traduce en el cliente de API: se añade `title` al mapa de etiquetas y, para ese campo, las reglas `required` y `minLength` (la primera es la que llega por HTTP) se traducen como «Escribe un título para la tarea.» (el mismo texto que la comprobación local) y `maxLength` como «El título no puede superar los 200 caracteres.». El tipo de opciones de la función de petición del cliente admite hoy solo `GET` y `POST`; hay que ampliarlo con `PATCH`.

### D9. `/tasks` como aterrizaje y enlaces cruzados

Cambian tres sitios del enrutado: la ruta comodín, el destino de `PublicOnlyRoute` y la nueva ruta protegida. Los redirects tras registro e inicio de sesión no están en las páginas sino en el guard, así que cambiar el guard basta. La página de tareas lleva un enlace «Perfil» y la de perfil un enlace «Tareas», ambos con `Link` de react-router, sin barra de navegación común: con dos pantallas no hay nada que abstraer todavía.

## Risks / Trade-offs

- [El `CHECK` que no existe deja entrar un `status` inválido si alguien escribe saltándose el validador] → única vía de escritura en este change; si aparece otra (seeds, comandos), añadir la constante compartida a esa vía o revisar D1.
- [El registro generado de controladores y rutas en `.adonisjs/` queda obsoleto hasta arrancar el servidor] → la tarea de rutas incluye arrancar o correr `node ace list:routes` y commitear el diff generado.
- [Sin orden, la lista puede llegar en un orden distinto tras cada carga] → asumido y anotado como PA-3; se evita el refetch tras escribir (D6) para no cambiar el orden mientras se usa.
- [Tres botones por fila en pantallas estrechas] → apilar controles bajo el título con las utilidades de Tailwind existentes.
- [Sin tests, la única verificación es manual] → cada tarea de tasks.md lleva su comprobación con `curl` o en pantalla.

## Migration Plan

Una migración nueva que crea `tasks`; `node ace migration:run` regenera el esquema. No hay datos que migrar. Rollback: `node ace migration:rollback` elimina la tabla; el frontend sin la API devuelve un aviso de error en `/tasks` pero no rompe auth.

## Open Questions

Ninguna que pueda cambiar specs, enfoque o tareas. Los puntos abiertos de producto (orden, transiciones, límite de «En curso») están recogidos en el proposal y no bloquean la implementación.
