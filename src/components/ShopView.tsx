import Link from 'next/link';
import ProductCard from './ProductCard';
import { getCategories, getFilterOptions, searchCatalog, type SearchParams } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';

export default async function ShopView({
  sp,
  fixedCategory,
  title,
}: {
  sp: SearchParams;
  fixedCategory?: string;
  title: string;
}) {
  const params: SearchParams = { ...sp, category: fixedCategory ?? sp.category };
  const [{ items, hasMore, page, sort }, categories, options, settings] = await Promise.all([
    searchCatalog(params),
    getCategories(),
    getFilterOptions(),
    getSettings(),
  ]);

  const pageLink = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page' && !(fixedCategory && k === 'category')) u.set(k, String(v));
    });
    if (p > 1) u.set('page', String(p));
    const qs = u.toString();
    return qs ? `?${qs}` : '?';
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>{title}</h1>
        {params.q ? <p className="muted">Results for &ldquo;{params.q}&rdquo;</p> : null}
      </div>
      <div className="shop-layout">
        <aside className="filters">
          <details open>
            <summary>Filter &amp; sort</summary>
            <form method="get" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="f-q">Search</label>
                <input id="f-q" type="search" name="q" defaultValue={params.q ?? ''} placeholder="Name or keyword" />
              </div>
              {!fixedCategory ? (
                <div className="field">
                  <label htmlFor="f-cat">Category</label>
                  <select id="f-cat" name="category" defaultValue={params.category ?? ''}>
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="row" style={{ gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="f-min">Min ₦</label>
                  <input id="f-min" type="number" min={0} name="min" defaultValue={params.min ?? ''} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="f-max">Max ₦</label>
                  <input id="f-max" type="number" min={0} name="max" defaultValue={params.max ?? ''} />
                </div>
              </div>
              {options.sizes.length ? (
                <div className="field">
                  <label htmlFor="f-size">Size</label>
                  <select id="f-size" name="size" defaultValue={params.size ?? ''}>
                    <option value="">Any size</option>
                    {options.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              {options.colours.length ? (
                <div className="field">
                  <label htmlFor="f-colour">Colour</label>
                  <select id="f-colour" name="colour" defaultValue={params.colour ?? ''}>
                    <option value="">Any colour</option>
                    {options.colours.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="field">
                <label className="checkbox">
                  <input type="checkbox" name="instock" value="1" defaultChecked={params.instock === '1'} /> In stock only
                </label>
              </div>
              <div className="field">
                <label htmlFor="f-sort">Sort by</label>
                <select id="f-sort" name="sort" defaultValue={sort}>
                  <option value="newest">Newest</option>
                  <option value="featured">Featured</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </div>
              <button className="btn btn-block btn-small" type="submit">
                Apply
              </button>
              <p className="center small">
                <Link href="?">Clear filters</Link>
              </p>
            </form>
          </details>
        </aside>
        <section>
          <div className="toolbar">
            <span className="muted small">
              {items.length === 0 ? 'No products found' : `Showing ${(page - 1) * 24 + 1}–${(page - 1) * 24 + items.length}`}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="card center">
              <p>Nothing matches those filters yet.</p>
              <Link href="/shop" className="btn btn-small">
                See all products
              </Link>
            </div>
          ) : (
            <div className="product-grid">
              {items.map((p) => (
                <ProductCard key={p.id} item={p} lowThreshold={settings.low_stock_threshold} />
              ))}
            </div>
          )}
          {page > 1 || hasMore ? (
            <nav className="pagination" aria-label="Pages">
              {page > 1 ? (
                <Link className="btn btn-outline btn-small" href={pageLink(page - 1)}>
                  Previous
                </Link>
              ) : null}
              {hasMore ? (
                <Link className="btn btn-outline btn-small" href={pageLink(page + 1)}>
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
