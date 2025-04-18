# 🚚 Sistema de Gestión Logística con Geolocalización - Backend

Proyecto final de Ingeniería de Software II (2025-1)

Este sistema permite a empresas de distribución optimizar sus operaciones mediante microservicios para la gestión de usuarios, pedidos, inventario, geolocalización y reportes.

---

## 📦 Tecnologías

- Node.js + Express
- Docker & Docker Compose
- PostgreSQL + Prisma (servicios relacionales)
- MongoDB (datos no estructurados / geolocalización)
- API Gateway (http-proxy-middleware)
- React + Vite (Frontend – en otro repo)
- CI/CD: GitHub Actions (opcional)
- Otros: JWT, Nodemailer, Twilio, ESLint

---

## 🧱 Estructura del backend

```bash
backend/
├── api-gateway/
├── auth-service/
├── inventory-service/
├── orders-service/
├── geo-service/
├── reports-service/
├── docker-compose.yml
└── .env (local)
```

Cada microservicio tiene su propio `Dockerfile`, `package.json` y lógica interna.

---

## 🐳 Cómo levantar el proyecto

### 🔧 Requisitos previos

- Tener instalado: Docker y Docker Compose

### ▶️ Pasos

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Esto levantará todos los servicios en red interna. Podrás acceder a ellos vía API Gateway.

---

## 🌐 Rutas principales

| Servicio        | Puerto | Endpoint base |
|-----------------|--------|---------------|
| API Gateway     | 3000   | `http://localhost:3000` |
| Auth Service    | 4001   | `/auth` |
| Inventario      | 4002   | `/inventory` |
| Pedidos         | 4003   | `/orders` |
| Geolocalización | 4004   | `/geo` |
| Reportes        | 4005   | `/reports` |

> Accede a todo a través del gateway (por ejemplo: `http://localhost:3000/auth/login`)

---

## ⚙️ Comandos útiles

```bash
# Ver contenedores activos
docker ps

# Ver logs de un servicio
docker logs auth-service

# Entrar a un contenedor
docker exec -it auth-service sh
```

---

## 🔀 Flujo de trabajo con Git

### Ramas:

- `main` → Producción
- `develop` → Desarrollo integrado

### Crear rama nueva desde develop:

```bash
git checkout develop
git pull
git checkout -b feature/nombre-de-tu-feature
```

---

## 👥 Integrantes

- 👨‍💻 Juan Felipe Henao Tovar – Scrum Master / Backend
- 🧑‍🎨 Jhon Hander Patiño Londoño – Product Owner / Frontend
- ⚙️ Juan Camilo Cruz Parra – DevOps / Full Stack

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos para la materia Ingeniería de Software II - Universidad de Caldas (2025).
