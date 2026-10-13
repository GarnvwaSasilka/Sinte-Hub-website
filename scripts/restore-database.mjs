#!/usr/bin/env node
// =====================================================================
// Sinte's Hub: restore from a backup file
//
//   npm run restore -- <backup.zip> --dry-run    show what would happen, change nothing
//   npm run restore -- <backup.zip>              ADD anything missing (keeps existing data)
//   npm run restore -- <backup.zip> --replace    make the database EXACTLY match the backup
//   add --photos to also upload the photos stored in the backup
//
// Before changing anything, the script saves a safety backup of what is in
// the database right now, and everything happens in one step: if anything
// goes wrong, nothing is changed.
// Full guide: docs/BACKUP-AND-RESTORE.md
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { BACKUP_TABLES, backupFileName, buildBackupZip, validateBackup } from '../src/lib/backup-format.mjs';
import { ROOT, ask, connect, describeDatabase, fail, readAllTables } from './lib/common.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const replace = args.includes('--replace');
const dryRun = args.includes('--dry-run');
const withPhotos = args.includes('--photos');
const assumeYes = args.includes('--yes');

if (!file) fail('Tell me which backup file to restore, e.g.  npm run restore -- backups/sintes-hub-backup-2026-01-31-1800.zip --dry-run');
if (!fs.existsSync(file)) fail(`File not found: ${file}`);

