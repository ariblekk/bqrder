FROM golang:1.27-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/bqrder ./cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates \
    && addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/uploads/products && chown -R app:app /app

WORKDIR /app
USER app

COPY --from=builder /out/bqrder .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/api/v1/health || exit 1

CMD ["./bqrder"]