'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function InterestActionButtons({ interestId, currentStatus }: { interestId: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  if (currentStatus === 'accepted') {
    return <span className="badge badge-player" style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>Aceito ✅</span>;
  }
  
  if (currentStatus === 'rejected') {
    return <span className="badge badge-player" style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}>Recusado ❌</span>;
  }

  async function handleAccept() {
    if (!confirm('Tem certeza? Isso transferirá as fichas do investidor.')) return;
    setLoading(true);
    const { error } = await supabase.rpc('accept_staking_interest', { p_interest_id: interestId });
    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function handleReject() {
    if (!confirm('Recusar esta proposta?')) return;
    setLoading(true);
    const { error } = await supabase.rpc('reject_staking_interest', { p_interest_id: interestId });
    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
      <button 
        className="btn btn-sm btn-gold" 
        onClick={handleAccept} 
        disabled={loading}
      >
        {loading ? '...' : 'Aceitar'}
      </button>
      <button 
        className="btn btn-sm btn-outline" 
        style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        onClick={handleReject} 
        disabled={loading}
      >
        {loading ? '...' : 'Recusar'}
      </button>
    </div>
  );
}
