FROM node:18

WORKDIR /app

# Copia package.json e install
COPY package*.json ./

# Instala todas las dependencias (asegúrate que @prisma/client esté en "dependencies")
RUN npm install -g nodemon
RUN npm install

# Copia el resto del código
COPY . .

# Genera el cliente Prisma (ya con todo el código y schema disponible)
RUN npx prisma generate

# Comando de inicio
CMD ["npx", "nodemon", "src/index.js"]
