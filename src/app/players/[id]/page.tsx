import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { computeListingValues, type Listing, type Trophy } from '@/types';
import ListingCard from '@/components/ListingCard';
import type { Metadata } from 'next';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('display_name').eq('id', id).single();
  return { title: data?.display_name ?? 'Jogador' };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  const { data: rawListings } = await supabase
    .from('listings')
    .select('*, profiles(*), interests(id, quotas_wanted)')
    .eq('player_id', id)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const listings: Listing[] = (rawListings ?? []).map(computeListingValues);

  const { data: trophies } = await supabase
    .from('trophies')
    .select('*')
    .eq('player_id', id)
    .order('tournament_date', { ascending: false });

  return (
    <div className="container-sm">
      <div style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
        {/* Profile header */}
        <div className={`card ${styles.profileHeader}`}>
          <div className={styles.avatarWrap}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.name}>
              {profile.display_name}
              {profile.nickname && <span className={styles.nickname}> ({profile.nickname})</span>}
            </h1>
            <span className={`badge ${profile.role === 'player' ? 'badge-player' : 'badge-backer'}`}>
              {profile.role === 'player' ? '🃏 Jogador' : '💼 Investidor'}
            </span>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            {/* Achievements */}
            {profile.achievements && profile.achievements.length > 0 && (
              <div className={styles.achievements}>
                {profile.achievements.map((a: string, i: number) => (
                  <span key={i} className={styles.achievement}>🏆 {a}</span>
                ))}
              </div>
            )}

            {/* External links */}
            {profile.external_links && profile.external_links.length > 0 && (
              <div className={styles.links}>
                {profile.external_links.map((link: { label: string; url: string }, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    🔗 {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trophy Showcase */}
        {profile.role === 'player' && trophies && trophies.length > 0 && (
          <div style={{ marginTop: 'var(--space-8)' }}>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>🏆 Vitrine de Troféus</h2>
            <div className={styles.trophyGrid}>
              {trophies.map((trophy: Trophy) => (
                <div key={trophy.id} className={`card ${styles.trophyCard}`}>
                  <div className={styles.trophyImgWrap}>
                    <img src={trophy.photo_url} alt={trophy.tournament_name} className={styles.trophyImg} />
                    <span className={styles.trophyPlacement}>{trophy.placement}</span>
                  </div>
                  <div className={styles.trophyInfo}>
                    <h4 className={styles.trophyName}>{trophy.tournament_name}</h4>
                    <div className={styles.trophyMeta}>
                      <span>📅 {new Date(trophy.tournament_date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                      {trophy.prize_amount && (
                        <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>
                          {trophy.prize_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open listings */}
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h2 style={{ marginBottom: 'var(--space-6)' }}>
            Anúncios abertos ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🃏</div>
              <p>Nenhum anúncio aberto no momento.</p>
              <Link href="/marketplace" className="btn btn-outline">
                Ver marketplace completo
              </Link>
            </div>
          ) : (
            <div className="grid-2">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l} animate delay={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
