import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import ClubClient from './ClubClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard do Clube',
};

export default async function ClubDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'club') {
    redirect('/dashboard');
  }

  // Fetch their tournaments
  const { data: tournaments } = await supabase
    .from('club_tournaments')
    .select('*')
    .eq('club_id', user.id)
    .order('created_at', { ascending: false });

  // For the management panel, we need to fetch all listings linked to their tournaments
  // and the interests for those listings. We'll do this on the client side when a tournament is selected,
  // or pass all data. Let's pass the tournaments and let the client fetch the rest when needed,
  // or fetch it all here since it's an MVP and data size is small.
  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(*), interests(*, profiles(*))')
    .in('club_tournament_id', (tournaments ?? []).map(t => t.id));

  return (
    <div className="container">
      <div className={`page-header ${styles.header}`}>
        <div>
          <p className="section-label">Dashboard</p>
          <h1>Olá, {profile.display_name} 🏛️</h1>
          <p style={{ marginTop: 'var(--space-2)' }}>
            <span className={`badge ${profile.is_verified ? 'badge-player' : 'badge-backer'}`} style={{ background: profile.is_verified ? 'var(--color-success-dim)' : 'var(--color-surface-2)', color: profile.is_verified ? 'var(--color-success)' : 'var(--text-muted)' }}>
              {profile.is_verified ? '✅ Clube Verificado' : '⏳ Aguardando Verificação'}
            </span>
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard/profile" className="btn btn-outline">
            Editar perfil
          </Link>
          <Link href={`/players/${user.id}`} className="btn btn-ghost">
            Ver perfil público
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        {!profile.is_verified ? (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
            <strong>Conta não verificada.</strong> Você não pode publicar torneios oficiais até que um administrador verifique seu clube.
          </div>
        ) : null}
        <ClubClient initialTournaments={tournaments ?? []} listings={listings ?? []} isVerified={profile.is_verified} />
      </div>
    </div>
  );
}
