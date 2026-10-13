import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: "%s | Sinte's Hub admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-body admin-shell">{children}</div>;
}
