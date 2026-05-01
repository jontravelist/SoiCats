-- Soi Cats: extensions
-- PostGIS for geo queries, pgcrypto for gen_random_uuid, vector for future ML hook.

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists vector;
