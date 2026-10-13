import { requireAdmin } from '@/lib/auth';

export default async function BackupPage() {
  await requireAdmin();
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>Backup</h1>
      <p>
        The free Supabase plan does not make daily backups for you. Download a backup regularly: <strong>at least once a week</strong>,
        and always before big changes.
      </p>
      <section className="card stack">
        <h2 style={{ marginTop: 0 }}>Download a backup now</h2>
        <p className="small">
          You get one .zip file with all your products, sizes/colours and stock, categories, photo list, orders, order items, payments,
          store settings and stock history. Inside it there is a <code>backup.json</code> file (for restoring) and spreadsheet
          (CSV) copies you can open in Excel or Google Sheets.
        </p>
        <a className="btn btn-gold" href="/admin/backup/download" download>
          Download backup (.zip)
        </a>
        <p className="small muted">
          Photos themselves are not in this file (to keep it small). To back up photos as well, run <code>npm run backup</code> on
          your computer. See docs/BACKUP-AND-RESTORE.md.
        </p>
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Keep it safe</h2>
        <ul>
          <li>The file contains customer names, phone numbers and addresses. Treat it like a bank statement.</li>
          <li>Save it in a private place, such as a Google Drive or OneDrive folder only you can open.</li>
          <li>Keep the last few backups, not just the newest one.</li>
          <li>Never email it to anyone or post it in a group chat.</li>
        </ul>
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Restoring</h2>
        <p className="small">
          Restoring is done from your computer with one command, so nobody can wipe the store from a web page. The step-by-step guide
          is in docs/BACKUP-AND-RESTORE.md.
        </p>
      </section>
    </div>
  );
}
