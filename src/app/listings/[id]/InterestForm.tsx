'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './InterestForm.module.css';

interface Props {
  listingId: string;
  maxQuotas: number;
  pricePerQuota: number;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InterestForm({ listingId, maxQuotas, pricePerQuota }: Props) {
  const [quotas, setQuotas] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (!profile) { setError('Erro ao carregar perfil.'); setLoading(false); return; }

    const totalCost = quotas * pricePerQuota;
    if (profile.balance < totalCost) {
      setError(`Saldo insuficiente. Você tem ${formatBRL(profile.balance)} e a proposta custa ${formatBRL(totalCost)}.`);
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.from('interests').insert({
      listing_id: listingId,
      backer_id: user.id,
      quotas_wanted: quotas,
      message: message.trim() || null,
      payment_stub: null, // reserved for future payment integration
      status: 'pending'
    });

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="alert alert-success" style={{ flexDirection: 'column' }}>
        <strong>✓ Interesse registrado!</strong>
        <p style={{ marginTop: 4, fontSize: '0.85rem' }}>
          O jogador receberá sua solicitação. Combinem os detalhes de pagamento diretamente.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.title}>Registrar interesse</h3>

      <div className={styles.preview}>
        <span>{quotas} cota{quotas > 1 ? 's' : ''} × {formatBRL(pricePerQuota)}</span>
        <strong style={{ color: 'var(--color-gold)' }}>{formatBRL(quotas * pricePerQuota)}</strong>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="interest-quotas">Quantidade de cotas</label>
        <div className={styles.quotaControl}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setQuotas(q => Math.max(1, q - 1))}
            disabled={quotas <= 1}
          >−</button>
          <span className={styles.quotaNum}>{quotas}</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setQuotas(q => Math.min(maxQuotas, q + 1))}
            disabled={quotas >= maxQuotas}
          >+</button>
        </div>
        <span className="form-hint">{maxQuotas} cota{maxQuotas !== 1 ? 's' : ''} disponível{maxQuotas !== 1 ? 'is' : ''}</span>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="interest-message">Mensagem (opcional)</label>
        <textarea
          id="interest-message"
          className="form-textarea"
          placeholder="Apresente-se ou deixe uma mensagem para o jogador..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-gold"
        style={{ width: '100%' }}
        disabled={loading}
        id="submit-interest"
      >
        {loading ? 'Registrando...' : '🤝 Registrar interesse'}
      </button>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Pagamentos são combinados diretamente entre as partes.
      </p>
    </form>
  );
}
