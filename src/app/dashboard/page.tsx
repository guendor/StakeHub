import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { computeListingValues, type Listing, type Interest } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import QuotaProgress from '@/components/QuotaProgress';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard',
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/auth/login');

  const isPlayer = profile.role === 'player';
  const isAdmin = profile.role === 'admin';

  if (profile.role === 'club') redirect('/dashboard/club');
  if (profile.role === 'admin') redirect('/dashboard/admin');

  let listings: Listing[] = [];
  let interests: Interest[] = [];

  if (isPlayer) {
    const { data } = await supabase
      .from('listings')
      .select('*, interests(id, quotas_wanted, backer_id, message, created_at, profiles(id, display_name, avatar_url)), club_tournaments(profiles(display_name))')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false });
    listings = (data ?? []).map(computeListingValues);
  } else {
    const { data } = await supabase
      .from('interests')
      .select('*, listings(*, profiles(id, display_name, avatar_url))')
      .eq('backer_id', user.id)
      .order('created_at', { ascending: false });
    interests = data ?? [];
  }

  return (
    <div className="container">
      {/* Header */}
      <div className={`page-header ${styles.header}`}>
        <div>
          <p className="section-label">Dashboard</p>
          <h1>Olá, {profile.display_name} 👋</h1>
          <p style={{ marginTop: 'var(--space-2)' }}>
            <span className={`badge ${isPlayer ? 'badge-player' : 'badge-backer'}`}>
              {isPlayer ? '🃏 Jogador' : '💼 Investidor'}
            </span>
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          {isPlayer && (
            <Link href="/dashboard/new-listing" className="btn btn-gold">
              + Novo anúncio
            </Link>
          )}
          <Link href="/dashboard/profile" className="btn btn-outline">
            Editar perfil
          </Link>
          <Link href={`/players/${user.id}`} className="btn btn-ghost">
            Ver perfil público
          </Link>
        </div>
      </div>

      {isPlayer ? (
        /* ── PLAYER VIEW ── */
        <div className={styles.content}>
          {listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>Nenhum anúncio ainda</h3>
              <p>Publique seu primeiro anúncio e comece a receber backers.</p>
              <Link href="/dashboard/new-listing" className="btn btn-gold">
                + Criar anúncio
              </Link>
            </div>
          ) : (
            <div className={styles.listingsList}>
              {listings.map((l) => {
                const interestCount = l.interests?.length ?? 0;
                return (
                  <div key={l.id} className={`card ${styles.listingRow}`}>
                    <div className={styles.listingMain}>
                      <div className={styles.listingTitle}>
                        <StatusBadge status={l.status} />
                        <h3 className={styles.listingName}>{l.tournament_name}</h3>
                      </div>
                      <p className={styles.listingMeta}>
                        📅 {formatDate(l.tournament_date)}
                        {l.venue && <> · 📍 {l.venue}</>}
                      </p>
                      <div className={styles.listingStats}>
                        <span>Buy-in: <strong>{formatBRL(l.buy_in)}</strong></span>
                        <span>Preço/cota: <strong style={{ color: 'var(--color-gold)' }}>{formatBRL(l.price_per_quota ?? 0)}</strong></span>
                        <span>Interesses: <strong style={{ color: 'var(--color-accent)' }}>{interestCount}</strong></span>
                      </div>
                      <div style={{ maxWidth: 300 }}>
                        <QuotaProgress total={l.total_quotas} taken={l.quotas_taken ?? 0} />
                      </div>
                    </div>
                    <div className={styles.listingActions}>
                      <Link href={`/listings/${l.id}`} className="btn btn-ghost btn-sm">
                        Ver anúncio
                      </Link>
                      <Link href={`/dashboard/listing/${l.id}`} className="btn btn-outline btn-sm">
                        Editar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── BACKER VIEW ── */
        <div className={styles.content}>
          {interests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔎</div>
              <h3>Nenhum interesse registrado</h3>
              <p>Explore o marketplace e registre interesse nas cotas que te interessarem.</p>
              <Link href="/marketplace" className="btn btn-primary">
                Explorar marketplace
              </Link>
            </div>
          ) : (
            <div className={styles.listingsList}>
              {interests.map((interest) => {
                const l = interest.listings ? computeListingValues(interest.listings as Listing) : null;
                return (
                  <div key={interest.id} className={`card ${styles.listingRow}`}>
                    <div className={styles.listingMain}>
                      {l && <StatusBadge status={l.status} />}
                      <h3 className={styles.listingName}>{l?.tournament_name ?? 'Anúncio'}</h3>
                      {l && (
                        <div className={styles.listingStats}>
                          <span>Cotas desejadas: <strong>{interest.quotas_wanted}</strong></span>
                          <span>Total: <strong style={{ color: 'var(--color-gold)' }}>{formatBRL((l.price_per_quota ?? 0) * interest.quotas_wanted)}</strong></span>
                          {l.venue && <span>📍 {l.venue}</span>}
                        </div>
                      )}
                      {interest.message && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                          &ldquo;{interest.message}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className={styles.listingActions}>
                      {l && (
                        <Link href={`/listings/${l.id}`} className="btn btn-outline btn-sm">
                          Ver anúncio
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
