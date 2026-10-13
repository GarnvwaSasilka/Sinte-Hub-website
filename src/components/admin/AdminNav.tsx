'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/backup', label: 'Backup' },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Dashboard">
      {LINKS.map((l) => {
        const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
