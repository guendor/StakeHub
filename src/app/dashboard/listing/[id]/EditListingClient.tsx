'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Listing, ListingStatus } from '@/types';
import styles from './EditListingClient.module.css';

function formatBRL(value: number) {
  return isNaN(value) || !isFinite(value)
    ? 'R$ —'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'funded', label: 'Fundado' },
  { value: 'in_progress', label: 'Em jogo' },
  { value: 'settled', label: 'Encerrado' },
];

export default function EditListingClient({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    tournament_name: listing.tournament_name,
    tournament_date: listing.tournament_date,
    venue: listing.venue ?? '',
    buy_in: String(listing.buy_in),
    addon: String(listing.addon),
    other_fees: String(listing.other_fees),
    guaranteed_prize: listing.guaranteed_prize ? String(listing.guaranteed_prize) : '',
    total_quotas: String(listing.total_quotas),
    pct_per_quota: String(listing.pct_per_quota),
    status: listing.status as ListingStatus,
    notes: listing.notes ?? '',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('listings').update({
      tournament_name: form.tournament_name,
      tournament_date: form.tournament_date,
      venue: form.venue || null,
      buy_in: parseFloat(form.buy_in),
      addon: parseFloat(form.addon) || 0,
      other_fees: parseFloat(form.other_fees) || 0,
      guaranteed_prize: form.guaranteed_prize ? parseFloat(form.guaranteed_prize) : null,
      total_quotas: parseInt(form.total_quotas),
      pct_per_quota: parseFloat(form.pct_per_quota) || 0,
      status: form.status,
      notes: form.notes || null,
    }).eq('id', listing.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/listings/${listing.id}`);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('interests').delete().eq('listing_id', listing.id);
    await supabase.from('listings').delete().eq('id', listing.id);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="container-sm">
      <div className="page-header">
        <p className="section-label">
          <Link href="/dashboard">Dashboard</Link> / Editar anúncio
        </p>
        <h1>Editar anúncio</h1>
      </div>

      <div className={styles.layout}>
        <form onSubmit={handleSave} className={styles.form}>
          {/* Status */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Status do anúncio</h3>
            <div className={styles.statusGrid}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`${styles.statusBtn} ${form.status === s.value ? styles.statusBtnActive : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, status: s.value }))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Dados do torneio</h3>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Nome do torneio</label>
                <input id="edit-name" type="text" className="form-input" value={form.tournament_name} onChange={(e) => set('tournament_name', e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-date">Data</label>
                  <input id="edit-date" type="date" className="form-input" style={{ colorScheme: 'dark' }} value={form.tournament_date} onChange={(e) => set('tournament_date', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-venue">Local</label>
                  <input id="edit-venue" type="text" className="form-input" value={form.venue} onChange={(e) => set('venue', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Valores financeiros</h3>
            <div className="flex flex-col gap-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-buyin">Buy-in (R$)</label>
                  <input id="edit-buyin" type="number" min={0} step={0.01} className="form-input" value={form.buy_in} onChange={(e) => set('buy_in', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-addon">Add-on (R$)</label>
                  <input id="edit-addon" type="number" min={0} step={0.01} className="form-input" value={form.addon} onChange={(e) => set('addon', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-fees">Outras taxas (R$)</label>
                  <input id="edit-fees" type="number" min={0} step={0.01} className="form-input" value={form.other_fees} onChange={(e) => set('other_fees', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-prize">Premiação garantida (R$)</label>
                  <input id="edit-prize" type="number" min={0} step={0.01} className="form-input" value={form.guaranteed_prize} onChange={(e) => set('guaranteed_prize', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-quotas">Nº de cotas</label>
                  <input id="edit-quotas" type="number" min={1} max={100} className="form-input" value={form.total_quotas} onChange={(e) => set('total_quotas', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-markup">Markup (%)</label>
                  <input id="edit-markup" type="number" min={0} max={100} step={0.5} className="form-input" value={form.pct_per_quota} onChange={(e) => set('pct_per_quota', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-notes">Observações</label>
                <textarea id="edit-notes" className="form-textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="flex gap-4">
            <button type="submit" className="btn btn-gold" disabled={loading} id="edit-listing-save">
              {loading ? 'Salvando...' : '✓ Salvar alterações'}
            </button>
            <Link href={`/listings/${listing.id}`} className="btn btn-ghost">
              Cancelar
            </Link>
          </div>

          {/* Danger zone */}
          <div className={styles.danger}>
            <h4>Zona de perigo</h4>
            {confirmDelete ? (
              <div className="flex gap-3 items-center flex-wrap">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Tem certeza? Esta ação é irreversível.</p>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting} id="edit-confirm-delete">
                  {deleting ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(true)} style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} id="edit-delete-btn">
                Excluir anúncio
              </button>
            )}
          </div>
        </form>

        {/* Preview */}
        <div className={styles.preview}>
          <div className="card">
            <p className="section-label" style={{ marginBottom: 'var(--space-4)' }}>Preview</p>
            <div className="flex flex-col gap-3">
              <div className="stat-box">
                <div className="stat-label">Custo total</div>
                <div className="stat-value accent">{formatBRL(calcs.total_cost)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Preço por cota</div>
                <div className="stat-value gold">{formatBRL(calcs.price_per_quota)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
