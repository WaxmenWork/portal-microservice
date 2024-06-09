FROM node:20.11-alpine

WORKDIR /app

COPY package*.json ./

# RUN npm install

# COPY . .

RUN npm install

RUN chmod -R 777 node_modules

COPY ./dist ./dist

CMD ["npm", "run", "start"]