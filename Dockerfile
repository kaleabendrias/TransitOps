# ── Install dependencies (shared, cached layer) ─────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build frontend from source ──────────────────────────────────
FROM deps AS build
COPY . .
RUN npx vite build

# ── Production (nginx, static assets only, ~10 MB) ──────────────
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 4173

# ── Dev server (hot-reload) ──────────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Test runner ──────────────────────────────────────────────────
FROM deps AS test
COPY . .
CMD ["npm", "test"]
