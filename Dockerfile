# GymBro (Express + Vite build). Same Node major as production (/opt/node22 on the VM):
# what passes the smoke test here runs the same there.
ARG NODE_IMAGE=node:22-bookworm-slim

# 0. deps: full node_modules (with dev deps), shared by development and build.
#    Installed as `node` so Vite can write node_modules/.vite in dev without running as root.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN chown node:node /app && mkdir -p /data && chown node:node /data
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# 1a. development: Express + Vite middlewareMode with HMR. Source comes in through bind mounts
#     (see docker-compose.yml), so nothing is copied: rebuild this stage when package-lock changes.
FROM deps AS development
ENV NODE_ENV=development HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
EXPOSE 3000 24678
CMD ["sh", "scripts/arranque_dev.sh"]

# 1b. build: frontend (vite) + bundled server. server.cjs is moved out of dist/ and the maps
#     are deleted so express.static(dist) never publishes the server code.
FROM deps AS build
COPY --chown=node:node . .
RUN npm run build && mv dist/server.cjs server.cjs && rm -f dist/*.map

# 2. production: production dependencies + build output only. NODE_ENV=production is required:
#    without it server.ts starts Vite in dev mode instead of serving dist/.
#    Last stage on purpose: a plain `docker build .` still yields this image; scripts/gymctl.py
#    builds it on the VM and runs one container per gym from it.
#    node:sqlite (the database) still prints an ExperimentalWarning on Node 22: silenced.
FROM ${NODE_IMAGE} AS production
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data     NODE_OPTIONS=--disable-warning=ExperimentalWarning
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server.cjs ./server.cjs
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
# Healthcheck lives in docker-compose.yml (x-gymbro-healthcheck).
CMD ["node", "server.cjs"]
