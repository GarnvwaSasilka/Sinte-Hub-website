'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// The cart lives in the customer's own browser (localStorage). Prices here
// are only for display: the server re-checks every price and stock level
// when the order is placed.

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  image: string | null;
  unitOfSale: string;
  minQty: number;
  maxQty: number;
}

interface CartApi {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const KEY = 'sh-cart-v1';
const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) setLines(saved);
    } catch {
      /* ignore a damaged or blocked cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage may be full or blocked */
    }
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === line.variantId);
      if (existing) {
        return prev.map((l) =>
          l.variantId === line.variantId
            ? { ...line, quantity: Math.min(l.quantity + line.quantity, line.maxQty) }
            : l,
        );
      }
      return [...prev, { ...line, quantity: Math.min(line.quantity, line.maxQty) }];
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.variantId === variantId
          ? { ...l, quantity: Math.max(l.minQty, Math.min(Math.floor(quantity) || l.minQty, l.maxQty)) }
          : l,
      ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
