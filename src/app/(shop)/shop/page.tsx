import type { Metadata } from 'next';
import ShopView from '@/components/ShopView';
import type { SearchParams } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Shop',
  description: "Shop all clothing, shoes, bags and Ankara fabrics at Sinte's Hub.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <ShopView sp={await searchParams} title="Shop all" />;
}
