'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

function formatBRL(value: number) {
  return isNaN(value) || !isFinite(value)
    ? 'R$ —'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tournament_name: '',
    tournament_date: '',
    venue: '',
    buy_in: '',
    addon: '0',
    other_fees: '0',
    guaranteed_prize: '',
    total_quotas: '10',
    pct_per_quota: '0',
    notes: '',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Live calculations
  const calcs = useMemo(() => {
    const buyIn = parseFloat(form.buy_in) || 0;
    const addon = parseFloat(form.addon) || 0;
    const fees = parseFloat(form.other_fees) || 0;
    const quotas = parseInt(form.total_quotas) || 1;
    const pct = parseFloat(form.pct_per_quota) || 0;
    const total_cost = buyIn + addon + fees;
    const price_per_quota = (total_cost * (1 + pct / 100)) / quotas;
    return { total_cost, price_per_quota };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada.'); setLoading(false); return; }

    const { data, error: err } = await supabase.from('listings').insert({
      player_id: user.id,
      tournament_name: form.tournament_name,
      tournament_date: form.tournament_date,
      venue: form.venue || null,
      buy_in: parseFloat(form.buy_in),
      addon: parseFloat(form.addon) || 0,
      other_fees: parseFloat(form.other_fees) || 0,
      guaranteed_prize: form.guaranteed_prize ? parseFloat(form.guaranteed_prize) : null,
      total_quotas: parseInt(form.total_quotas),
      pct_per_quota: parseFloat(form.pct_per_quota) || 0,
      notes: form.notes || null,
      status: 'open',
    }).select('id').single();

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/listings/${data!.id}`);
  }

  return (
    <div className="container-sm">
      <div className="page-header">
        <p className="section-label">Dashboard</p>
        <h1>Novo anúncio de staking</h1>
        <p style={{ marginTop: 'var(--space-3)' }}>
          Preencha os dados do torneio. Os valores são calculados automaticamente.
        </p>
      </div>

      <div className={styles.layout}>
        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Dados do torneio</h3>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="tournament-name">Nome do torneio *</label>
                <input
                  id="tournament-name"
                  type="text"
                  className="form-input"
                  placeholder="ex: BSOP Main Event São Paulo"
                  value={form.tournament_name}
                  onChange={(e) => set('tournament_name', e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="tournament-date">Data do torneio *</label>
                  <input
                    id="tournament-date"
                    type="date"
                    className="form-input"
                    style={{ colorScheme: 'dark' }}
                    value={form.tournament_date}
                    onChange={(e) => set('tournament_date', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="venue">Local / Casino</label>
                  <input
                    id="venue"
                    type="text"
                    className="form-input"
                    placeholder="ex: WTC São Paulo"
                    value={form.venue}
                    onChange={(e) => set('venue', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Valores financeiros</h3>
            <div className="flex flex-col gap-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="buy-in">Buy-in (R$) *</label>
                  <input
                    id="buy-in"
                    type="number"
                    min={0}
                    step={0.01}
                    className="form-input"
                    placeholder="ex: 3200"
                    value={form.buy_in}
                    onChange={(e) => set('buy_in', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="addon">Add-on (R$)</label>
                  <input
                    id="addon"
                    type="number"
                    min={0}
                    step={0.01}
                    className="form-input"
                    placeholder="0"
                    value={form.addon}
                    onChange={(e) => set('addon', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="other-fees">Outras taxas (R$)</label>
                  <input
                    id="other-fees"
                    type="number"
                    min={0}
                    step={0.01}
                    className="form-input"
                    placeholder="0"
                    value={form.other_fees}
                    onChange={(e) => set('other_fees', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="guaranteed-prize">Premiação garantida (R$)</label>
                  <input
                    id="guaranteed-prize"
                    type="number"
                    min={0}
                    step={0.01}
                    className="form-input"
                    placeholder="Opcional"
                    value={form.guaranteed_prize}
                    onChange={(e) => set('guaranteed_prize', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Configuração das cotas</h3>
            <div className="flex flex-col gap-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="total-quotas">Número de cotas *</label>
                  <input
                    id="total-quotas"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    className="form-input"
                    value={form.total_quotas}
                    onChange={(e) => set('total_quotas', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pct-markup">Markup (%) por cota</label>
                  <input
                    id="pct-markup"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="form-input"
                    placeholder="0"
                    value={form.pct_per_quota}
                    onChange={(e) => set('pct_per_quota', e.target.value)}
                  />
                  <span className="form-hint">% acima do custo real por cota</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="notes">Observações</label>
                <textarea
                  id="notes"
                  className="form-textarea"
                  placeholder="Informações adicionais para os investidores..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-gold"
              disabled={loading}
              id="new-listing-submit"
            >
              {loading ? 'Publicando...' : '🎯 Publicar anúncio'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push('/dashboard')}
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Preview sidebar */}
        <div className={styles.preview}>
          <div className="card">
            <p className="section-label" style={{ marginBottom: 'var(--space-4)' }}>Pré-visualização</p>
            <div className="flex flex-col gap-3">
              <div className="stat-box">
                <div className="stat-label">Custo total</div>
                <div className="stat-value accent">{formatBRL(calcs.total_cost)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Preço por cota</div>
                <div className="stat-value gold">{formatBRL(calcs.price_per_quota)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total de cotas</div>
                <div className="stat-value">{form.total_quotas || '—'}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Receita potencial</div>
                <div className="stat-value">
                  {formatBRL(calcs.price_per_quota * (parseInt(form.total_quotas) || 0))}
                </div>
              </div>
            </div>
            <div className={styles.previewNote}>
              <span>ℹ️</span>
              Pagamentos são combinados diretamente com os investidores.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
