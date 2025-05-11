FROM node:18

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules && npm install

COPY . .

RUN npx prisma generate

# Comando de inicio
CMD ["sh", "-c", "npx prisma db push && npm start"]

