# Logistics Management System - Backend

This system enables distribution companies to optimize their operations through microservices for managing users, orders, inventory, geolocation, and reports.

---

## Technologies

- **Core:** Node.js, Express.js
- **Databases:** PostgreSQL (for relational data) with Prisma ORM, and MongoDB (for geolocation data) with Mongoose.
- **Containerization:** Docker & Docker Compose.
- **API Gateway:** Custom implementation using `http-proxy-middleware`.
- **CI/CD:** GitHub Actions.
- **Authentication:** JWT (JSON Web Tokens) for securing endpoints.
- **Notifications:** Nodemailer (for emails) and Twilio (for SMS).
- **API Documentation:** Swagger (OpenAPI).
- **File Handling:** Multer for file uploads, with support for CSV and Excel.

---

## Backend Architecture

The backend is designed using a microservices architecture, where each service is responsible for a specific domain. An API Gateway acts as a single entry point for all client requests.

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

Each microservice is a standalone app with its own `Dockerfile`, `package.json`, and business logic.

---

## Microservices

### 1. API Gateway

- **GitHub:** [api-gateway](https://github.com/Cruz1122/logistics-backend/tree/develop/api-gateway)
- **Description:** Single entry point for all incoming requests. Routes traffic to the appropriate microservice and serves a status page.
- **Base Path:** `/`
- **Features:**
    - Reverse proxy for all other microservices.
    - Serves a static status page (`/`).
- **Technologies:** `express`, `cors`, `http-proxy-middleware`.

### 2. Authentication Service (`auth-service`)

- **GitHub:** [auth-service](https://github.com/Cruz1122/logistics-backend/tree/develop/auth-service)
- **Description:** Manages user authentication, roles, and permissions.
- **Base Path:** `/auth`
- **Features:**
    - User registration (`/signup`)
    - Email verification and two-factor authentication (2FA) (`/verify-email`, `/verify-two-factor`).
    - User login (`/signin`)
    - Password management (reset, change).
    - CRUD operations for Users, Roles, and Permissions.
- **Technologies:** `express`, `@prisma/client`, `bcrypt`, `jsonwebtoken`, `nodemailer`, `twilio`, `swagger-jsdoc`.

### 3. Inventory Service (`inventory-service`)

- **GitHub:** [inventory-service](https://github.com/Cruz1122/logistics-backend/tree/develop/inventory-service)
- **Description:** Manages all inventory aspects, including products, categories, suppliers, and warehouses.
- **Base Path:** `/inventory`
- **Features:**
    - CRUD for Products, Categories, Suppliers, and Warehouses.
    - Manages stock levels and product movements between warehouses.
    - Bulk data import from CSV/Excel files for products and warehouses.
- **Technologies:** `express`, `@prisma/client`, `axios`, `csv-parser`, `xlsx`, `multer`, `nodemailer`.

### 4. Orders Service (`orders-service`)

- **GitHub:** [orders-service](https://github.com/Cruz1122/logistics-backend/tree/develop/orders-service)
- **Description:** Handles the full order lifecycle from creation to delivery assignment.
- **Base Path:** `/orders`
- **Features:**
    - CRUD operations for orders.
    - Delivery staff management.
    - Assigns available delivery personnel to new orders.
    - Address geocoding using the Google Maps API.
- **Technologies:** `express`, `@prisma/client`, `@googlemaps/google-maps-services-js`, `axios`, `nodemailer`.

### 5. Geolocation Service (`geo-service`)

- **GitHub:** [geo-service](https://github.com/Cruz1122/logistics-backend/tree/develop/geo-service)
- **Description:** Manages real-time geolocation tracking for deliveries.
- **Base Path:** `/geo`
- **Features:**
    - Saves and updates delivery staff locations.
    - Provides endpoints for location history and finding nearby couriers.
    - Real-time tracking via WebSockets.
- **Technologies:** `express`, `mongoose`, `socket.io`, `axios`.

### 6. Reports Service (`reports-service`)

- **GitHub:** [reports-service](https://github.com/Cruz1122/logistics-backend/tree/develop/reports-service)
- **Description:** Generates and serves reports based on data from other microservices.
- **Base Path:** `/reports`
- **Features:**
    - Generates delivery reports in PDF and XLSX formats.
    - Aggregates data from the `orders`, `inventory`, and `auth` services.
- **Technologies:** `express`, `pdfkit`, `exceljs`, `axios`, `moment`.

---

## How to Run the Project

### Prerequisites

- Docker
- Docker Compose

### Steps

1. **Clone the repository:**
    ```bash
    git clone https://github.com/Cruz1122/logistics-backend.git
    cd logistics-backend
    ```

2. **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example` and completing the required values.

3. **Build and run the services:**
    ```bash
    docker-compose up --build
    ```
    This command builds the Docker images for each microservice and starts them. Services will be accessible through the API Gateway at `http://localhost:3000`.
