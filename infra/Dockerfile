FROM node:24.13.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS api-build
COPY apps/api apps/api
RUN npm run build --workspace @wokim/api

FROM node:24.13.0-alpine AS api
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
COPY --from=dependencies /app/node_modules node_modules
COPY --from=api-build /app/apps/api/dist apps/api/dist
COPY apps/api/package.json apps/api/package.json
USER node
CMD ["node", "apps/api/dist/main.js"]

FROM dependencies AS web-build
COPY apps/web apps/web
RUN npm run build --workspace @wokim/web

FROM nginx:1.28-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist/web/browser /usr/share/nginx/html
