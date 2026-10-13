import type { Metadata } from 'next';
import { WhatsAppIcon } from '@/components/Icons';
import { getSettings } from '@/lib/settings';
import { toWhatsAppNumber } from '@/lib/whatsapp';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Contact us' };

export default async function ContactPage() {
  const s = await getSettings();
  const wa = toWhatsAppNumber(s.whatsapp_number);
  return (
    <div className="container">
      <div className="page-head">
        <h1>Contact us</h1>
        <hr className="divider" />
      </div>
      <div className="prose stack">
        <p>The quickest way to reach us is on WhatsApp. We usually reply within a few hours during business days.</p>
        {wa ? (
          <a className="btn btn-whatsapp" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> Chat on WhatsApp
          </a>
        ) : null}
        <div className="card">
          {s.contact_phone ? <p><strong>Phone:</strong> <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></p> : null}
          {s.contact_email ? <p><strong>Email:</strong> <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></p> : null}
          {s.address ? <p style={{ whiteSpace: 'pre-line' }}><strong>Address:</strong> {s.address}</p> : null}
          {s.pickup_area ? <p><strong>Pickup area:</strong> {s.pickup_area}</p> : null}
          <p className="row">
            {s.instagram_url ? <a href={s.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
            {s.tiktok_url ? <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer">TikTok</a> : null}
            {s.facebook_url ? <a href={s.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a> : null}
          </p>
        </div>
      </div>
    </div>
  );
}
