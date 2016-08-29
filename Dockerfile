FROM mhart/alpine-node:6.4.0

ADD . .

RUN npm install

EXPOSE 8001
CMD ["node", "index.js"]
