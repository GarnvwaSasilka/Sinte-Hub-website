export type ProductStatus = 'available' | 'sold_out' | 'hidden' | 'archived';
export type FulfilmentMethod = 'pickup' | 'delivery';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'delivered'
  | 'collected'
  | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  sku: string | null;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  unit_of_sale: string;
  min_order_qty: number;
  tags: string | null;
  created_at: string;
  total_stock: number;
  sizes: string[];
  colours: string[];
  in_stock: boolean;
  image_path: string | null;
  thumb_path: string | null;
  image_alt: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  sale_price: number | null;
  sku: string | null;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  material: string | null;
  care_instructions: string | null;
  fit_notes: string | null;
  unit_of_sale: string;
  min_order_qty: number;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: string;
  product_id: string;
  size: string | null;
  colour: string | null;
  sku: string | null;
  stock: number;
  price: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  thumb_path: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface StoreSettings {
  store_name: string;
  tagline: string | null;
  whatsapp_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  pickup_area: string | null;
  pickup_instructions: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  low_stock_threshold: number;
  announcement: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_path: string | null;
  about_text: string | null;
  delivery_policy: string | null;
  returns_policy: string | null;
  privacy_policy: string | null;
  terms_text: string | null;
  size_guide_text: string | null;
  faq: FaqItem[];
}

export interface Order {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfilment_method: FulfilmentMethod;
  delivery_state: string | null;
  delivery_city: string | null;
  delivery_address: string | null;
  customer_note: string | null;
  subtotal: number;
  delivery_fee: number | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  admin_notes: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  collected_at: string | null;
  cancelled_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  unit_of_sale: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'verified' | 'failed' | 'refunded';
  notes: string | null;
  verified_at: string | null;
  created_at: string;
}

/** What place_order returns to the customer after checkout. */
export interface PlacedOrder {
  reference: string;
  subtotal: number;
  fulfilment_method: FulfilmentMethod;
  items: {
    name: string;
    variant_label: string | null;
    quantity: number;
    unit_of_sale: string;
    unit_price: number;
    line_total: number;
  }[];
}
