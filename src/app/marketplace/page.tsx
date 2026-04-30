import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { computeListingValues, type Listing } from '@/types';
import ListingCard from '@/components/ListingCard';
import FilterBar from '@/components/FilterBar';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Explore anúncios de staking de poker no Brasil. Filtre por status, buy-in e data.',
};

interface SearchParams {
  status?: string;
  min_buyin?: string;
  max_buyin?: string;
  date_from?: string;
}

async function ListingsGrid({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();

  let query = supabase
    .from('listings')
    .select('*, profiles(*), interests(id, quotas_wanted), club_tournaments(profiles(display_name))')
    .order('created_at', { ascending: false });

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.min_buyin) {
    query = query.gte('buy_in', Number(searchParams.min_buyin));
  }
  if (searchParams.max_buyin) {
    query = query.lte('buy_in', Number(searchParams.max_buyin));
  }
  if (searchParams.date_from) {
    query = query.gte('tournament_date', searchParams.date_from);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="alert alert-error">
        Erro ao carregar anúncios. Tente novamente.
      </div>
    );
  }

  const listings: Listing[] = (data ?? []).map(computeListingValues);

  if (listings.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🃏</div>
        <h3>Nenhum anúncio encontrado</h3>
        <p>Tente ajustar os filtros ou volte mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="grid-3">
      {listings.map((l, i) => (
        <ListingCard key={l.id} listing={l} animate delay={i} />
      ))}
    </div>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  return (
    <div className="container">
      <div className="page-header">
        <p className="section-label">Marketplace</p>
        <h1>Anúncios de Staking</h1>
        <p style={{ marginTop: 'var(--space-3)', maxWidth: 560 }}>
          Encontre oportunidades de staking em torneios de poker ao vivo e online.
          Filtre por status, buy-in e data para encontrar o deal ideal.
        </p>
      </div>

      <div className={styles.filterWrap}>
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 280, borderRadius: 'var(--radius-lg)' }}
              />
            ))}
          </div>
        }
      >
        <ListingsGrid searchParams={sp} />
      </Suspense>
    </div>
  );
}
