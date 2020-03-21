FROM node:10-alpine
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV NODE_ENV production
RUN npm run lint
RUN npm run build

EXPOSE 4020
CMD ["node", "dist/backend/app.js"]
