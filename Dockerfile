FROM node:20-alpine
EXPOSE 8001

WORKDIR /home/node/app

RUN apk add --no-cache tini
RUN npm -g install npm@10

ADD package.json .
ADD package-lock.json .

RUN npm ci --omit=dev

ADD bin bin
ADD lib lib
ADD public public
ADD views views
ADD README.md README.md

ENTRYPOINT ["tini"]
CMD ["node", "bin/dynamodb-admin.js"]
