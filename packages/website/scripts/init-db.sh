#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE quickdapp_website_dev;
    CREATE DATABASE quickdapp_website_test;
EOSQL
