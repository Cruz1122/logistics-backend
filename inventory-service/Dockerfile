FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

# Comando de inicio
CMD ["sh", "-c", "npx prisma db push && npm start"]

