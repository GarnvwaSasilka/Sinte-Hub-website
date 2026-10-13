# Setting up Sinte's Hub, step by step

This guide takes you from nothing to a working shop. You can do every step in your web browser. Take your time: it is about an hour the first time.

You will use three free services:

| Service | What it does for the shop |
|---|---|
| **GitHub** | Keeps the website's code safe, with a history of every change |
| **Supabase** (Free plan) | The database (products, orders), the owner login and the product photos |
| **Netlify** (Free plan) | Puts the website on the internet |

> **Keep a password manager or a private notebook handy.** You will create a few passwords and keys. Write down where each one came from.

---

## Step 1. Put the code on GitHub

The code needs to live in a GitHub repository (a "repo"), for example `sintes-hub`. If Claude has already pushed it for you, skip this step.

Make the repository **Private**. The code has no secrets in it, but there is no reason for strangers to see it.

---

## Step 2. Create the Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. **Name:** `sintes-hub`.
3. **Database password:** click **Generate a password**, then **copy it into your password manager now.** You need it for backups. Supabase will not show it again (you can reset it later if you lose it).
4. **Region:** choose the one closest to Nigeria that is offered, such as London (West EU) or Frankfurt.
5. Plan: **Free**. Click **Create new project** and wait a minute or two.

---

## Step 3. Create the database tables and safety rules

This step creates every table, the security rules (Row Level Security), and the checkout logic.

1. In your Supabase project, open **SQL Editor** (left menu) and click **New query**.
2. Open the file `supabase/migrations/20261013000001_schema.sql` from the code (on GitHub, click the file, then the **Copy raw file** button).
3. Paste it into the SQL Editor and click **Run**. You should see "Success. No rows returned".
4. Click **New query** again, and do the same with `supabase/migrations/20261013000002_storage.sql`. This creates the photo storage area.

**Only if you want sample products to practise with:** run `supabase/seed.sql` the same way. It adds demo categories, 9 demo products and 3 demo orders. Step 11 shows how to remove them before launch.

> If you see an error saying something "already exists", that step was already done. Do not run the files twice on a live shop.

---

## Step 4. Lock down sign-ups

Only you should be able to log in. Customers do not need accounts.

1. In Supabase, go to **Authentication → Sign In / Providers**.
2. Turn **off** "Allow new users to sign up". Click **Save**.
3. Leave only **Email** turned on. Turn off any other providers (phone, Google, and so on).

Even if someone did manage to create an account, they still could not open the dashboard or see any orders: the database only lets in the people listed as admins (Step 5).

---

## Step 5. Create your owner login

1. Go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a **strong password** (at least 12 characters; a password manager can make one). Tick **Auto Confirm User**. Click **Create user**.
3. Now make that account the shop admin. Open **SQL Editor → New query**, paste this, **change the email to yours**, and click **Run**:

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'you@example.com';
```

It should say "Success. 1 row". If it says 0 rows, the email does not match exactly; check the spelling.

---

## Step 6. Copy two values from Supabase

Go to **Project Settings → API Keys** (or click the **Connect** button at the top of the project). Copy these into your notes:

| Name in this guide | Where to find it |
|---|---|
| **Project URL** | Looks like `https://abcdefghijkl.supabase.co` |
| **Anon key** | Called "anon public" (older projects) or "publishable" (newer ones). It is safe to be public. |

You will also see a **service_role** (or "secret") key. **Never put this key in Netlify, GitHub or the website.** It can read and change everything. You only need it on your own computer when restoring photos (see BACKUP-AND-RESTORE.md).

---

## Step 7. Put the website online with Netlify

1. Go to <https://app.netlify.com>, sign in with GitHub.
2. Click **Add new project → Import an existing project → GitHub**, and choose your `sintes-hub` repository.
3. Netlify reads the build settings from the `netlify.toml` file, so leave them as they are.
4. Before deploying, open **Environment variables** (on the same screen, or later under **Project configuration → Environment variables**) and add these three:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |
| `NEXT_PUBLIC_SITE_URL` | your Netlify address, e.g. `https://sintes-hub.netlify.app` (no slash at the end) |

5. Click **Deploy**. After a few minutes you get a web address. Open it: you should see the shop.

If you only learn your Netlify address after the first deploy, set `NEXT_PUBLIC_SITE_URL` then and click **Deploys → Trigger deploy → Deploy project**.

---

## Step 8. Tell Supabase your web address

This makes "forgot password" emails link back to your shop.

1. In Supabase, go to **Authentication → URL Configuration**.
2. **Site URL:** your shop address, e.g. `https://sintes-hub.netlify.app`.
3. Under **Redirect URLs**, add `https://sintes-hub.netlify.app/admin/reset-password` (with your own address). Save.

---

## Step 9. Log in and fill in your store details

