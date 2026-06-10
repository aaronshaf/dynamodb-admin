FROM node:24-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY bin bin/
COPY lib lib/
COPY pnpm-lock.yaml .
COPY package.json .
COPY rollup.config.ts .
COPY tsconfig.json .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-alpine
EXPOSE 8001

WORKDIR /home/node/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apk add --no-cache tini

COPY --from=build dist dist/
COPY public public/
COPY views views/
COPY README.md README.md
COPY pnpm-lock.yaml .
COPY package.json .

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

ENTRYPOINT ["tini"]
CMD ["node", "dist/dynamodb-admin.js"]
