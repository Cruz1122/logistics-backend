FROM node:18

WORKDIR /app

COPY package*.json ./

# Instala nodemon globalmente
RUN npm install -g nodemon

RUN npm install

COPY . .

CMD ["nodemon", "src/index.js"]
