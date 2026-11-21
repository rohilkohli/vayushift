# syntax=docker/dockerfile:1.7
# Multi-stage build: dependencies, then the Next.js build, then a minimal runtime that carries only the
# self-contained server Next produces (output: "standalone"). The final image has no dev dependencies,
# no source and no build tools, and runs as an unprivileged user.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:26-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 8080
# Cloud Run supplies PORT and runs its own startup/liveness probes (see docs/ARCHITECTURE.md).
CMD ["node", "server.js"]
