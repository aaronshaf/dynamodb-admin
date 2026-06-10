FROM node:24-alpine AS builder

WORKDIR /home/node/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY bin bin/
COPY lib lib/
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY rollup.config.ts .
COPY tsconfig.json .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:24-alpine
EXPOSE 8001

WORKDIR /home/node/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apk add --no-cache tini

COPY --from=builder /home/node/app/dist dist/
COPY public public/
COPY views views/
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY README.md README.md

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

ENTRYPOINT ["tini"]
CMD ["node", "dist/dynamodb-admin.js"]
