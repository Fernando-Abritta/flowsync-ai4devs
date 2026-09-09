# FlowSync

Proyecto de práctica del curso: gestión de tareas en equipo. API en Spring Boot 4.1 / Java 21 (`backend-spring/`) + frontend en React 19 + Vite (`frontend/`).

## Empezar

```bash
git clone https://github.com/LIDR-academy/flowsync-ai4devs.git
cd flowsync-ai4devs
git checkout petroecuador-s2/start
```

> Si el `clone` falla, avisa a tu TA. La rama de inicio no contiene todavía
> `docs/prd/` ni `docs/backlog/`: esos artefactos se crean durante S2.

## Arranque rápido

Requiere JDK 21, Node.js 22 y GNU Make. Si usas NVM, desde la raíz ejecuta
`nvm use`; el archivo `.nvmrc` selecciona la versión correcta.

```bash
make setup
make start
```

`make start` levanta Spring Boot en `http://localhost:8080` y Vite en
`http://localhost:5173`. `Ctrl-C` detiene ambos procesos. Usa `make help` para
ver el resto de los comandos disponibles.

## Backend (`backend-spring/`)

Requiere JDK 21 instalado (`java -version`); no hace falta Maven global, el
proyecto trae su propio wrapper.

```bash
cd backend-spring
./mvnw spring-boot:run
```

Arranca en `http://localhost:8080`. El esquema lo crea Flyway automáticamente
al arrancar sobre una base H2 embebida (persistida en `./data`, ignorada por
git); no requiere ningún paso de setup adicional.

## Frontend (`frontend/`)

Abre otra terminal en la raíz del repo (el backend se queda corriendo en la primera):

```bash
cd frontend
nvm use
npm ci
npm run dev
```

Arranca en `http://localhost:5173`.

Las instrucciones completas de prework (checklist + priming) están en el Módulo 1 del asíncrono del curso.

## Backend histórico

`backend/` conserva la implementación anterior en AdonisJS únicamente como
referencia de paridad. El backend activo para S2 es `backend-spring/`.
