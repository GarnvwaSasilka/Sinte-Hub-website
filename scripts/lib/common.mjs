// Helpers shared by the backup and restore scripts.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { BACKUP_TABLES } from '../../src/lib/backup-format.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Read settings from .env.local (or .env) in the project folder.
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

export function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

export function describeDatabase(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ':' + u.port : ''} (user ${decodeURIComponent(u.username)})`;
  } catch {
    return 'unknown database';
  }
}

export async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('[YOUR-PASSWORD]')) {
    fail('DATABASE_URL is not set. Copy .env.example to .env.local and paste your Supabase connection string (see docs/BACKUP-AND-RESTORE.md).');
  }
  const host = new URL(url).hostname;
  const local = ['localhost', '127.0.0.1', '::1', ''].includes(host) || host.startsWith('/');
  // Supabase requires an encrypted connection. Set DATABASE_SSL_CA to the
  // path of Supabase's certificate file to also verify the server.
  const ssl = local
    ? false
    : process.env.DATABASE_SSL_CA
      ? { ca: fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') }
      : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ''), ssl });
  try {
    await client.connect();
  } catch (e) {
    fail(
      `Could not connect to the database: ${e.message}\n` +
        '  • Check DATABASE_URL and your database password.\n' +
        '  • If your Supabase project is PAUSED, restore it first (docs/SETUP.md, "If your project is paused").',
    );
  }
  return client;
}

/** Reads every store table. Returns { tableName: rows[] } with JSON-friendly values. */
export async function readAllTables(client) {
  const tables = {};
  for (const t of BACKUP_TABLES) {
    const { rows } = await client.query(
      `select coalesce(json_agg(x order by x.${t.orderBy}, x.id), '[]'::json) as rows from public.${t.name} x`,
    );
    tables[t.name] = rows[0].rows;
  }
  return tables;
}

export async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

export function publicPhotoUrl(p) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/product-images/${p.split('/').map(encodeURIComponent).join('/')}`;
}

/** Every photo path the store uses. */
export function photoPaths(tables) {
  const set = new Set();
  for (const i of tables.product_images ?? []) {
    if (i.path) set.add(i.path);
    if (i.thumb_path) set.add(i.thumb_path);
  }
  for (const c of tables.categories ?? []) if (c.image_path) set.add(c.image_path);
  for (const s of tables.store_settings ?? []) if (s.hero_image_path) set.add(s.hero_image_path);
  return [...set].filter((p) => !p.includes('..'));
}
