<<<<<<< HEAD
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

=======
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

>>>>>>> 0afbe7bb440a2cd7fa92381b5002449f20f09162
CMD ["npm", "start"]