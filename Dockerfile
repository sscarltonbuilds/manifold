FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS dev
CMD ["pnpm", "dev"]

FROM base AS builder
COPY . .
ENV BUILD_STANDALONE=1
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

FROM node:20-alpine AS production
RUN corepack enable pnpm
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
