'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClubTournament, Listing, Interest, Profile } from '@/types';
import styles from './ClubClient.module.css';

type FullListing = Listing & {
  profiles?: Profile;
  interests?: (Interest & { profiles?: Profile })[];
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClubClient({
  initialTournaments,
  listings,
  isVerified
}: {
  initialTournaments: ClubTournament[];
  listings: FullListing[];
  isVerified: boolean;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<'list' | 'new' | 'manage'>('list');
  const [tournaments, setTournaments] = useState<ClubTournament[]>(initialTournaments);
  const [selectedTournament, setSelectedTournament] = useState<ClubTournament | null>(null);

  // New Tournament State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    date: '',
    buy_in: '',
    guaranteed_prize: '',
  });

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!isVerified) return;
    setLoading(true); setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: err } = await supabase.from('club_tournaments').insert({
      club_id: user.id,
      name: form.name,
      date: form.date,
      buy_in: parseFloat(form.buy_in),
      guaranteed_prize: form.guaranteed_prize ? parseFloat(form.guaranteed_prize) : null,
    }).select().single();

    if (err) { setError(err.message); setLoading(false); return; }

    setTournaments([data, ...tournaments]);
    setForm({ name: '', date: '', buy_in: '', guaranteed_prize: '' });
    setTab('list');
    setLoading(false);
  }

  function renderManagementPanel() {
    if (!selectedTournament) return null;

    const tournamentListings = listings.filter(l => l.club_tournament_id === selectedTournament.id);
    let totalCollected = 0;
    let totalToPlayers = 0;

    return (
      <div className={styles.managePanel}>
        <div className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab('list')}>← Voltar</button>
          <h3 style={{ margin: 0 }}>Gestão: {selectedTournament.name}</h3>
        </div>

        {tournamentListings.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum anúncio vinculado a este torneio ainda.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Investidor</th>
                  <th>Cotas</th>
                  <th>Receber do Investidor</th>
                  <th>Repassar ao Jogador</th>
                </tr>
              </thead>
              <tbody>
                {tournamentListings.map(listing => {
                  const interests = listing.interests ?? [];
                  const pricePerQuota = ((listing.buy_in + listing.addon + listing.other_fees) * (1 + listing.pct_per_quota / 100)) / listing.total_quotas;
                  const originalCostPerQuota = (listing.buy_in + listing.addon + listing.other_fees) / listing.total_quotas;

                  if (interests.length === 0) return null;

                  return interests.map(interest => {
                    const investorToPay = pricePerQuota * interest.quotas_wanted;
                    const clubKeepsBuyIn = originalCostPerQuota * interest.quotas_wanted; // Club keeps the buyin part
                    const passToPlayer = investorToPay - clubKeepsBuyIn; // The markup goes to player
                    
                    // Note: Actually, if the club manages it, the club collects total price, 
                    // pays itself the buy-in, and passes the profit (markup) to the player.
                    
                    totalCollected += investorToPay;
                    totalToPlayers += passToPlayer;

                    return (
                      <tr key={interest.id}>
                        <td>{listing.profiles?.display_name ?? 'Desconhecido'}</td>
                        <td>{interest.profiles?.display_name ?? 'Desconhecido'}</td>
                        <td>{interest.quotas_wanted} / {listing.total_quotas}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatBRL(investorToPay)}</td>
                        <td style={{ color: 'var(--color-gold)' }}>{formatBRL(passToPlayer)}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.totals}>
          <div className="stat-box">
            <div className="stat-label">Total a Arrecadar</div>
            <div className="stat-value success">{formatBRL(totalCollected)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Total em Buy-ins (Clube)</div>
            <div className="stat-value">{formatBRL(totalCollected - totalToPlayers)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Repasse aos Jogadores</div>
            <div className="stat-value gold">{formatBRL(totalToPlayers)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'list' ? styles.tabActive : ''}`}
          onClick={() => setTab('list')}
        >
          Meus Torneios
        </button>
        <button
          className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`}
          onClick={() => setTab('new')}
          disabled={!isVerified}
        >
          + Novo Torneio Oficial
        </button>
      </div>

      <div className="card">
        {tab === 'list' && (
          <div className="flex flex-col gap-4">
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Torneios Oficiais</h3>
            {tournaments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <p>Você ainda não possui torneios criados.</p>
                {isVerified && (
                  <button className="btn btn-gold" onClick={() => setTab('new')}>Criar o primeiro</button>
                )}
              </div>
            ) : (
              <div className={styles.grid}>
                {tournaments.map(t => (
                  <div key={t.id} className={styles.tournamentCard}>
                    <div className="flex justify-between items-start">
                      <h4>{t.name}</h4>
                      <span className={`badge ${t.is_active ? 'badge-player' : 'badge-backer'}`}>
                        {t.is_active ? 'Ativo' : 'Encerrado'}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      <span>📅 {formatDate(t.date)}</span>
                      <span>Buy-in: <strong>{formatBRL(t.buy_in)}</strong></span>
                      {t.guaranteed_prize && <span>Garantido: <strong style={{ color: 'var(--color-gold)' }}>{formatBRL(t.guaranteed_prize)}</strong></span>}
                    </div>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginTop: 'var(--space-3)', width: '100%' }}
                      onClick={() => { setSelectedTournament(t); setTab('manage'); }}
                    >
                      Painel de Gestão
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'new' && (
          <form onSubmit={handleCreateTournament} className="flex flex-col gap-4">
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Criar Torneio Oficial</h3>
            <div className="form-group">
              <label className="form-label">Nome do Torneio *</label>
              <input required type="text" className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="ex: Main Event 50K GTD" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input required type="date" className="form-input" style={{ colorScheme: 'dark' }} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Buy-in (R$) *</label>
                <input required type="number" min={0} step={0.01} className="form-input" value={form.buy_in} onChange={e => setForm({...form, buy_in: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Premiação Garantida (R$)</label>
              <input type="number" min={0} step={0.01} className="form-input" value={form.guaranteed_prize} onChange={e => setForm({...form, guaranteed_prize: e.target.value})} placeholder="Opcional" />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Criando...' : 'Publicar Torneio'}
            </button>
          </form>
        )}

        {tab === 'manage' && renderManagementPanel()}
      </div>
    </div>
  );
}