1. Open `https://your-shop-address/admin` and log in with the email and password from Step 5.
2. Go to **Settings** and fill in:
   - **WhatsApp business number.** This is where customers send their orders. Without it, the order button cannot open WhatsApp.
   - Phone, email, Instagram, TikTok.
   - Pickup area and pickup instructions.
   - The home page heading and banner photo.
3. **Read the policy texts** (Delivery, Returns, Privacy, Terms). The shop shows starter text until you write your own. They are general templates, not legal advice: adjust them to how you really work.
4. Click **Save settings**.

---

## Step 10. Add your products

Go to **Products → Add product**:

- Fill in the name, category, price and description.
- Under **Sizes, colours and stock**, add one row for each size/colour you have, with how many are in stock. For items with no sizes (like a bag), keep one row with size and colour empty.
- For fabrics, set **Sold per** to `yard` and the **Minimum order quantity** (e.g. 6).
- Click **Create product**, then **Add photos**.

Photos are shrunk automatically on your phone or laptop before they upload. A 5 MB phone photo becomes about 200 KB, so the free 1 GB of photo space holds thousands of photos.

**Statuses:**
- **Available:** shown, and can be bought while there is stock.
- **Sold out:** still shown, but cannot be bought.
- **Hidden:** not shown in the shop at all.
- **Archived:** hidden and moved out of your product list.

---

## Step 11. Before you launch

1. **Do a restore practice run.** Follow "Practice run" in `docs/BACKUP-AND-RESTORE.md`. It takes 15 minutes, and you will know your backups work before you need them.
2. **Remove demo data** if you ran `seed.sql`. In SQL Editor, run:

```sql
-- ONLY BEFORE LAUNCH: this deletes every order, including any test orders you placed.
delete from public.orders;
delete from public.stock_movements;
delete from public.products where sku like 'DEMO-%';
```

3. Place one real test order yourself (pickup), check it arrives in the dashboard and on WhatsApp, then cancel it in the dashboard.
4. Check the shop on your phone and on a laptop.
5. Download your first backup from **Dashboard → Backup**.

---

## Your Supabase project can fall asleep (please read)

**Free Supabase projects are paused after 7 days with no activity.** "Activity" means the database being used. A shop that gets visitors every day normally stays awake, but a quiet week (for example while you are still setting up) can send it to sleep.

**What you will notice:** the shop shows no products, the checkout says it cannot place orders, and you cannot log in to the dashboard. **Your data is not deleted** when a project is paused.

### How to wake it up

1. Go to <https://supabase.com/dashboard> and open your project.
2. You will see a message that the project is paused. Click **Restore project** (it may say "Resume").
3. Wait a few minutes until the project shows as healthy again.
4. Open your shop. Pages may take up to 5 minutes to show products again. To speed this up, in Netlify go to **Deploys → Trigger deploy → Deploy project**.
5. Log in to the dashboard and download a fresh backup, just in case.

**Important:** Supabase only keeps paused free projects restorable for a limited time (90 days at the time of writing). Do not leave a paused project for weeks. If it can no longer be restored, use your backups to set up a new project (see "Restore after a disaster" in `docs/BACKUP-AND-RESTORE.md`).

### How to stop it falling asleep

- **Automatic daily visit (recommended):** the code includes a small GitHub task (`.github/workflows/keep-alive.yml`) that reads one category from your database every day. To switch it on, in GitHub open your repository → **Settings → Secrets and variables → Actions → New repository secret**, and add:
  - `SUPABASE_URL` = your Project URL
  - `SUPABASE_ANON_KEY` = your anon / publishable key

  Then open the **Actions** tab, choose **Keep Supabase awake**, and click **Run workflow** once to test it. If it ever fails, GitHub emails you, which is also a handy early warning that the project has paused.
- **Upgrade later:** paid Supabase plans are never paused and include daily backups. You can upgrade at any time with no code changes.

---

## Good habits

- **Download a backup every week** (Dashboard → Backup) and run `npm run backup` (with photos) once a month. See `docs/BACKUP-AND-RESTORE.md`.
- **Never share** your database password or the service_role/secret key. If you think one has leaked, reset it in Supabase straight away (Project Settings → Database → Reset password, or API Keys → roll the key).
- Use a strong, unique password for the dashboard, GitHub, Netlify and Supabase, and turn on two-factor login for all three services.
- **Free plan limits** (check Supabase's pricing page for current numbers): about 500 MB of database, 1 GB of photos, and a monthly limit on data downloaded. A small shop stays well within these.

## Using your own domain later

Buy the domain (check the yearly renewal price, not just the first-year price). In Netlify: **Domain management → Add a domain**, and follow the steps. Then update `NEXT_PUBLIC_SITE_URL` in Netlify and the Site URL / Redirect URL in Supabase (Step 8), and redeploy.
