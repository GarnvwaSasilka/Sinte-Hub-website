# Backups and restoring, in plain language

The free Supabase plan **does not make backups for you.** If something goes wrong (a mistake, a lost account, a project that stayed paused too long), your backups are the only way to get your products and orders back. This guide shows how to make them, keep them safe, and use them.

## The two ways to back up

| | Dashboard button | `npm run backup` on your computer |
|---|---|---|
| How | Dashboard → **Backup** → **Download backup** | One command in a terminal |
| Includes | Products, sizes/colours and stock, categories, photo list, orders, order items, payments, settings, stock history | Everything the button saves, **plus every product photo** |
| Needs | Just your dashboard login | A one-time computer setup (below) |
| How often | **Every week**, and before big changes | **Once a month**, and before restoring anything |

Both make one `.zip` file with the same layout:

- `backup.json`: the complete backup. The restore script reads this.
- `csv/…`: the same data as spreadsheets, so you can open your orders in Excel or Google Sheets.
- `photos/…`: product photos (computer backup only).
- `README.txt`: what is inside and row counts.

### Keeping backups safe

- The file contains customer names, phone numbers and addresses. Treat it like a bank statement.
- Save it in a private cloud folder only you can open (Google Drive, OneDrive, iCloud) **and** on your computer.
- Keep the last 4 to 8 backups, not only the newest one. If a mistake goes unnoticed for a week, you need an older copy.
- Never email backups, put them in a group chat, or upload them to GitHub. (The project is set up so the `backups` folder is never sent to GitHub.)

---

## One-time computer setup

You need this for `npm run backup` and for restoring. Do it once.

1. **Install Node.js:** go to <https://nodejs.org> and install the version marked **LTS**.
2. **Get the code:** on your GitHub repository page, click **Code → Download ZIP**, and unzip it somewhere easy, such as your Documents folder. (If you use Git, `git clone` works too.)
3. **Open a terminal in that folder:**
   - Windows: open the folder, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder → **New Terminal at Folder**.
4. Type this and press Enter (it downloads the helper tools, once):

   ```
   npm install
   ```

5. **Create your settings file.** In the folder, make a copy of `.env.example` and name the copy `.env.local`. Open it in Notepad (Windows) or TextEdit (Mac) and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`: your Project URL.
   - `DATABASE_URL`: in Supabase, click **Connect** at the top of your project, choose **Session pooler**, and copy the connection string. Replace `[YOUR-PASSWORD]` with your database password from setup Step 2.
   - `SUPABASE_SERVICE_ROLE_KEY`: leave empty for now. Only fill it in when you need to restore photos, and empty it again afterwards.

`.env.local` stays on your computer only. It is never uploaded to GitHub.

## Making a full backup from your computer

In the terminal, in the project folder:

```
npm run backup
```

You will see how many rows of each kind were saved and how many photos were downloaded. The file is saved in the `backups` folder, named with the date, for example `backups/sintes-hub-backup-2026-11-02-1800.zip`. Copy it to your private cloud folder.

Faster, without photos: `npm run backup -- --no-photos`

If it says it cannot connect, check the password in `DATABASE_URL`, and check that your Supabase project is not paused.

---

## Restoring

Restoring always runs from your computer, never from the website, so nobody can wipe your shop from a web page.

The restore script protects you in three ways:

1. **`--dry-run`** shows exactly what would change without changing anything. Always do this first.
2. **Before changing anything, it saves a safety backup** of what is in the database right now (in `backups/before-restore-….zip`). If you restore the wrong file, you can restore that safety backup to undo it.
3. **All or nothing:** if anything goes wrong halfway, nothing is changed at all.

It also tells you which database it is about to change. Read that line before you type yes.

### Situation A: "I deleted some products or orders by mistake"

Use **add-missing** mode. It puts back anything that is in the backup but missing now, and leaves everything else exactly as it is (new orders since the backup are kept).

```
npm run restore -- backups/sintes-hub-backup-2026-11-02-1800.zip --dry-run
npm run restore -- backups/sintes-hub-backup-2026-11-02-1800.zip
```

The first command shows "N rows would be added" for each table. The second asks you to type `yes`, then does it.

Note: stock numbers are not changed in this mode. If you restored deleted orders that had been cancelled or completed, check the stock of those products in the dashboard.

### Situation B: Restore after a disaster (the project is lost or broken)

Use this when the Supabase project is gone, cannot be restored after a long pause, or the data is badly wrong.

1. **Create a new Supabase project** and repeat setup Steps 2 to 5 in `docs/SETUP.md` (create the project, run the two setup files, lock sign-ups, create your login and make yourself admin). Do **not** run `seed.sql`.
2. In `.env.local`, change `DATABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` to the **new** project. To restore photos too, also fill in `SUPABASE_SERVICE_ROLE_KEY` from the new project (Project Settings → API Keys → service_role / secret).
3. Check, then restore, using your newest backup that **has photos** (one made with `npm run backup`):

   ```
   npm run restore -- backups/sintes-hub-backup-2026-11-02-1800.zip --replace --dry-run
   npm run restore -- backups/sintes-hub-backup-2026-11-02-1800.zip --replace --photos
   ```

   It asks you to type `REPLACE`. At the end it checks that every table has exactly the number of rows in the backup and prints "✓ Check passed".
4. If your newest backup is a **dashboard** backup (no photos), restore that one for the latest orders, then restore photos from your newest computer backup: run the restore again on the computer backup **without** `--replace` and **with** `--photos`. It adds only what is missing and uploads the photos.
5. **Point the website at the new project:** in Netlify, change `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the new project's values, then **Deploys → Trigger deploy**.
6. In the new Supabase project, set the Site URL and Redirect URL again (setup Step 8).
7. **Empty `SUPABASE_SERVICE_ROLE_KEY`** in `.env.local` again.
8. Open the dashboard and check a few products, photos and recent orders.

