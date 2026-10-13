import SettingsForm from '@/components/admin/SettingsForm';
import { requireAdmin } from '@/lib/auth';
import type { StoreSettings } from '@/lib/types';

export default async function SettingsPage() {
  const { supabase, user } = await requireAdmin();
  const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
  return (
    <div className="stack">
      <h1>Store settings</h1>
      <SettingsForm settings={data as StoreSettings} email={user.email ?? ''} />
    </div>
  );
}
