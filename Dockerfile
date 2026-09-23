FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run content:export

FROM build AS api
ENV NODE_ENV=production CONTENT_DIR=/app/content MEDIA_DIR=/app/media
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:stable-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/public/setup /usr/share/nginx/html/setup
EXPOSE 80
