FROM ubuntu:22.04
WORKDIR /usr/src/app

RUN apt update && apt install curl -y
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

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
