import Link from 'next/link';
import { type Listing } from '@/types';
import { computeListingValues } from '@/types';
import StatusBadge from './StatusBadge';
import QuotaProgress from './QuotaProgress';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  listing: Listing;
  animate?: boolean;
  delay?: number;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ListingCard({ listing, animate, delay = 0 }: ListingCardProps) {
  const l = computeListingValues(listing);

  return (
    <Link
      href={`/listings/${l.id}`}
      className={`card card-interactive ${styles.card} ${animate ? 'animate-fade-up' : ''}`}
      style={animate ? { animationDelay: `${delay * 0.08}s` } : {}}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{l.tournament_name}</h3>
          <StatusBadge status={l.status} />
        </div>
        {l.venue && (
          <p className={styles.venue}>📍 {l.venue}</p>
        )}
        <p className={styles.date}>📅 {formatDate(l.tournament_date)}</p>
      </div>

      <div className={styles.divider} />

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Buy-in</span>
          <span className={styles.statValue}>{formatBRL(l.buy_in)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Custo total</span>
          <span className={`${styles.statValue} ${styles.accent}`}>{formatBRL(l.total_cost ?? 0)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Preço/cota</span>
          <span className={`${styles.statValue} ${styles.gold}`}>{formatBRL(l.price_per_quota ?? 0)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Markup</span>
          <span className={styles.statValue}>{l.pct_per_quota}%</span>
        </div>
      </div>

      {/* Quota Progress */}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <QuotaProgress total={l.total_quotas} taken={l.quotas_taken ?? 0} />
      </div>

      {/* Player */}
      {l.profiles && (
        <div className={styles.playerRow}>
          <div className={styles.avatar}>
            {l.profiles.avatar_url ? (
              <img src={l.profiles.avatar_url} alt={l.profiles.display_name} />
            ) : (
              <span>{l.profiles.display_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className={styles.playerName}>{l.profiles.display_name}</p>
            <span className="badge badge-player">Jogador</span>
          </div>
        </div>
      )}
    </Link>
  );
}
