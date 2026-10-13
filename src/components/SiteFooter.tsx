import Link from 'next/link';
import type { StoreSettings } from '@/lib/types';
import { toWhatsAppNumber } from '@/lib/whatsapp';

export default function SiteFooter({ settings }: { settings: StoreSettings }) {
  const wa = toWhatsAppNumber(settings.whatsapp_number);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img src="/logo-on-dark.png" alt="Sinte's Hub: Style, Quality, You" width={220} height={155} />
            <p className="small" style={{ color: '#d9cfbf', maxWidth: 360 }}>
              Clothing and fashion accessories, chosen with care. Every order is confirmed personally on WhatsApp.
            </p>
          </div>
          <div>
            <h3>Shop</h3>
            <ul>
              <li><Link href="/shop">All products</Link></li>
              <li><Link href="/categories">Categories</Link></li>
              <li><Link href="/shop?sort=newest">New arrivals</Link></li>
              <li><Link href="/size-guide">Size guide</Link></li>
            </ul>
          </div>
          <div>
            <h3>Help</h3>
            <ul>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/delivery">Delivery &amp; pickup</Link></li>
              <li><Link href="/returns">Returns &amp; exchanges</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of service</Link></li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              {wa ? (
                <li>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </li>
              ) : null}
              {settings.contact_phone ? <li><a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a></li> : null}
              {settings.contact_email ? <li><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></li> : null}
              {settings.instagram_url ? <li><a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a></li> : null}
              {settings.tiktok_url ? <li><a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer">TikTok</a></li> : null}
              {settings.facebook_url ? <li><a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a></li> : null}
              <li><Link href="/contact">Contact page</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} {settings.store_name}. Prices shown cover items only; delivery is charged separately.
        </div>
      </div>
    </footer>
  );
}
