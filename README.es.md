# Sistema de Gestión Logística - Backend

Este sistema permite a empresas de distribución optimizar sus operaciones mediante microservicios para la gestión de usuarios, pedidos, inventario, geolocalización y reportes.

---

## Tecnologías

-   **Core:** Node.js, Express.js
-   **Bases de Datos:** PostgreSQL (para datos relacionales) con Prisma ORM, y MongoDB (para datos de geolocalización) con Mongoose.
-   **Contenerización:** Docker & Docker Compose.
-   **API Gateway:** Implementación personalizada usando `http-proxy-middleware`.
-   **CI/CD:** GitHub Actions.
-   **Autenticación:** JWT (JSON Web Tokens) para la seguridad de los endpoints.
-   **Notificaciones:** Nodemailer (para correos electrónicos) y Twilio (para SMS).
-   **Documentación de API:** Swagger (OpenAPI).
-   **Manejo de Archivos:** Multer para la subida de archivos, con soporte para CSV y Excel.

---

## Arquitectura del Backend

El backend está diseñado con una arquitectura de microservicios, donde cada servicio es responsable de un dominio específico. Un API Gateway actúa como punto de entrada único para todas las solicitudes de los clientes.


```plaintext
├── api-gateway/
├── auth-service/
├── inventory-service/
├── orders-service/
├── geo-service/
├── reports-service/
├── docker-compose.yml
└── .env (local)
```

Cada microservicio es una aplicación autónoma con su propio `Dockerfile`, `package.json` y lógica de negocio.

---

## Microservicios

### 1. API Gateway

-   **GitHub:** [api-gateway](https://github.com/Cruz1122/logistics-backend/tree/develop/api-gateway)
-   **Descripción:** Punto de entrada único para todas las peticiones entrantes. Enruta el tráfico al microservicio apropiado y sirve una página de estado estática.
-   **Ruta Base:** `/`
-   **Funcionalidades:**
    -   Proxy inverso para todos los demás microservicios.
    -   Sirve una página estática para ver el estado de los servicios (`/`).
-   **Tecnologías:** `express`, `cors`, `http-proxy-middleware`.

### 2. Servicio de Autenticación (`auth-service`)

-   **GitHub:** [auth-service](https://github.com/Cruz1122/logistics-backend/tree/develop/auth-service)
-   **Descripción:** Gestiona la autenticación de usuarios, roles y permisos.
-   **Ruta Base:** `/auth`
-   **Funcionalidades:**
    -   Registro de usuarios (`/signup`)
    -   Verificación de correo y autenticación de dos factores (2FA) (`/verify-email`, `/verify-two-factor`).
    -   Inicio de sesión de usuarios (`/signin`).
    -   Gestión de contraseñas (restablecimiento, cambio).
    -   Operaciones CRUD para Usuarios, Roles y Permisos.
-   **Tecnologías:** `express`, `@prisma/client`, `bcrypt`, `jsonwebtoken`, `nodemailer`, `twilio`, `swagger-jsdoc`.

### 3. Servicio de Inventario (`inventory-service`)

-   **GitHub:** [inventory-service](https://github.com/Cruz1122/logistics-backend/tree/develop/inventory-service)
-   **Descripción:** Administra todos los aspectos del inventario, incluyendo productos, categorías, proveedores y almacenes.
-   **Ruta Base:** `/inventory`
-   **Funcionalidades:**
    -   CRUD para Productos, Categorías, Proveedores y Almacenes.
    -   Gestiona los niveles de stock y los movimientos de productos entre almacenes.
    -   Importación masiva de datos desde archivos CSV/Excel para productos y almacenes.
-   **Tecnologías:** `express`, `@prisma/client`, `axios`, `csv-parser`, `xlsx`, `multer`, `nodemailer`.

### 4. Servicio de Pedidos (`orders-service`)

-   **GitHub:** [orders-service](https://github.com/Cruz1122/logistics-backend/tree/develop/orders-service)
-   **Descripción:** Maneja el ciclo de vida completo de un pedido, desde su creación hasta la asignación de un repartidor.
-   **Ruta Base:** `/orders`
-   **Funcionalidades:**
    -   Operaciones CRUD para pedidos.
    -   Gestión del personal de reparto.
    -   Asigna repartidores disponibles a nuevos pedidos.
    -   Geocodificación de direcciones de entrega usando la API de Google Maps.
-   **Tecnologías:** `express`, `@prisma/client`, `@googlemaps/google-maps-services-js`, `axios`, `nodemailer`.

### 5. Servicio de Geolocalización (`geo-service`)

-   **GitHub:** [geo-service](https://github.com/Cruz1122/logistics-backend/tree/develop/geo-service)
-   **Descripción:** Gestiona el seguimiento de la geolocalización en tiempo real para las entregas.
-   **Ruta Base:** `/geo`
-   **Funcionalidades:**
    -   Guarda y actualiza la ubicación del personal de reparto.
    -   Provee endpoints para obtener el historial de ubicaciones y encontrar repartidores cercanos.
    -   Seguimiento en tiempo real a través de WebSockets.
-   **Tecnologías:** `express`, `mongoose`, `socket.io`, `axios`.

### 6. Servicio de Reportes (`reports-service`)

-   **GitHub:** [reports-service](https://github.com/Cruz1122/logistics-backend/tree/develop/reports-service)
-   **Descripción:** Genera y sirve reportes basados en los datos de los otros microservicios.
-   **Ruta Base:** `/reports`
-   **Funcionalidades:**
    -   Genera reportes de entrega en formato PDF y XLSX.
    -   Agrega datos de los servicios de `orders`, `inventory`, y `auth`.
-   **Tecnologías:** `express`, `pdfkit`, `exceljs`, `axios`, `moment`.

---

## Cómo Ejecutar el Proyecto

### Prerrequisitos

-   Docker
-   Docker Compose

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/Cruz1122/logistics-backend.git
    cd logistics-backend
    ```

2.  **Configurar las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto, copiando el archivo `.env.example` y completando los valores requeridos.

3.  **Construir y ejecutar los servicios:**
    ```bash
    docker-compose up --build
    ```
    Este comando construirá las imágenes de Docker para cada microservicio y los iniciará. Los servicios serán accesibles a través del API Gateway en `http://localhost:3000`.
