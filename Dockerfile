FROM node:20-alpine AS build

RUN npm -g install npm@10

COPY bin bin/
COPY lib lib/
COPY package-lock.json .
COPY package.json .
COPY rollup.config.ts .
COPY tsconfig.json .

RUN npm ci

FROM node:20-alpine
EXPOSE 8001

WORKDIR /home/node/app

RUN apk add --no-cache tini
RUN npm -g install npm@10

COPY --from=build dist dist/
COPY public public/
COPY views views/
COPY README.md README.md
COPY package-lock.json .
COPY package.json .

RUN npm ci --omit=dev --ignore-scripts

ENTRYPOINT ["tini"]
CMD ["node", "dist/dynamodb-admin.js"]
