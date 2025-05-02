#!/bin/bash
set -e

echo "CI pipeline iniciado dentro del contenedor Docker"

# Paso 1: Crear archivos .env necesarios
echo "Generando archivos .env..."

# .env variables
cat <<EOF > .env
GATEWAY_PORT=${GATEWAY_PORT}
AUTH_URL=${AUTH_URL}
GEO_URL=${GEO_URL}
INVENTORY_URL=${INVENTORY_URL}
ORDERS_URL=${ORDERS_URL}
REPORTS_URL=${REPORTS_URL}
AUTH_DATABASE_URL=${AUTH_DATABASE_URL}
AUTH_PORT=${AUTH_PORT}
DIRECT_URL=${DIRECT_URL}
JWT_SECRET=${JWT_SECRET}
INTERNAL_SECRET=${INTERNAL_SECRET}
RENDER_DEPLOY_HOOK=${RENDER_DEPLOY_HOOK}
EOF

echo "Archivos .env creados."

# Paso 2: Construir los servicios
echo "Construyendo servicios con Docker Compose..."
docker compose -f docker-compose.yml build
echo "Servicios construidos."

# Paso 3: Levantar los servicios en segundo plano
echo "Iniciando servicios..."
docker compose -f docker-compose.yml up -d
echo "Servicios iniciados."

# Paso 4: Esperar que los servicios estén listos
echo "Esperando que los servicios estén listos..."
sleep 10

# Paso 5: Verificar health de auth-service
echo "Verificando healthcheck de auth-service..."
curl -v http://localhost:3000/auth/auth/health || {
  echo "auth-service está unhealthy"
  exit 1
}

# Paso 6: Ejecutar tests de auth-service
echo "Ejecutando pruebas de auth-service..."
docker exec logistics-backend-auth-service-1 npm test

# Paso 7: Desplegar en Render
if [ -z "$RENDER_DEPLOY_HOOK" ]; then
  echo "ERROR: La variable RENDER_DEPLOY_HOOK no está definida."
  exit 1
fi

echo "🚀 Iniciando despliegue en Render..."

curl -X POST "$RENDER_DEPLOY_HOOK"

echo "Despliegue solicitado correctamente."



echo "CI finalizado correctamente"
