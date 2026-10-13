import { CartProvider } from '@/components/CartProvider';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { getSettings } from '@/lib/settings';
import { toWhatsAppNumber } from '@/lib/whatsapp';

// Shop pages are cached and refreshed at least every 5 minutes. Saving in the
// dashboard refreshes them straight away.
export const revalidate = 300;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const wa = toWhatsAppNumber(settings.whatsapp_number);
  return (
    <CartProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader whatsappHref={wa ? `https://wa.me/${wa}` : null} announcement={settings.announcement} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} />
    </CartProvider>
  );
}
