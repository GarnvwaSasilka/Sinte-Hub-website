'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCart } from './CartProvider';
import { formatNaira } from '@/lib/format';
import type { Variant } from '@/lib/types';

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    sale_price: number | null;
    status: string;
    unit_of_sale: string;
    min_order_qty: number;
  };
  variants: Variant[];
  image: string | null;
  lowThreshold: number;
}

export default function BuyBox({ product, variants, image, lowThreshold }: Props) {
  const cart = useCart();
  const router = useRouter();
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[], [variants]);
  const colours = useMemo(() => [...new Set(variants.map((v) => v.colour).filter(Boolean))] as string[], [variants]);
  const purchasable = product.status === 'available';

  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [size, setSize] = useState<string | null>(firstInStock?.size ?? null);
  const [colour, setColour] = useState<string | null>(firstInStock?.colour ?? null);
  const [qty, setQty] = useState(product.min_order_qty);
  const [added, setAdded] = useState(false);

  const variant = variants.find((v) => (v.size ?? null) === size && (v.colour ?? null) === colour) ?? null;
  const stock = variant?.stock ?? 0;
  const unitPrice = Number(variant?.price ?? product.sale_price ?? product.price);
  const canBuy = purchasable && !!variant && stock >= product.min_order_qty;

  function addToCart(goToCheckout: boolean) {
    if (!variant || !canBuy) return;
    cart.add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: [variant.size, variant.colour].filter(Boolean).join(' / '),
      unitPrice,
      quantity: Math.min(qty, stock),
      image,
      unitOfSale: product.unit_of_sale,
      minQty: product.min_order_qty,
      maxQty: stock,
    });
    if (goToCheckout) router.push('/checkout');
    else setAdded(true);
  }

  return (
    <div>
      <div className="price" style={{ fontSize: '1.5rem' }}>
        {formatNaira(unitPrice)}
        {product.unit_of_sale !== 'piece' ? <span className="muted small"> per {product.unit_of_sale}</span> : null}
        {product.sale_price != null && !variant?.price ? <s>{formatNaira(product.price)}</s> : null}
      </div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Price covers the item only. Delivery is confirmed separately; pickup is free.
      </p>

      {sizes.length > 0 ? (
        <div className="option-group">
          <label id="size-label">Size{size ? `: ${size}` : ''}</label>
          <div className="option-buttons" role="group" aria-labelledby="size-label">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                disabled={!variants.some((v) => v.size === s && v.stock > 0)}
                onClick={() => {
                  setSize(s);
                  setAdded(false);
                  if (!variants.some((v) => v.size === s && (v.colour ?? null) === colour)) {
                    const match = variants.find((v) => v.size === s && v.stock > 0) ?? variants.find((v) => v.size === s);
                    setColour(match?.colour ?? null);
                  }
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {colours.length > 0 ? (
        <div className="option-group">
          <label id="colour-label">Colour{colour ? `: ${colour}` : ''}</label>
          <div className="option-buttons" role="group" aria-labelledby="colour-label">
            {colours.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={colour === c}
                disabled={!variants.some((v) => v.colour === c && (sizes.length === 0 || v.size === size))}
                onClick={() => {
                  setColour(c);
                  setAdded(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="small" aria-live="polite">
        {!purchasable || !variant ? (
          <span className="badge badge-sold">Sold out</span>
        ) : stock <= 0 ? (
          <span className="badge badge-sold">This option is sold out</span>
        ) : stock <= lowThreshold ? (
          <span className="badge badge-low">Only {stock} left</span>
        ) : (
          <span className="badge badge-ok">{stock} available</span>
        )}
        {product.min_order_qty > 1 ? (
          <span className="muted"> Minimum order: {product.min_order_qty} {product.unit_of_sale}s</span>
        ) : null}
      </p>

      {canBuy ? (
        <>
          <div className="row">
            <div className="qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(product.min_order_qty, q - 1))}>
                −
              </button>
              <input
                type="number"
                aria-label="Quantity"
                value={qty}
                min={product.min_order_qty}
                max={stock}
                onChange={(e) => setQty(Math.max(product.min_order_qty, Math.min(stock, Math.floor(Number(e.target.value)) || 1)))}
              />
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(stock, q + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="actions-row">
            <button className="btn" type="button" onClick={() => addToCart(false)}>
              Add to cart
            </button>
            <button className="btn btn-gold" type="button" onClick={() => addToCart(true)}>
              Buy now
            </button>
          </div>
          {added ? (
            <p className="alert alert-success" role="status">
              Added to your cart. <a href="/cart">View cart</a>
            </p>
          ) : null}
        </>
      ) : (
        <button className="btn" type="button" disabled>
          Sold out
        </button>
      )}
    </div>
  );
}
