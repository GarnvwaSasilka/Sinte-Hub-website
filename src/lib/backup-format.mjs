// Shared by the dashboard "Download backup" button and the command-line
// backup/restore scripts, so all three use exactly the same file format.
//
// A backup is a .zip file containing:
//   backup.json      every row of every store table (used by the restore script)
//   csv/<table>.csv  the same data as spreadsheets you can open in Excel/Sheets
//   photos/...       (command-line backup only) every product photo
//   README.txt       what the files are

export const BACKUP_FORMAT = 'sintes-hub-backup';
export const BACKUP_VERSION = 1;

/** Tables in the order they must be restored (parents before children). */
export const BACKUP_TABLES = [
  { name: 'categories', orderBy: 'created_at' },
  { name: 'products', orderBy: 'created_at' },
  { name: 'product_variants', orderBy: 'created_at' },
  { name: 'product_images', orderBy: 'created_at' },
  { name: 'store_settings', orderBy: 'id' },
  { name: 'orders', orderBy: 'created_at' },
  { name: 'order_items', orderBy: 'created_at' },
  { name: 'payments', orderBy: 'created_at' },
  { name: 'stock_movements', orderBy: 'id' },
];

function cell(value) {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Stop spreadsheet apps from running anything that looks like a formula.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

export function readmeText(meta) {
  return [
    "SINTE'S HUB BACKUP",
    '==================',
    `Created: ${meta.created_at}`,
    `Made by: ${meta.source}`,
    '',
    'backup.json  - the complete backup. Keep it safe; the restore script reads this file.',
    'csv/         - the same data as spreadsheets, for reading in Excel or Google Sheets.',
    meta.photos ? 'photos/      - every product photo.' : 'Photos are NOT in this file. Run "npm run backup" on your computer to back up photos too.',
    '',
    'IMPORTANT: this file contains customer names, phone numbers and addresses.',
    'Store it somewhere private (e.g. a password-protected cloud folder). Never post it publicly.',
    '',
    'To restore, follow docs/BACKUP-AND-RESTORE.md in the project.',
    '',
    'Row counts:',
    ...Object.entries(meta.counts).map(([t, n]) => `  ${t}: ${n}`),
    '',
  ].join('\n');
}

/**
 * @param {import('jszip')} JSZip
 * @param {Record<string, object[]>} tables
 * @param {{ source: string, photos?: boolean }} info
 */
export function buildBackupZip(JSZip, tables, info) {
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t.name, (tables[t.name] ?? []).length]));
  const meta = { created_at: new Date().toISOString(), source: info.source, photos: !!info.photos, counts };
  const zip = new JSZip();
  zip.file(
    'backup.json',
    JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, ...meta, tables }, null, 1),
  );
  for (const t of BACKUP_TABLES) zip.file(`csv/${t.name}.csv`, toCsv(tables[t.name] ?? []));
  zip.file('README.txt', readmeText(meta));
  return { zip, meta };
}

/** Throws a plain-English error if the file is not a usable backup. */
export function validateBackup(data) {
  if (!data || typeof data !== 'object') throw new Error('This file is not a Sinte\'s Hub backup.');
  if (data.format !== BACKUP_FORMAT) throw new Error('This file is not a Sinte\'s Hub backup (wrong format).');
  if (data.version > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the store. Update the code first.');
  if (!data.tables || typeof data.tables !== 'object') throw new Error('The backup has no tables in it.');
  for (const t of BACKUP_TABLES) {
    if (data.tables[t.name] !== undefined && !Array.isArray(data.tables[t.name])) {
      throw new Error(`The "${t.name}" part of the backup is damaged.`);
    }
  }
  return data;
}

export function backupFileName(prefix = 'sintes-hub-backup') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
}
