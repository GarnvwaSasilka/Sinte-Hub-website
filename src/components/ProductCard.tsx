import Link from 'next/link';
import { formatNaira } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { CatalogItem } from '@/lib/types';

export function StockBadge({ item, lowThreshold }: { item: CatalogItem; lowThreshold: number }) {
  if (!item.in_stock) return <span className="badge badge-sold">Sold out</span>;
  if (item.total_stock <= lowThreshold) return <span className="badge badge-low">Only {item.total_stock} left</span>;
  return <span className="badge badge-ok">In stock</span>;
}

export function Placeholder() {
  return (
    <div className="placeholder-img">
      <img src="/monogram.png" alt="" />
    </div>
  );
}

export default function ProductCard({ item, lowThreshold }: { item: CatalogItem; lowThreshold: number }) {
  const src = imageUrl(item.thumb_path || item.image_path);
  const onSale = item.sale_price != null && item.sale_price < item.price;
  return (
    <Link href={`/product/${item.slug}`} className="product-card">
      <div className="thumb">
        {src ? <img src={src} alt={item.image_alt || item.name} loading="lazy" /> : <Placeholder />}
        {onSale && item.in_stock ? <span className="badge badge-sale">Sale</span> : null}
        {!item.in_stock ? <span className="badge badge-sold">Sold out</span> : null}
      </div>
      <div className="body">
        <div className="name">{item.name}</div>
        <div className="price">
          {formatNaira(item.effective_price)}
          {item.unit_of_sale !== 'piece' ? <span className="muted small"> / {item.unit_of_sale}</span> : null}
          {onSale ? <s>{formatNaira(item.price)}</s> : null}
        </div>
        <div style={{ marginTop: 6 }}>
          <StockBadge item={item} lowThreshold={lowThreshold} />
        </div>
      </div>
    </Link>
  );
}
