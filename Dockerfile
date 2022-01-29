FROM node:12-alpine

RUN npm -g install npm@7

ADD . .

RUN npm install

EXPOSE 8001
CMD ["node", "bin/dynamodb-admin.js"]
