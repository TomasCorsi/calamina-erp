create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgtap with schema extensions;

create schema if not exists iam;
create schema if not exists audit;
create schema if not exists private;

revoke create on schema public from public, anon, authenticated;

revoke all on schema iam from public, anon, authenticated, service_role;
revoke all on schema audit from public, anon, authenticated, service_role;
revoke all on schema private from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema iam
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema iam
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema iam
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema audit
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema audit
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema audit
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;
