import JSZip from 'jszip';
import { createAuthClient } from '@/lib/supabase/server';
import { BACKUP_TABLES, backupFileName, buildBackupZip } from '@/lib/backup-format.mjs';

export const dynamic = 'force-dynamic';

// GET /admin/backup/download: builds a .zip of every store table.
// It reads with the owner's own login, so the database rules make sure only
// the admin can get any data out.
export async function GET() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Please log in.', { status: 401 });
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return new Response('Only the store admin can download backups.', { status: 403 });

  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const t of BACKUP_TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(t.name)
        .select('*')
        .order(t.orderBy, { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) {
        console.error('backup', t.name, error.message);
        return new Response(`Backup failed while reading ${t.name}. Nothing was downloaded. Please try again.`, { status: 500 });
      }
      rows.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    tables[t.name] = rows;
  }

  const { zip } = buildBackupZip(JSZip, tables, { source: `Dashboard button (${user.email})` });
  const body = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return new Response(body as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${backupFileName()}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
