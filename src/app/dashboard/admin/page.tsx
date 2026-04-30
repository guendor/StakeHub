import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import AdminClient from './AdminClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch audit logs
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*, admin:profiles!audit_logs_admin_id_fkey(display_name), target_user:profiles!audit_logs_target_user_id_fkey(display_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="container">
      <div className={`page-header ${styles.header}`}>
        <div>
          <p className="section-label">Administração</p>
          <h1>Painel Admin</h1>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Gerenciamento de Clubes e Plataforma
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-outline">
          Voltar ao Dashboard
        </Link>
      </div>

      <div className={styles.content}>
        <AdminClient initialProfiles={allProfiles ?? []} initialLogs={auditLogs ?? []} />
      </div>
    </div>
  );
}
