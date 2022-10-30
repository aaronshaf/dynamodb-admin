FROM node:16-alpine
EXPOSE 8001

WORKDIR /home/node/app

RUN npm -g install npm@8

ADD package.json .
ADD package-lock.json .

RUN npm ci --production

ADD bin bin
ADD lib lib
ADD public public
ADD views views
ADD README.md README.md

CMD ["node", "bin/dynamodb-admin.js"]
