# Auth Specification

## Purpose

Describe cómo una persona crea su cuenta en FlowSync, inicia y cierra sesión, mantiene esa sesión entre recargas del navegador y consulta su perfil, tanto a través de la API HTTP como de las pantallas de acceso de la aplicación web.

## Requirements

### Requirement: Registro de una cuenta nueva

El sistema SHALL permitir crear una cuenta mediante `POST /api/v1/auth/signup` con un cuerpo JSON `{ fullName, email, password, passwordConfirmation }` y SHALL dejar a la persona autenticada en esa misma petición.

#### Scenario: Registro válido

- **WHEN** se envía un cuerpo con `fullName` (texto o `null`), un `email` con formato válido de como mucho 254 caracteres que no esté registrado, una `password` de entre 8 y 32 caracteres y una `passwordConfirmation` idéntica
- **THEN** la respuesta es `200` con `{ "data": { "user": { "id", "fullName", "email", "createdAt", "updatedAt", "initials" }, "token" } }`
- **AND** `token` es una cadena opaca que empieza por `oat_` y sirve como credencial en las rutas protegidas
- **AND** la contraseña no aparece en ningún campo de la respuesta

#### Scenario: Registro sin nombre

- **WHEN** se envía `fullName` con valor `null`
- **THEN** la cuenta se crea y `user.fullName` es `null` en la respuesta y en el perfil

#### Scenario: Email ya registrado

- **WHEN** se envía un `email` que coincide exactamente (misma escritura, distinguiendo mayúsculas y minúsculas) con el de una cuenta existente
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule": "database.unique", "field": "email" } ] }`
- **AND** no se crea ninguna cuenta ni se emite ningún token

#### Scenario: Datos inválidos

- **WHEN** falta la clave `fullName`, el `email` no tiene formato válido o supera los 254 caracteres, la `password` tiene menos de 8 o más de 32 caracteres, o `passwordConfirmation` no coincide con `password`
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule", "field", "meta"? }, ... ] }`, un elemento por cada regla incumplida, con `field` identificando el campo afectado
- **AND** no se crea ninguna cuenta

### Requirement: Inicio de sesión con email y contraseña

El sistema SHALL autenticar a una persona mediante `POST /api/v1/auth/login` con un cuerpo JSON `{ email, password }` y SHALL emitir un token de acceso nuevo en cada inicio de sesión correcto.

#### Scenario: Credenciales correctas

- **WHEN** se envía el `email` de una cuenta existente (con la misma escritura con la que se registró) y su contraseña
- **THEN** la respuesta es `200` con `{ "data": { "user": { "id", "fullName", "email", "createdAt", "updatedAt", "initials" }, "token" } }`
- **AND** el `token` es distinto del emitido en inicios de sesión anteriores, y esos tokens anteriores siguen siendo válidos

#### Scenario: Credenciales incorrectas

- **WHEN** el `email` no corresponde a ninguna cuenta, la contraseña no coincide, o la contraseña es una cadena vacía
- **THEN** la respuesta es `400` con `{ "errors": [ { "message": "Invalid user credentials" } ] }`, idéntica en los tres casos
- **AND** no se emite ningún token

#### Scenario: Cuerpo inválido

- **WHEN** falta `email` o `password`, o el `email` no tiene formato válido
- **THEN** la respuesta es `422` con `{ "errors": [ { "message", "rule", "field" }, ... ] }` sin llegar a comprobar las credenciales

### Requirement: Acceso a rutas protegidas con token portador

El sistema SHALL exigir, en las rutas bajo `/api/v1/account`, una cabecera `Authorization: Bearer <token>` con un token emitido por el propio sistema y no revocado, y SHALL rechazar cualquier otra petición.

#### Scenario: Token válido

- **WHEN** la petición lleva `Authorization: Bearer <token>` con un token emitido en un registro o inicio de sesión y no revocado (el esquema `Bearer` se acepta sin distinguir mayúsculas)
- **THEN** la petición se procesa en nombre de la cuenta dueña del token

#### Scenario: Token ausente, malformado, desconocido o revocado

- **WHEN** la petición no lleva cabecera `Authorization`, la lleva con otro esquema, con un token que el sistema no emitió, o con un token que ya se revocó al cerrar sesión
- **THEN** la respuesta es `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }`

#### Scenario: El token no caduca por tiempo

- **WHEN** se usa un token emitido hace cualquier cantidad de tiempo que no ha sido revocado
- **THEN** la petición se acepta igual que con un token recién emitido

#### Scenario: Las rutas públicas ignoran la cabecera de autorización

- **WHEN** se envía a `POST /api/v1/auth/signup` o `POST /api/v1/auth/login` una cabecera `Authorization` con un token inválido o revocado
- **THEN** la petición se procesa exactamente igual que sin esa cabecera

### Requirement: Consulta del perfil propio

