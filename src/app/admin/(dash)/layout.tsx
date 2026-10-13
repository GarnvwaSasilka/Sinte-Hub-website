import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import SignOutButton from '@/components/admin/SignOutButton';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <>
      <header className="admin-top">
        <div className="container">
          <div className="header-inner">
            <Link href="/admin" className="brand">
              <img src="/monogram.png" alt="" width={40} height={37} style={{ height: 36 }} />
              <span style={{ fontSize: '1rem' }}>Dashboard</span>
            </Link>
            <div className="header-actions">
              <span className="small" style={{ color: '#b9b0a2', display: 'none' }}>{user.email}</span>
              <Link href="/" className="small" style={{ color: 'var(--cream)', marginRight: 8 }} target="_blank">
                View shop
              </Link>
              <SignOutButton />
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="admin-main container">{children}</main>
    </>
  );
}
