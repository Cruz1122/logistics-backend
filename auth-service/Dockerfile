FROM node:18

WORKDIR /app

# Copia package.json e install
COPY package*.json ./

# Instala todas las dependencias (asegúrate que @prisma/client esté en "dependencies")
RUN npm install

# Copia el resto del código
COPY . .


RUN npm rebuild bcrypt --build-from-source
# Genera el cliente Prisma (ya con todo el código y schema disponible)
RUN npx prisma generate

# Comando de inicio
CMD ["sh", "-c", "npx prisma db push && npm start"]

