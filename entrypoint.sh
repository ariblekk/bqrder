#!/bin/sh
set -e

mkdir -p /app/uploads/products
chown -R nginx:nginx /app

export PGPASSWORD="$DB_PASSWORD"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /app/schema.sql

su-exec nginx:nginx /usr/local/bin/bqrder &
nginx -g 'daemon off;'