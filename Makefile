# FlowSync — atajos de desarrollo para Spring Boot + React.

SHELL := /bin/bash

BACKEND := backend-spring
FRONTEND := frontend

.DEFAULT_GOAL := help
.PHONY: help setup check-runtime install verify start start-backend start-frontend clean

help: ## Muestra esta ayuda
	@echo "FlowSync — targets disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN { FS = ":.*## " }; { printf "  make %-15s %s\n", $$1, $$2 }'

setup: check-runtime install ## Instala dependencias y verifica el proyecto
	@$(MAKE) verify
	@echo "Setup completado. Arranca todo con: make start"

check-runtime:
	@command -v java >/dev/null 2>&1 || { echo "Java no está instalado (se requiere JDK 21)."; exit 1; }
	@java -version 2>&1 | head -n 1 | grep -Eq 'version "21([.]|"|$$)' \
		|| { echo "La versión activa de Java no es 21."; java -version; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "Node.js no está instalado (se requiere Node 22)."; exit 1; }
	@node -e 'if (Number(process.versions.node.split(".")[0]) !== 22) process.exit(1)' \
		|| { echo "La versión activa de Node.js no es 22. Ejecuta: nvm use"; node --version; exit 1; }

install:
	@echo "Instalando dependencias del frontend..."
	@cd $(FRONTEND) && npm ci
	@echo "Preparando dependencias Maven..."
	@cd $(BACKEND) && ./mvnw --quiet dependency:go-offline

verify: ## Ejecuta pruebas y validaciones de backend y frontend
	@cd $(BACKEND) && ./mvnw verify
	@cd $(FRONTEND) && npm run lint
	@cd $(FRONTEND) && npm run build
	@cd $(FRONTEND) && npm exec -- prettier --check .

start-backend: ## Levanta Spring Boot en :8080
	@cd $(BACKEND) && ./mvnw spring-boot:run

start-frontend: ## Levanta Vite en :5173
	@cd $(FRONTEND) && npm run dev

start: ## Levanta backend y frontend; Ctrl-C detiene ambos
	@echo "Arrancando backend (:8080) y frontend (:5173)..."
	@trap 'trap - INT TERM EXIT; kill -INT 0' INT TERM EXIT; \
	( cd $(BACKEND) && ./mvnw spring-boot:run; \
	  echo "El backend se ha detenido. Cerrando el frontend."; kill -INT 0 ) & \
	( cd $(FRONTEND) && npm run dev; \
	  echo "El frontend se ha detenido. Cerrando el backend."; kill -INT 0 ) & \
	wait

clean: ## Elimina artefactos generados; conserva la base H2 de desarrollo
	@cd $(BACKEND) && ./mvnw clean
	@rm -rf $(FRONTEND)/dist
	@echo "Artefactos de compilación eliminados. La base H2 y node_modules se conservan."
