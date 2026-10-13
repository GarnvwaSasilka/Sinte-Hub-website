'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { CartIcon, MenuIcon, SearchIcon, WhatsAppIcon } from './Icons';

export default function SiteHeader({
  whatsappHref,
  announcement,
}: {
  whatsappHref: string | null;
  announcement: string | null;
}) {
  const { count, ready } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const links = [
    { href: '/shop', label: 'Shop' },
    { href: '/categories', label: 'Categories' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      {announcement ? <div className="announcement">{announcement}</div> : null}
      <header className="site-header">
        <div className="container">
          <div className="header-inner">
            <button
              className="icon-btn menu-toggle"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuIcon />
            </button>
            <Link href="/" className="brand" aria-label="Sinte's Hub home">
              <img src="/monogram.png" alt="" width={48} height={44} />
              <span>SINTE&rsquo;S HUB</span>
            </Link>
            <nav className="main-nav" aria-label="Main">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="header-actions">
              <button
                className="icon-btn"
                aria-label="Search"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((o) => !o)}
              >
                <SearchIcon />
              </button>
              {whatsappHref ? (
                <a className="icon-btn" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
                  <WhatsAppIcon />
                </a>
              ) : null}
              <Link className="icon-btn" href="/cart" aria-label={`Cart, ${count} items`}>
                <CartIcon />
                {ready && count > 0 ? <span className="cart-count">{count}</span> : null}
              </Link>
            </div>
          </div>
          {searchOpen ? (
            <div className="header-search">
              <form action="/shop" role="search">
                <label htmlFor="site-search" className="hp">
                  Search products
                </label>
                <input id="site-search" type="search" name="q" placeholder="Search gowns, abayas, shoes…" autoFocus />
                <button className="btn btn-gold btn-small" type="submit">
                  Search
                </button>
              </form>
            </div>
          ) : null}
          {menuOpen ? (
            <nav className="mobile-menu" aria-label="Mobile">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <Link href="/faq" onClick={() => setMenuOpen(false)}>
                FAQ
              </Link>
            </nav>
          ) : null}
        </div>
      </header>
    </>
  );
}
