# Moving to a paid plan or a different host

The shop was built so you can change plans or hosts without rewriting any code. All settings live in environment variables, and the only Netlify-specific file is `netlify.toml`.

## Upgrading Netlify to a paid plan
Nothing to change. Upgrade in Netlify's billing page; the site keeps working as it is.

## Upgrading Supabase to a paid plan
Nothing to change in the code. Upgrade in Supabase's billing page. You get daily backups and the project is never paused. Keep downloading your own backups anyway: they are free insurance.

## Moving the website to Vercel
1. In Vercel, **Add New → Project**, and import the same GitHub repository.
2. Add the same three environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (with the new address).
3. Deploy. You can delete `netlify.toml` afterwards; Vercel ignores it.
4. Update the Site URL and Redirect URL in Supabase (docs/SETUP.md, Step 8), and move your domain.

## Moving to your own server (any host that runs Node.js 20 or newer)
```
npm ci
npm run build
npm start            # listens on port 3000; set PORT to change it
```
Set the same three environment variables on the server, put it behind HTTPS (for example with Caddy or Nginx), and update the Supabase Site URL.

## Moving the database away from Supabase
Supabase is a standard PostgreSQL database. The tables and rules are in `supabase/migrations`, and the backup files from `npm run backup` contain all your data plus every photo, so you are never locked in. A move away from Supabase would need a replacement for its login and photo-storage services, which is a bigger job; ask a developer if you ever need it.
