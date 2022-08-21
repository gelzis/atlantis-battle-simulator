FROM node:16
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV NODE_ENV test
RUN npm run lint
RUN npm test
ENV NODE_ENV production
RUN npm run build
RUN chmod +x /usr/src/app/src/engine/engine

EXPOSE 4020
CMD ["node", "dist/backend/app.js"]
