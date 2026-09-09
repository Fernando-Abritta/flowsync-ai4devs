# FlowSync Frontend

Cliente React 19 + TypeScript + Vite para la API de Spring Boot ubicada en
`../backend-spring`.

Requiere Node.js 22.22 o superior, que es la versión mínima admitida por
React Router 8.

## Desarrollo

Arranca primero el backend en una terminal:

```bash
cd backend-spring
./mvnw spring-boot:run
```

En otra terminal, instala las dependencias y levanta el frontend:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173` y usa por defecto la
API de `http://localhost:8080`. Puedes cambiarla creando `.env` a partir de
`.env.example` y modificando `VITE_API_URL`.

## Flujo de autenticación

- `/register`: crea una cuenta y abre la sesión.
- `/login`: inicia sesión con email y contraseña.
- `/profile`: ruta protegida que carga el perfil autenticado.
- El token se guarda en `localStorage` y se valida contra el backend al cargar.
- Al cerrar sesión se limpia el estado local y se notifica al backend.

## Verificación

```bash
npm run lint
npm run build
npm run format
```
