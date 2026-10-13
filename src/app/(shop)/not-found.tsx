import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container center" style={{ padding: '64px 16px' }}>
      <h1>Page not found</h1>
      <p className="muted">This page or product may have been moved or is no longer available.</p>
      <Link className="btn" href="/shop">
        Go to the shop
      </Link>
    </div>
  );
}
