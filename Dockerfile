FROM golang:1.27-alpine AS qrdigo-build
WORKDIR /src/be
COPY be/go.mod be/go.sum ./
RUN go mod download
COPY be/ .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/qrdigo ./cmd/server \
    && cp migrations/full_schema.sql /out/schema.sql

FROM node:22-alpine AS web-build
WORKDIR /src/fe
RUN corepack enable
COPY fe/package.json fe/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY fe/ .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache su-exec postgresql-client \
    && mkdir -p /app/uploads/products && chown -R nginx:nginx /app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
COPY --from=qrdigo-build /out/qrdigo /usr/local/bin/qrdigo
COPY --from=qrdigo-build /out/schema.sql /app/schema.sql
COPY --from=web-build /src/fe/dist /usr/share/nginx/html
RUN chmod +x /usr/local/bin/qrdigo /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]