El sistema SHALL devolver en `GET /api/v1/account/profile` los datos públicos de la cuenta autenticada, incluidas unas iniciales calculadas a partir del nombre o, en su defecto, del email.

#### Scenario: Perfil de la cuenta autenticada

- **WHEN** se envía `GET /api/v1/account/profile` con un token válido
- **THEN** la respuesta es `200` con `{ "data": { "id", "fullName", "email", "createdAt", "updatedAt", "initials" } }`, con las fechas en formato ISO 8601 y sin ningún dato de contraseña

#### Scenario: Iniciales con nombre de dos o más palabras

- **WHEN** `fullName` contiene al menos dos palabras separadas por un espacio (por ejemplo `Ada Lovelace` o `Ada Byron Lovelace`)
- **THEN** `initials` es la primera letra de las dos primeras palabras en mayúsculas (`AL` o `AB`)

#### Scenario: Iniciales con nombre de una sola palabra

- **WHEN** `fullName` contiene una sola palabra (por ejemplo `Ada`)
- **THEN** `initials` son sus dos primeras letras en mayúsculas (`AD`)

#### Scenario: Iniciales sin nombre

- **WHEN** `fullName` es `null`
- **THEN** `initials` se calcula sobre el email como la primera letra de la parte local seguida de la primera letra del dominio, en mayúsculas (`ada@example.com` da `AE`)

### Requirement: Cierre de sesión

El sistema SHALL revocar en `POST /api/v1/account/logout` únicamente el token con el que se hizo esa petición, dejando intactos los demás tokens de la misma cuenta.

#### Scenario: Cierre de sesión con token válido

- **WHEN** se envía `POST /api/v1/account/logout` con un token válido
- **THEN** la respuesta es `200` con `{ "message": "Logged out successfully" }` (sin envoltorio `data`)
- **AND** cualquier petición posterior con ese mismo token recibe `401`

#### Scenario: Otras sesiones de la misma cuenta siguen abiertas

- **WHEN** una cuenta tiene varios tokens vivos (varios inicios de sesión) y cierra sesión con uno de ellos
- **THEN** los demás tokens siguen aceptándose en las rutas protegidas

#### Scenario: Cierre de sesión sin token válido

- **WHEN** se envía `POST /api/v1/account/logout` sin token, o con uno ya revocado
- **THEN** la respuesta es `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }`

### Requirement: Respuestas siempre en JSON

El sistema SHALL responder a todas las peticiones de la API de cuentas y acceso con cuerpos JSON, con independencia de la cabecera `Accept` del cliente.

#### Scenario: Error con Accept distinto de JSON

