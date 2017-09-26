FROM mhart/alpine-node:8.5.0

ADD . .

RUN npm install

EXPOSE 8001
CMD ["node", "index.js"]
