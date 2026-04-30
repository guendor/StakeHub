import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { computeListingValues } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import QuotaProgress from '@/components/QuotaProgress';
import InterestForm from './InterestForm';
import type { Metadata } from 'next';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('listings').select('tournament_name').eq('id', id).single();
  return {
    title: data?.tournament_name ?? 'Anúncio',
  };
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: raw } = await supabase
    .from('listings')
    .select('*, profiles(*), interests(*, profiles(id, display_name, avatar_url, role))')
    .eq('id', id)
    .single();

  if (!raw) notFound();

  const listing = computeListingValues(raw);
  const isOwner = user?.id === listing.player_id;
  const hasInterest = listing.interests?.some((i) => i.backer_id === user?.id);

  return (
    <div className="container-sm">
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/marketplace">← Marketplace</Link>
        <span>/</span>
        <span>{listing.tournament_name}</span>
      </div>

      <div className={styles.layout}>
        {/* Main */}
        <div className={styles.main}>
          {/* Header */}
          <div className={`card ${styles.headerCard}`}>
            <div className={styles.titleRow}>
              <div>
                <StatusBadge status={listing.status} />
                <h1 className={styles.title}>{listing.tournament_name}</h1>
                {listing.venue && <p className={styles.meta}>📍 {listing.venue}</p>}
                <p className={styles.meta}>📅 {formatDate(listing.tournament_date)}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className="stat-box">
                <div className="stat-label">Buy-in</div>
                <div className="stat-value">{formatBRL(listing.buy_in)}</div>
              </div>
              {listing.addon > 0 && (
                <div className="stat-box">
                  <div className="stat-label">Add-on</div>
                  <div className="stat-value">{formatBRL(listing.addon)}</div>
                </div>
              )}
              {listing.other_fees > 0 && (
                <div className="stat-box">
                  <div className="stat-label">Outras taxas</div>
                  <div className="stat-value">{formatBRL(listing.other_fees)}</div>
                </div>
              )}
              <div className="stat-box">
                <div className="stat-label">Custo total</div>
                <div className="stat-value accent">{formatBRL(listing.total_cost ?? 0)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Markup</div>
                <div className="stat-value">{listing.pct_per_quota}%</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Preço por cota</div>
                <div className="stat-value gold">{formatBRL(listing.price_per_quota ?? 0)}</div>
              </div>
              {listing.guaranteed_prize && (
                <div className="stat-box">
                  <div className="stat-label">Premiação garantida</div>
                  <div className="stat-value">{formatBRL(listing.guaranteed_prize)}</div>
                </div>
              )}
            </div>

            {/* Quota progress */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                DISPONIBILIDADE DE COTAS
              </p>
              <QuotaProgress
                total={listing.total_quotas}
                taken={listing.quotas_taken ?? 0}
              />
            </div>

            {listing.notes && (
              <div className={styles.notes}>
                <p className={styles.notesLabel}>Observações do jogador</p>
                <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{listing.notes}</p>
              </div>
            )}
          </div>

          {/* Interests list (owner only) */}
          {isOwner && listing.interests && listing.interests.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 style={{ marginBottom: 'var(--space-5)' }}>
                Interesses recebidos ({listing.interests.length})
              </h3>
              <div className={styles.interestList}>
                {listing.interests.map((interest) => (
                  <div key={interest.id} className={styles.interestItem}>
                    <div className={styles.interestAvatar}>
                      {interest.profiles?.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {interest.profiles?.display_name}
                      </p>
                      {interest.message && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {interest.message}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--color-gold)', fontSize: '0.95rem' }}>
                        {interest.quotas_wanted} cota{interest.quotas_wanted > 1 ? 's' : ''}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatBRL((listing.price_per_quota ?? 0) * interest.quotas_wanted)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Player card */}
          {listing.profiles && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: 'var(--space-4)' }}>Jogador</p>
              <div className={styles.playerCard}>
                <div className={styles.playerAvatar}>
                  {listing.profiles.avatar_url ? (
                    <img src={listing.profiles.avatar_url} alt={listing.profiles.display_name} />
                  ) : (
                    <span>{listing.profiles.display_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {listing.profiles.display_name}
                  </p>
                  <span className="badge badge-player">Jogador</span>
                </div>
              </div>
              {listing.profiles.bio && (
                <p style={{ fontSize: '0.85rem', marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                  {listing.profiles.bio}
                </p>
              )}
              <Link href={`/players/${listing.player_id}`} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-4)', width: '100%' }}>
                Ver perfil completo
              </Link>
            </div>
          )}

          {/* Interest form */}
          {!isOwner && listing.status === 'open' && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              {!user ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
                    Faça login para registrar interesse nas cotas.
                  </p>
                  <Link href={`/auth/login?redirect=/listings/${id}`} className="btn btn-primary" style={{ width: '100%' }}>
                    Entrar / Cadastrar
                  </Link>
                </div>
              ) : hasInterest ? (
                <div className="alert alert-success">
                  ✓ Você já registrou interesse neste anúncio.
                </div>
              ) : (
                <InterestForm
                  listingId={listing.id}
                  maxQuotas={listing.total_quotas - (listing.quotas_taken ?? 0)}
                  pricePerQuota={listing.price_per_quota ?? 0}
                />
              )}
            </div>
          )}

          {isOwner && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Este é o seu anúncio.
              </p>
              <Link
                href={`/dashboard/listing/${listing.id}`}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                Editar anúncio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
