FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm config set cache /tmp/npm-cache --global && npm cache clean --force
RUN npm install --no-cache
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update -qq && apt-get install -y -qq ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-builder /app/node_modules ./backend/node_modules
COPY --from=backend-builder /app/dist ./backend/dist
COPY --from=backend-builder /app/prisma ./backend/prisma
COPY --from=backend-builder /app/package.json ./backend/
COPY --from=frontend-builder /app/.next/standalone ./frontend
COPY --from=frontend-builder /app/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/public ./frontend/public
COPY start.js ./
RUN mkdir -p uploads
EXPOSE 8080
CMD ["node", "start.js"]