### What is not in a backup

- **Your login account.** You create it again in Step 5 of the setup (one minute).
- **Settings outside the database**, like Netlify environment variables and Supabase sign-up settings. They are all written down in `docs/SETUP.md`.

---

## Practice run (do this before launch)

A backup you have never restored is only a hope. This 15-minute practice proves your backups work, using the demo data, before any real customer data exists.

You need: the computer setup above, and a Supabase project with the demo data from `seed.sql` (setup Step 3).

1. **Make a backup:**

   ```
   npm run backup
   ```

   Note the counts it prints (for example: 9 products, 20 product_variants, 3 orders).

2. **Make a mess on purpose.** In the dashboard:
   - Open **Products**, open "Gold Buckle Block Heels", and click **Delete permanently**.
   - Open **Categories** and delete "Skirts".
   - Open any demo order and cancel it.

3. **See what the restore would do:**

   ```
   npm run restore -- backups/<your-file>.zip --replace --dry-run
   ```

   The "in backup" and "in database now" columns show what changed.

4. **Restore:**

   ```
   npm run restore -- backups/<your-file>.zip --replace
   ```

   Type `REPLACE` when asked. You should see "✓ Check passed: every table now has exactly the number of rows in the backup."

5. **Check in the dashboard:** the heels, the Skirts category and the order are back, the order is no longer cancelled, and stock numbers are what they were before step 2.

6. **Try the dashboard backup too:** download one from **Dashboard → Backup**, open the zip, and open `csv/orders.csv` in Excel or Google Sheets to see your orders.

Then remove the demo data (setup Step 11) and you are ready to launch.

If anything in the practice run does not match what is described here, stop and ask for help before launch.

---

## For developers: automated checks

`supabase/tests/run-local.sh` builds a throwaway local PostgreSQL database, loads the migrations and demo data, and checks:

- every security rule (visitors cannot read orders, non-admins cannot change anything, hidden products stay hidden);
- checkout rules (stock, minimum quantities, delivery address, prices locked at order time);
- two customers buying the last item at the same moment (only one succeeds);
- a full backup with `npm run backup`, restored with `npm run restore -- --replace` into an empty database, with every table compared and identical.

Run it with `npm run test:db` (needs a local PostgreSQL 15+ and `PGHOST`, `PGPORT`, `PGUSER` set).
