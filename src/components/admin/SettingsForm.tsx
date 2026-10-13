'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSettings, uploadedHeroImage } from '@/app/admin/(dash)/settings/actions';
import { imageUrl } from '@/lib/images';
import { shrinkPhoto } from '@/lib/image-compress';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { StoreSettings } from '@/lib/types';

function faqToText(faq: StoreSettings['faq']) {
  return (faq ?? []).map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
}

export default function SettingsForm({ settings, email }: { settings: StoreSettings; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);

  const v = (k: keyof StoreSettings) => (settings[k] ?? '') as string;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setError(null);
    setOk(null);
    start(async () => {
      const res = await saveSettings(form);
      if (res.error) setError(res.error);
      else {
        setOk('Settings saved. The shop updates within a minute.');
        router.refresh();
      }
    });
  }

  async function onHero(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setHeroBusy(true);
    setError(null);
    try {
      const { full } = await shrinkPhoto(file);
      const path = `site/hero-${crypto.randomUUID()}.${full.ext}`;
      const { error } = await getBrowserClient().storage.from('product-images').upload(path, full.blob, { contentType: full.blob.type, cacheControl: '31536000' });
      if (error) throw new Error(error.message);
      const res = await uploadedHeroImage(path);
      if (res.error) throw new Error(res.error);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setHeroBusy(false);
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    setError(null);
    setOk(null);
    if (password.length < 10) return setError('Use at least 10 characters for your new password.');
    if (password !== String(f.get('confirm'))) return setError('The two passwords do not match.');
    const { error } = await getBrowserClient().auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setOk('Password changed.');
      e.currentTarget.reset();
    }
  }

  const hero = imageUrl(settings.hero_image_path);

  return (
    <div className="stack">
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {ok ? <p className="alert alert-success" role="status">{ok}</p> : null}
      <form onSubmit={onSubmit} className="stack">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Contact and WhatsApp</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="s-wa">WhatsApp business number</label>
              <input id="s-wa" name="whatsapp_number" type="tel" defaultValue={v('whatsapp_number')} placeholder="2348012345678" />
              <span className="hint">Orders are sent to this number. 0801… is changed to 234801… automatically.</span>
            </div>
            <div className="field">
              <label htmlFor="s-phone">Phone shown on the site</label>
              <input id="s-phone" name="contact_phone" type="tel" defaultValue={v('contact_phone')} />
            </div>
            <div className="field">
              <label htmlFor="s-email">Email shown on the site</label>
              <input id="s-email" name="contact_email" type="email" defaultValue={v('contact_email')} />
            </div>
            <div className="field">
              <label htmlFor="s-name">Store name</label>
              <input id="s-name" name="store_name" type="text" defaultValue={v('store_name')} />
            </div>
            <div className="field full">
              <label htmlFor="s-address">Address (optional, shown on Contact page)</label>
              <textarea id="s-address" name="address" defaultValue={v('address')} style={{ minHeight: 60 }} />
            </div>
            <div className="field">
              <label htmlFor="s-ig">Instagram link</label>
              <input id="s-ig" name="instagram_url" type="url" defaultValue={v('instagram_url')} placeholder="https://instagram.com/…" />
            </div>
            <div className="field">
              <label htmlFor="s-tt">TikTok link</label>
              <input id="s-tt" name="tiktok_url" type="url" defaultValue={v('tiktok_url')} placeholder="https://tiktok.com/@…" />
            </div>
            <div className="field">
              <label htmlFor="s-fb">Facebook link</label>
              <input id="s-fb" name="facebook_url" type="url" defaultValue={v('facebook_url')} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Pickup and stock</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="s-parea">Pickup area (shown at checkout)</label>
              <input id="s-parea" name="pickup_area" type="text" defaultValue={v('pickup_area')} placeholder="e.g. Lekki Phase 1, Lagos" />
            </div>
            <div className="field">
              <label htmlFor="s-low">Low-stock warning at or below</label>
              <input id="s-low" name="low_stock_threshold" type="number" min={0} max={1000} defaultValue={settings.low_stock_threshold} />
            </div>
            <div className="field full">
              <label htmlFor="s-pinst">Pickup instructions (added to the WhatsApp message when an order is ready)</label>
              <textarea id="s-pinst" name="pickup_instructions" defaultValue={v('pickup_instructions')} style={{ minHeight: 70 }} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Home page</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="s-ann">Announcement bar (leave empty to hide)</label>
              <input id="s-ann" name="announcement" type="text" defaultValue={v('announcement')} placeholder="e.g. New Ankara prints just arrived!" />
            </div>
            <div className="field">
              <label htmlFor="s-ht">Big heading</label>
              <input id="s-ht" name="hero_title" type="text" defaultValue={v('hero_title')} />
            </div>
            <div className="field">
              <label htmlFor="s-tag">Tagline</label>
              <input id="s-tag" name="tagline" type="text" defaultValue={v('tagline')} />
            </div>
            <div className="field full">
              <label htmlFor="s-hs">Text under the heading</label>
              <textarea id="s-hs" name="hero_subtitle" defaultValue={v('hero_subtitle')} style={{ minHeight: 60 }} />
            </div>
            <div className="field full">
              <label>Banner photo</label>
              {hero ? <img src={hero} alt="" style={{ maxWidth: 240, borderRadius: 8, marginBottom: 8 }} /> : <p className="small muted">None yet: the logo is shown instead.</p>}
              <div className="row">
                <label className="btn btn-outline btn-small" style={{ margin: 0 }}>
                  {heroBusy ? 'Uploading…' : hero ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" hidden disabled={heroBusy} onChange={(e) => onHero(e.target.files)} />
                </label>
                {hero ? (
                  <button type="button" className="link-button small" onClick={() => start(async () => { await uploadedHeroImage(null); router.refresh(); })}>
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Pages and policies</h2>
          <p className="small muted">
            Leave a box empty to use our starter text (please read it and adjust it to your real policies). Start a line with
            &ldquo;## &rdquo; for a heading and &ldquo;- &rdquo; for a bullet point.
          </p>
          {(
            [
              ['about_text', 'About us'],
              ['delivery_policy', 'Delivery and pickup policy'],
              ['returns_policy', 'Returns and exchanges policy'],
              ['privacy_policy', 'Privacy policy'],
              ['terms_text', 'Terms of service'],
              ['size_guide_text', 'Size guide'],
            ] as const
          ).map(([k, label]) => (
            <div className="field" key={k}>
              <label htmlFor={`s-${k}`}>{label}</label>
              <textarea id={`s-${k}`} name={k} defaultValue={v(k)} style={{ minHeight: 140 }} />
            </div>
          ))}
          <div className="field">
            <label htmlFor="s-faq">FAQ</label>
            <textarea
              id="s-faq"
              name="faq"
              defaultValue={faqToText(settings.faq)}
              placeholder={'Q: How do I pay?\nA: We share payment details after confirming your order.\n\nQ: …\nA: …'}
              style={{ minHeight: 160 }}
            />
            <span className="hint">Write each question on a line starting with &ldquo;Q:&rdquo; and its answer starting with &ldquo;A:&rdquo;.</span>
          </div>
        </section>

        <div>
          <button className="btn btn-gold" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>

      <form className="card" onSubmit={onPassword} style={{ maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>Change your password</h2>
        <p className="small muted">Logged in as {email}</p>
        <div className="field">
          <label htmlFor="pw1">New password (at least 10 characters)</label>
          <input id="pw1" name="password" type="password" minLength={10} required autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="pw2">Type it again</label>
          <input id="pw2" name="confirm" type="password" minLength={10} required autoComplete="new-password" />
        </div>
        <button className="btn btn-outline btn-small">Change password</button>
      </form>
    </div>
  );
}
