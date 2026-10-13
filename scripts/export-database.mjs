#!/usr/bin/env node
// =====================================================================
// Sinte's Hub: full backup from your computer
//
//   npm run backup                 → database + all photos
//   npm run backup -- --no-photos  → database only (faster)
//
// Saves a .zip into the "backups" folder of this project.
// Needs DATABASE_URL (and NEXT_PUBLIC_SUPABASE_URL for photos) in .env.local.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { backupFileName, buildBackupZip } from '../src/lib/backup-format.mjs';
import { ROOT, connect, describeDatabase, photoPaths, publicPhotoUrl, readAllTables } from './lib/common.mjs';

const args = process.argv.slice(2);
const withPhotos = !args.includes('--no-photos');
const outArg = args.find((a) => a.startsWith('--out='));
const outDir = outArg ? path.resolve(outArg.slice(6)) : path.join(ROOT, 'backups');

console.log(`\nBacking up ${describeDatabase(process.env.DATABASE_URL)}…`);
const client = await connect();
let tables;
try {
  tables = await readAllTables(client);
} finally {
  await client.end();
}

const { zip, meta } = buildBackupZip(JSZip, tables, { source: 'npm run backup', photos: withPhotos });
for (const [t, n] of Object.entries(meta.counts)) console.log(`  ${t.padEnd(18)} ${n} rows`);

if (withPhotos) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('\n! NEXT_PUBLIC_SUPABASE_URL is not set, so photos were skipped.');
  } else {
    const paths = photoPaths(tables);
    console.log(`\nDownloading ${paths.length} photos…`);
    let ok = 0;
    const missing = [];
    for (const p of paths) {
      try {
        const res = await fetch(publicPhotoUrl(p));
        if (!res.ok) throw new Error(String(res.status));
        zip.file(`photos/${p}`, new Uint8Array(await res.arrayBuffer()));
        ok++;
      } catch {
        missing.push(p);
      }
    }
    console.log(`  ${ok} photos saved${missing.length ? `, ${missing.length} could not be downloaded:` : ''}`);
    missing.slice(0, 20).forEach((m) => console.log(`    - ${m}`));
  }
}

fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, backupFileName());
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
fs.writeFileSync(file, buf, { mode: 0o600 });
console.log(`\n✓ Backup saved: ${file} (${Math.round(buf.length / 1024)} KB)`);
console.log('  It contains customer details. Copy it somewhere private and safe.\n');
