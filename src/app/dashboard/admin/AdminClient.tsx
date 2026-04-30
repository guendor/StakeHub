'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import styles from './AdminClient.module.css';

export default function AdminClient({ initialClubs }: { initialClubs: Profile[] }) {
  const [clubs, setClubs] = useState<Profile[]>(initialClubs);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  async function toggleVerification(club: Profile) {
    setLoadingId(club.id);
    const newStatus = !club.is_verified;

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: newStatus })
      .eq('id', club.id);

    if (!error) {
      setClubs(clubs.map(c => c.id === club.id ? { ...c, is_verified: newStatus } : c));
    } else {
      alert(`Erro: ${error.message}`);
    }
    setLoadingId(null);
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--space-4)' }}>Gestão de Clubes</h3>
      {clubs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏛️</div>
          <p>Nenhum clube cadastrado ainda.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / Apelido</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.id}>
                  <td>
                    <strong>{club.display_name}</strong>
                    {club.nickname && <span style={{ color: 'var(--text-muted)' }}> ({club.nickname})</span>}
                  </td>
                  <td>
                    <span className={`badge ${club.is_verified ? 'badge-player' : 'badge-backer'}`} style={{ background: club.is_verified ? 'var(--color-success-dim)' : 'var(--color-surface-2)', color: club.is_verified ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {club.is_verified ? 'Verificado' : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => toggleVerification(club)}
                      disabled={loadingId === club.id}
                      style={{ borderColor: club.is_verified ? 'var(--color-danger)' : 'var(--color-success)', color: club.is_verified ? 'var(--color-danger)' : 'var(--color-success)' }}
                    >
                      {loadingId === club.id ? 'Aguarde...' : (club.is_verified ? 'Revogar Verificação' : 'Verificar Clube')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
