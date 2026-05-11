FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm config set cache /tmp/npm-cache --global && npm cache clean --force
RUN npm install --omit=dev --no-cache

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "src/server.js"]
