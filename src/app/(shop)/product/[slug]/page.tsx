import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyBox from '@/components/BuyBox';
import Gallery from '@/components/Gallery';
import { formatNaira } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { getProductBySlug } from '@/lib/product';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return []; // pages are built on first visit, then cached
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Product not found' };
  const img = imageUrl(p.product_images[0]?.path);
  const description = (p.description || `${p.name} at Sinte's Hub`).slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: img ? [img] : ['/logo.png'] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!p) notFound();

  const images = p.product_images.map((img) => ({
    src: imageUrl(img.path)!,
    thumb: imageUrl(img.thumb_path || img.path)!,
    alt: img.alt_text || p.name,
  }));
  const totalStock = p.product_variants.reduce((n, v) => n + v.stock, 0);
  const inStock = p.status === 'available' && totalStock > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description ?? undefined,
    sku: p.sku ?? undefined,
    image: images.map((i) => i.src),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: Number(p.sale_price ?? p.price),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        {p.category ? (
          <>
            {' / '}
            <Link href={`/category/${p.category.slug}`}>{p.category.name}</Link>
          </>
        ) : null}
      </nav>
      <div className="product-layout">
        <Gallery images={images} />
        <div>
          <h1>{p.name}</h1>
          <p className="small muted" style={{ marginTop: -8 }}>
            {p.sku ? <>Product code: {p.sku}</> : null}
            {p.sku && p.category ? ' · ' : null}
            {p.category ? p.category.name : null}
          </p>
          <BuyBox
            product={{
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: Number(p.price),
              sale_price: p.sale_price == null ? null : Number(p.sale_price),
              status: p.status,
              unit_of_sale: p.unit_of_sale,
              min_order_qty: p.min_order_qty,
            }}
            variants={p.product_variants}
            image={images[0]?.thumb ?? null}
            lowThreshold={settings.low_stock_threshold}
          />

          {p.description ? <p style={{ whiteSpace: 'pre-line', marginTop: 20 }}>{p.description}</p> : null}

          <div className="detail-list">
            {p.material || p.care_instructions ? (
              <details>
                <summary>Fabric &amp; care</summary>
                {p.material ? <p><strong>Material:</strong> {p.material}</p> : null}
                {p.care_instructions ? <p>{p.care_instructions}</p> : null}
              </details>
            ) : null}
            {p.fit_notes ? (
              <details>
                <summary>Fit notes</summary>
                <p>{p.fit_notes}</p>
              </details>
            ) : null}
            <details>
              <summary>Size guide</summary>
              <p>
                Not sure about your size? See our <Link href="/size-guide">size guide</Link> or ask us on WhatsApp.
              </p>
            </details>
            <details>
              <summary>Pickup &amp; delivery</summary>
              <p>
                Pickup is free{settings.pickup_area ? ` (${settings.pickup_area})` : ''}. Delivery fees depend on your location and are
                confirmed with you before payment. <Link href="/delivery">Read more</Link>
              </p>
            </details>
            <details>
              <summary>Returns &amp; exchanges</summary>
              <p>
                See our <Link href="/returns">returns and exchanges policy</Link>.
              </p>
            </details>
          </div>
          {p.min_order_qty > 1 ? (
            <p className="small muted">
              Minimum order {p.min_order_qty} {p.unit_of_sale}s ({formatNaira(Number(p.sale_price ?? p.price) * p.min_order_qty)}).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
