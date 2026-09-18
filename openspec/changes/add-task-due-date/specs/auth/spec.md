## MODIFIED Requirements

### Requirement: Protección de rutas en la aplicación web

La aplicación web SHALL restringir `/tasks`, `/tasks/:id` y `/profile` a personas con sesión iniciada, SHALL apartar de `/login` y `/register` a quien ya tiene sesión, y SHALL redirigir cualquier otra ruta a `/tasks`.

#### Scenario: Ruta protegida sin sesión

- **WHEN** una persona sin sesión abre `/tasks`, `/tasks/:id` o `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Pantallas de acceso con sesión iniciada

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** es llevada a `/tasks`

#### Scenario: Ruta desconocida

- **WHEN** se abre cualquier ruta distinta de `/login`, `/register`, `/tasks`, `/tasks/:id` y `/profile`
- **THEN** la persona es llevada a `/tasks`, y desde ahí a `/login` si no tiene sesión

#### Scenario: Sin redirecciones mientras se restaura la sesión

- **WHEN** la aplicación aún está comprobando una sesión guardada
- **THEN** cualquier ruta muestra el indicador de carga en lugar de redirigir
