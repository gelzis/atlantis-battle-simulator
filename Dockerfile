FROM node:10
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV NODE_ENV production
RUN npm run build

EXPOSE 6666
CMD ["node", "dist/backend/app.js"]
