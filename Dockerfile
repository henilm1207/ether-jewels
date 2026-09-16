# Multi-stage build: compile the Vite storefront, install server deps against
# the same base image as the runtime (sharp ships platform-specific native
# binaries — building on a different libc than the runtime stage breaks it),
# then assemble a minimal runtime image. server.js already serves client/dist
# statically in NODE_ENV=production (single-domain prod path), so one
# container serves both the API and the storefront.

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client/dist ./client/dist

# Default UPLOADS_DIR (server/lib/localImages.js) — override via env to point
# at a mounted volume; created here so the non-root user below can write it
# even when no volume is mounted. /app/uploads is also pre-created and owned
# by app:app so a *named* volume (docker-compose.yml, local dev) mounted
# there inherits app ownership on first init instead of root's — a bind
# mount (docker-compose.prod.yml) always takes the host path's own ownership
# regardless, so this is a no-op for production.
RUN mkdir -p /app/server/public/uploads /app/uploads \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||5001,path:'/api/health'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/server.js"]
