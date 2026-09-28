# syntax=docker/dockerfile:1

# ---- Stage 1: install production dependencies only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci installs exactly what the lockfile says (reproducible builds).
RUN npm ci --omit=dev

# ---- Stage 2: small runtime image ----
FROM node:22-alpine
# CI passes the git commit SHA so the running app can report its version.
ARG APP_VERSION=dev
ENV NODE_ENV=production PORT=8080 APP_VERSION=${APP_VERSION}
# The app never runs npm/yarn at runtime; removing them shrinks the attack surface
# and removes their bundled dependencies from vulnerability scans.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
# Never run as root inside the container. 1000 is the built-in "node" user; a numeric UID
# lets Kubernetes' runAsNonRoot check verify it (a user *name* can't be verified).
USER 1000:1000
EXPOSE 8080
# Start node directly (not "npm start") so SIGTERM reaches our shutdown handler.
CMD ["node", "src/server.js"]
