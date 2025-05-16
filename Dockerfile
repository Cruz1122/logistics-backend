# Imagen base de Node.js
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

RUN cd auth-service && npm install && \
    cd ../geo-service && npm install && \
    cd ../inventory-service && npm install && \
    cd ../orders-service && npm install && \
    cd ../reports-service && npm install && \
    cd ../api-gateway && npm install

# Copiar todo el código
COPY . .

# Instalar PM2 globalmente
RUN npm install -g pm2

# Copiar archivo de configuración de procesos
COPY ecosystem.config.js .

# Exponer el puerto principal (usa el de tu api-gateway)
EXPOSE 3000

# Comando de inicio
CMD ["pm2-runtime", "ecosystem.config.js"]