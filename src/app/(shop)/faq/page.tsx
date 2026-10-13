import type { Metadata } from 'next';
import { DEFAULT_FAQ } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Frequently asked questions' };

export default async function FaqPage() {
  const s = await getSettings();
  const faq = s.faq.length ? s.faq : DEFAULT_FAQ;
  return (
    <div className="container">
      <div className="page-head">
        <h1>Frequently asked questions</h1>
        <hr className="divider" />
      </div>
      <div className="prose detail-list">
        {faq.map((f, i) => (
          <details key={i} open={i === 0}>
            <summary>{f.q}</summary>
            <p style={{ whiteSpace: 'pre-line' }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
