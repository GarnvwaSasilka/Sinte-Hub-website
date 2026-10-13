import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { getCatalogList, getCategories } from '@/lib/catalog';
import { imageUrl } from '@/lib/images';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

export default async function HomePage() {
  const [settings, categories, featured, newest, bestsellers] = await Promise.all([
    getSettings(),
    getCategories(),
    getCatalogList('featured', 8),
    getCatalogList('new', 8),
    getCatalogList('bestseller', 4),
  ]);
  const heroImg = imageUrl(settings.hero_image_path);
  const low = settings.low_stock_threshold;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <div className="hero-kicker">Style • Quality • You</div>
            <h1>{settings.hero_title || 'Affordable luxury, made for you'}</h1>
            <p>
              {settings.hero_subtitle ||
                'Gowns, abayas, bubu dresses, jeans, jerseys, shoes, bags and premium Ankara fabrics, chosen with care.'}
            </p>
            <div className="actions-row">
              <Link href="/shop" className="btn btn-gold">
                Shop the Collection
              </Link>
              <Link href="/categories" className="btn btn-outline" style={{ color: 'var(--cream)', borderColor: 'var(--cream)' }}>
                Browse categories
              </Link>
            </div>
          </div>
          <div className="hero-art">
            {heroImg ? (
              <img src={heroImg} alt="New collection at Sinte's Hub" />
            ) : (
              <img src="/logo-on-dark.png" alt="Sinte's Hub logo" width={420} height={295} />
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {featured.length > 0 ? (
          <section>
            <div className="section-head">
              <h2>Featured</h2>
              <Link href="/shop?sort=featured" className="small">View all</Link>
            </div>
            <div className="product-grid">
              {featured.map((p) => (
                <ProductCard key={p.id} item={p} lowThreshold={low} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2>Shop by category</h2>
            <Link href="/categories" className="small">All categories</Link>
          </div>
          <div className="category-tiles">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="category-tile">
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {newest.length > 0 ? (
          <section>
            <div className="section-head">
              <h2>New arrivals</h2>
              <Link href="/shop?sort=newest" className="small">View all</Link>
            </div>
            <div className="product-grid">
              {newest.map((p) => (
                <ProductCard key={p.id} item={p} lowThreshold={low} />
              ))}
            </div>
          </section>
        ) : null}

        {bestsellers.length > 0 ? (
          <section>
            <div className="section-head">
              <h2>Bestsellers</h2>
            </div>
            <div className="product-grid">
              {bestsellers.map((p) => (
                <ProductCard key={p.id} item={p} lowThreshold={low} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="trust-row">
          <div>
            <h3>Confirmed on WhatsApp</h3>
            <p className="small muted">We save your order, then confirm stock and your final total with you personally before you pay.</p>
          </div>
          <div>
            <h3>Free pickup</h3>
            <p className="small muted">
              Choose pickup and pay no delivery fee. Delivery fees are confirmed before payment. <Link href="/delivery">Delivery &amp; pickup</Link>
            </p>
          </div>
          <div>
            <h3>Easy exchanges</h3>
            <p className="small muted">
              Wrong size? We will help you swap it. <Link href="/returns">Returns &amp; exchanges</Link>
            </p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 48 }}>
          <h2 style={{ marginTop: 0 }}>About Sinte&rsquo;s Hub</h2>
          <hr className="divider" />
          <p>
            A Nigerian fashion and accessories store for people who love to look good without the stress. Refined, organised and
            easy to shop.
          </p>
          <Link href="/about" className="btn btn-outline btn-small">
            Our story
          </Link>
        </section>
      </div>
    </>
  );
}
