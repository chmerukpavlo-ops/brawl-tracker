# ─────────────────────────────────────────────────────────────────
# Multi-stage build for the Express proxy server.
#
# Stage 1 (deps): install everything (incl. dev) so we can run the
#                 vite + esbuild build pipeline.
# Stage 2 (build): produce dist/ with both the SPA and dist/server.cjs.
# Stage 3 (run):   slim Alpine image with prod deps + dist/ only.
# ─────────────────────────────────────────────────────────────────

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `--ignore-scripts` skips husky/postinstall hooks that don't make
# sense inside the build sandbox.
RUN npm ci --ignore-scripts

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Vite + esbuild emit `dist/` (frontend) and `dist/server.cjs` (backend).
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001
# Only ship runtime deps — keeps the image ~80 MB instead of ~600.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
# Drop root before exec.
USER node
EXPOSE 3001
# Healthcheck hits the in-app endpoint — same one the smoke test uses.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health > /dev/null || exit 1
CMD ["node", "dist/server.cjs"]
