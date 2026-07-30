# syntax=docker/dockerfile:1
FROM node:24-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.26.1

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:24-slim AS runner

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
