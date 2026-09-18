## MODIFIED Requirements

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` un formulario con los campos «Nombre completo (opcional)», «Email», «Contraseña» y «Repite la contraseña», un botón «Crear cuenta» y un enlace «Inicia sesión» hacia `/login`.

#### Scenario: Registro correcto

- **WHEN** la persona rellena email, contraseña y confirmación válidos y pulsa «Crear cuenta»
- **THEN** el botón muestra «Creando cuenta…» y queda deshabilitado mientras se espera la respuesta
- **AND** al completarse, la sesión queda iniciada y la persona es llevada a `/tasks` sin pasar por el inicio de sesión

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
- **AND** al completarse, la persona es llevada a `/tasks`

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

### Requirement: Protección de rutas en la aplicación web

La aplicación web SHALL restringir `/tasks` y `/profile` a personas con sesión iniciada, SHALL apartar de `/login` y `/register` a quien ya tiene sesión, y SHALL redirigir cualquier otra ruta a `/tasks`.

#### Scenario: Ruta protegida sin sesión

- **WHEN** una persona sin sesión abre `/tasks` o `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Pantallas de acceso con sesión iniciada

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** es llevada a `/tasks`

#### Scenario: Ruta desconocida

- **WHEN** se abre cualquier ruta distinta de `/login`, `/register`, `/tasks` y `/profile`
- **THEN** la persona es llevada a `/tasks`, y desde ahí a `/login` si no tiene sesión

#### Scenario: Sin redirecciones mientras se restaura la sesión

- **WHEN** la aplicación aún está comprobando una sesión guardada
- **THEN** cualquier ruta muestra el indicador de carga en lugar de redirigir

### Requirement: Pantalla de perfil y cierre de sesión

La aplicación web SHALL mostrar en `/profile` los datos de la cuenta, SHALL ofrecer un enlace «Tareas» hacia `/tasks` y SHALL permitir cerrar la sesión desde esa pantalla.

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

#### Scenario: Volver a la lista

- **WHEN** la persona pulsa el enlace «Tareas» en la pantalla de perfil
- **THEN** es llevada a `/tasks`
