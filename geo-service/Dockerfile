FROM node:18

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules && npm install


COPY . .

CMD ["src/index.js"]