// ---------- 1. Read the backup ----------
let data;
let zip = null;
try {
  if (file.toLowerCase().endsWith('.zip')) {
    zip = await JSZip.loadAsync(fs.readFileSync(file));
    const json = zip.file('backup.json');
    if (!json) fail('This zip has no backup.json inside. Is it a Sinte\'s Hub backup?');
    data = JSON.parse(await json.async('string'));
  } else {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  validateBackup(data);
} catch (e) {
  fail(`Could not read the backup: ${e.message}`);
}

console.log(`\nBackup file:  ${path.basename(file)}`);
console.log(`Made on:      ${data.created_at} (${data.source})`);
console.log(`Restoring to: ${describeDatabase(process.env.DATABASE_URL)}`);
console.log(`Mode:         ${replace ? 'REPLACE (database will match the backup exactly)' : 'ADD MISSING (existing data is kept)'}${dryRun ? ' — DRY RUN, nothing will change' : ''}\n`);

const client = await connect();

// Only columns that exist in this database are restored, so a backup made by
// an older version of the store still loads.
async function columnsOf(table) {
  const { rows } = await client.query(
    `select column_name, is_identity, identity_generation from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return rows;
}

try {
  const current = await readAllTables(client);

  console.log('                     in backup   in database now');
  for (const t of BACKUP_TABLES) {
    console.log(`  ${t.name.padEnd(18)} ${String((data.tables[t.name] ?? []).length).padStart(9)}   ${String(current[t.name].length).padStart(15)}`);
  }
  console.log('');

  if (dryRun) {
    if (replace) {
      console.log('With --replace, everything in the database would be deleted and replaced by the backup.');
    } else {
      for (const t of BACKUP_TABLES) {
        const have = new Set(current[t.name].map((r) => String(r.id)));
        const add = (data.tables[t.name] ?? []).filter((r) => !have.has(String(r.id))).length;
        console.log(`  ${t.name.padEnd(18)} ${add} rows would be added`);
      }
    }
    console.log('\nDry run finished. Nothing was changed.\n');
    process.exit(0);
  }

  // ---------- 2. Confirm ----------
  if (!assumeYes) {
    const word = replace ? 'REPLACE' : 'yes';
    const answer = await ask(
      replace
        ? 'This DELETES all products, orders and settings in the database above and loads the backup instead.\nType REPLACE to continue: '
        : 'This adds rows from the backup that are missing in the database. Type yes to continue: ',
    );
    if (answer !== word) fail('Cancelled. Nothing was changed.');
  }

  // ---------- 3. Safety backup of what is there now ----------
  const safetyDir = path.join(ROOT, 'backups');
  fs.mkdirSync(safetyDir, { recursive: true });
  const { zip: safety } = buildBackupZip(JSZip, current, { source: 'automatic safety backup before restore' });
  const safetyFile = path.join(safetyDir, backupFileName('before-restore'));
  fs.writeFileSync(safetyFile, await safety.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), { mode: 0o600 });
  console.log(`Safety backup of the current data saved: ${safetyFile}`);

  // ---------- 4. Restore, all in one transaction ----------
  await client.query('begin');
  await client.query("select set_config('app.restoring', 'on', true)");

  if (replace) {
    for (const t of [...BACKUP_TABLES].reverse()) {
      if (t.name === 'store_settings') continue;
      await client.query(`delete from public.${t.name}`);
    }
  }

  const results = {};
  for (const t of BACKUP_TABLES) {
    const rows = data.tables[t.name] ?? [];
    if (!rows.length) {
      results[t.name] = 0;
      continue;
    }
    const cols = await columnsOf(t.name);
    const names = cols.map((c) => c.column_name).filter((c) => rows.some((r) => c in r));
    const quoted = names.map((c) => `"${c}"`).join(', ');
    const overriding = cols.some((c) => c.identity_generation === 'ALWAYS' && names.includes(c.column_name)) ? 'overriding system value' : '';
    let conflict = 'on conflict do nothing';
    if (t.name === 'store_settings' && replace) {
      conflict = `on conflict (id) do update set ${names.filter((c) => c !== 'id').map((c) => `"${c}" = excluded."${c}"`).join(', ')}`;
    }
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const res = await client.query(
        `insert into public.${t.name} (${quoted}) ${overriding}
         select ${quoted} from json_populate_recordset(null::public.${t.name}, $1::json)
         ${conflict}`,
        [JSON.stringify(chunk)],
      );
      inserted += res.rowCount ?? 0;
    }
    results[t.name] = inserted;
  }

  // Keep the stock-history numbering correct after loading old rows.
  await client.query(
    `select setval(pg_get_serial_sequence('public.stock_movements', 'id'),
                   greatest((select coalesce(max(id), 0) from public.stock_movements), 1))`,
  );

  await client.query('commit');

  console.log('\nRestored:');
  for (const t of BACKUP_TABLES) {
    const total = (data.tables[t.name] ?? []).length;
    const note = results[t.name] < total ? `  (${total - results[t.name]} were already there and were left as they are)` : '';
    console.log(`  ${t.name.padEnd(18)} ${results[t.name]} of ${total}${note}`);
  }

  const after = await readAllTables(client);
  if (replace) {
    const mismatched = BACKUP_TABLES.filter((t) => after[t.name].length !== (data.tables[t.name] ?? []).length);
    if (mismatched.length) {
      console.warn(`\n! Row counts differ for: ${mismatched.map((t) => t.name).join(', ')}. Please check them in the dashboard.`);
    } else {
      console.log('\n✓ Check passed: every table now has exactly the number of rows in the backup.');
    }
  }
} catch (e) {
  await client.query('rollback').catch(() => {});
  const hint =
    !replace && e.code === '23503'
      ? '\n  This usually means the database already has products with the same names or codes as the backup,\n' +
        '  but they were created separately. Restore into a new, empty Supabase project with --replace instead\n' +
        '  (see docs/BACKUP-AND-RESTORE.md, "Restore after a disaster").'
      : '';
  fail(`Restore failed and NOTHING was changed: ${e.message}${hint}`);
} finally {
  await client.end();
}

// ---------- 5. Photos (optional) ----------
if (withPhotos) {
  const files = zip ? Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith('photos/')) : [];
  if (!files.length) {
    console.log('\nThis backup has no photos inside (dashboard backups never do). Skipping photos.');
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('\n! To restore photos, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then run again with --photos.');
  } else {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    console.log(`\nUploading ${files.length} photos…`);
    let ok = 0;
    for (const f of files) {
      const p = f.name.slice('photos/'.length);
      const ext = p.split('.').pop()?.toLowerCase();
      const type = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
      const { error } = await supabase.storage
        .from('product-images')
        .upload(p, await f.async('uint8array'), { contentType: type, upsert: true, cacheControl: '31536000' });
      if (error) console.warn(`  - ${p}: ${error.message}`);
      else ok++;
    }
    console.log(`  ${ok} of ${files.length} photos uploaded.`);
  }
}

console.log('\n✓ Restore finished. Open the dashboard and check a few products and orders.\n');
