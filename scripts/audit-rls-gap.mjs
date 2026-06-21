#!/usr/bin/env node
/**
 * RLS audit gap finder.
 *
 * Compares every SQLAlchemy __tablename__ in backend/app/models/*.py against
 * every `create table` statement in supabase/migrations/*.sql. Tables
 * present on the backend but missing from migrations are unlikely to have
 * RLS enabled and are candidates for the next sweep migration.
 *
 * Exit codes:
 *   0 — every backend table has a matching Supabase migration
 *   1 — gaps exist; printed to stderr and listed
 *
 * Used in CI / pre-merge audits. Not a security guarantee on its own — a
 * table can exist in migrations without RLS — but it's a fast first signal.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = join(repoRoot, 'backend/app/models');
const migrationsDir = join(repoRoot, 'supabase/migrations');

function collectSqlAlchemyTables() {
    const tables = new Set();
    for (const file of readdirSync(modelsDir)) {
        if (!file.endsWith('.py')) continue;
        const text = readFileSync(join(modelsDir, file), 'utf8');
        for (const match of text.matchAll(/__tablename__\s*=\s*['"]([a-z_][a-z_0-9]*)['"]/g)) {
            tables.add(match[1]);
        }
    }
    return tables;
}

function collectSupabaseTables() {
    const tables = new Set();
    for (const file of readdirSync(migrationsDir)) {
        if (!file.endsWith('.sql')) continue;
        const text = readFileSync(join(migrationsDir, file), 'utf8');
        for (const match of text.matchAll(
            /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["`]?([a-z_][a-z_0-9]*)["`]?/gi,
        )) {
            tables.add(match[1].toLowerCase());
        }
    }
    return tables;
}

const sql = collectSqlAlchemyTables();
const sb = collectSupabaseTables();

const gap = [...sql].filter((t) => !sb.has(t)).sort();

if (gap.length === 0) {
    console.log(`OK — all ${sql.size} backend tables covered by Supabase migrations.`);
    process.exit(0);
}

console.error(
    `RLS audit gap: ${gap.length} SQLAlchemy table(s) have no Supabase migration:\n`,
);
for (const t of gap) console.error(`  - ${t}`);
console.error(
    `\nThese tables likely have RLS disabled. Add them to a sweep migration ` +
    `(see supabase/migrations/20260620170000_enable_rls_audit_sweep.sql for the pattern).`,
);
process.exit(1);