- **WHEN** una petición de acceso falla (validación, credenciales o autorización) y lleva `Accept: text/html` o ninguna cabecera `Accept`
- **THEN** el cuerpo de error es el mismo objeto JSON `{ "errors": [...] }` que se devolvería con `Accept: application/json`

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` un formulario con los campos «Nombre completo (opcional)», «Email», «Contraseña» y «Repite la contraseña», un botón «Crear cuenta» y un enlace «Inicia sesión» hacia `/login`.

#### Scenario: Registro correcto

- **WHEN** la persona rellena email, contraseña y confirmación válidos y pulsa «Crear cuenta»
- **THEN** el botón muestra «Creando cuenta…» y queda deshabilitado mientras se espera la respuesta
- **AND** al completarse, la sesión queda iniciada y la persona es llevada a `/profile` sin pasar por el inicio de sesión

#### Scenario: Nombre en blanco

- **WHEN** la persona deja el nombre vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre y el perfil muestra «Sin nombre»

#### Scenario: Las contraseñas no coinciden

- **WHEN** la persona pulsa «Crear cuenta» con una confirmación distinta de la contraseña
- **THEN** no se envía nada al servidor y bajo «Repite la contraseña» aparece «Las contraseñas no coinciden.»

#### Scenario: Errores de validación del servidor

- **WHEN** el servidor rechaza el registro con errores por campo (email ya registrado, email inválido o vacío, contraseña fuera de longitud o vacía)
- **THEN** cada error aparece en castellano debajo del campo correspondiente (por ejemplo «Ese email ya está registrado. Inicia sesión en su lugar.», «Introduce una dirección de email válida.», «la contraseña debe tener al menos 8 caracteres.»)
- **AND** el formulario no muestra aviso general cuando todos los errores han podido colocarse bajo un campo

#### Scenario: Pista de longitud de contraseña

- **WHEN** el campo «Contraseña» no tiene ningún error
- **THEN** debajo de él se lee «Entre 8 y 32 caracteres.»

#### Scenario: El navegador no valida por su cuenta

- **WHEN** la persona pulsa «Crear cuenta» con campos obligatorios vacíos
- **THEN** el navegador no bloquea el envío; la petición llega al servidor y los errores vuelven bajo cada campo

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer en `/login` un formulario con los campos «Email» y «Contraseña», un botón «Entrar» y un enlace «Crea una» hacia `/register`.

#### Scenario: Inicio de sesión correcto

- **WHEN** la persona introduce credenciales válidas y pulsa «Entrar»
- **THEN** el botón muestra «Entrando…» y queda deshabilitado mientras se espera la respuesta
- **AND** al completarse, la persona es llevada a `/profile`

#### Scenario: Credenciales incorrectas

- **WHEN** el servidor rechaza las credenciales
- **THEN** aparece en la parte superior del formulario el aviso «El email o la contraseña no son correctos.», sin señalar ningún campo concreto

#### Scenario: Email con formato inválido

- **WHEN** el servidor rechaza el email por su formato
- **THEN** bajo el campo «Email» aparece «Introduce una dirección de email válida.»

#### Scenario: El navegador no valida por su cuenta

- **WHEN** la persona pulsa «Entrar» con el email o la contraseña vacíos
- **THEN** el navegador no bloquea el envío; la petición llega al servidor y el error vuelve bajo el campo «Email» o como aviso de credenciales incorrectas

#### Scenario: Aviso de sesión perdida

- **WHEN** la persona llega a `/login` porque una sesión guardada no pudo restaurarse
- **THEN** el motivo se muestra como aviso en la parte superior del formulario hasta que un nuevo intento de acceso lo sustituya por su propio resultado

### Requirement: Mensajes ante fallos de comunicación

La aplicación web SHALL explicar en castellano, dentro del propio formulario de acceso, cualquier fallo que no sea un error de validación por campo.

#### Scenario: Servidor inalcanzable

- **WHEN** la petición de registro o inicio de sesión no obtiene respuesta del servidor
- **THEN** el formulario muestra «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.»

#### Scenario: Error inesperado del servidor

- **WHEN** el servidor responde con un error que no es de validación, de credenciales ni de autorización
- **THEN** el formulario muestra «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

### Requirement: Persistencia y restauración de la sesión

La aplicación web SHALL conservar la sesión en el navegador entre recargas y SHALL restaurarla solo si el servidor sigue reconociendo el token guardado.

#### Scenario: Recarga con sesión válida

- **WHEN** la persona recarga la página teniendo una sesión iniciada
- **THEN** se muestra un indicador de carga mientras se comprueba la sesión con el servidor
- **AND** al confirmarse, la persona sigue en la ruta protegida sin volver a introducir credenciales

#### Scenario: Recarga con token rechazado

- **WHEN** al recargar el servidor responde que el token ya no es válido
- **THEN** la sesión guardada se descarta, la persona es llevada a `/login` y ve el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.»

#### Scenario: Recarga con el servidor caído

- **WHEN** al recargar no se puede contactar con el servidor o este responde con un error inesperado
- **THEN** la persona es llevada a `/login` con el aviso correspondiente al fallo
- **AND** el token guardado se conserva, de modo que una recarga posterior con el servidor disponible restaura la sesión sin volver a introducir credenciales

### Requirement: Protección de rutas en la aplicación web

La aplicación web SHALL restringir `/profile` a personas con sesión iniciada, SHALL apartar de `/login` y `/register` a quien ya tiene sesión, y SHALL redirigir cualquier otra ruta a `/profile`.

#### Scenario: Ruta protegida sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Pantallas de acceso con sesión iniciada

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** es llevada a `/profile`

#### Scenario: Ruta desconocida

- **WHEN** se abre cualquier ruta distinta de `/login`, `/register` y `/profile`
- **THEN** la persona es llevada a `/profile`, y desde ahí a `/login` si no tiene sesión

#### Scenario: Sin redirecciones mientras se restaura la sesión

- **WHEN** la aplicación aún está comprobando una sesión guardada
- **THEN** cualquier ruta muestra el indicador de carga en lugar de redirigir

### Requirement: Pantalla de perfil y cierre de sesión

La aplicación web SHALL mostrar en `/profile` los datos de la cuenta y SHALL permitir cerrar la sesión desde esa pantalla.

#### Scenario: Datos mostrados

- **WHEN** una persona con sesión iniciada abre `/profile`
- **THEN** ve un avatar con sus iniciales, su nombre completo (o «Sin nombre» si no lo tiene), su email y la fecha de creación de la cuenta bajo «Miembro desde» en formato largo en castellano

#### Scenario: Cierre de sesión

- **WHEN** la persona pulsa «Cerrar sesión»
- **THEN** la sesión local se cierra de inmediato y la persona es llevada a `/login`
- **AND** el token deja de ser válido en el servidor

#### Scenario: Cierre de sesión con el servidor caído

- **WHEN** la persona pulsa «Cerrar sesión» y el servidor no responde o rechaza la petición
- **THEN** la sesión local se cierra igualmente y la persona es llevada a `/login`
