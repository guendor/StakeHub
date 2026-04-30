'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, AuditLog, UserRole } from '@/types';
import styles from './AdminClient.module.css';

function formatBRL(value: number) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function AdminClient({ 
  initialProfiles,
  initialLogs
}: { 
  initialProfiles: Profile[];
  initialLogs: AuditLog[];
}) {
  const [tab, setTab] = useState<'clubs' | 'users' | 'logs'>('clubs');
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase();
    const idMatch = p.platform_id?.toString().includes(term);
    const nameMatch = p.display_name?.toLowerCase().includes(term);
    const nickMatch = p.nickname?.toLowerCase().includes(term);
    return idMatch || nameMatch || nickMatch;
  });

  const clubs = filteredProfiles.filter(p => p.role === 'club');

  async function toggleVerification(club: Profile) {
    setLoadingId(club.id);
    const newStatus = !club.is_verified;

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: newStatus })
      .eq('id', club.id);

    if (!error) {
      setProfiles(profiles.map(c => c.id === club.id ? { ...c, is_verified: newStatus } : c));
      // Refresh logs manually if we wanted, but since they need a query, we'll just let them be stale until reload
      // or we can refetch logs. For MVP, reloading the page or fetching is best. Let's just refetch.
      fetchLogs();
    } else {
      alert(`Erro: ${error.message}`);
    }
    setLoadingId(null);
  }

  async function fetchLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, admin:profiles!audit_logs_admin_id_fkey(display_name), target_user:profiles!audit_logs_target_user_id_fkey(display_name)')
      .order('created_at', { ascending: false });
    if (data) setLogs(data as any);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setLoadingId('saving');

    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: editingUser.role,
        balance: editingUser.balance
      })
      .eq('id', editingUser.id);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setProfiles(profiles.map(p => p.id === editingUser.id ? editingUser : p));
      setEditingUser(null);
      fetchLogs();
    }
    setLoadingId(null);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'clubs' ? styles.tabActive : ''}`}
          onClick={() => setTab('clubs')}
        >
          Clubes Pendentes
        </button>
        <button
          className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setTab('users')}
        >
          Usuários
        </button>
        <button
          className={`${styles.tab} ${tab === 'logs' ? styles.tabActive : ''}`}
          onClick={() => setTab('logs')}
        >
          Histórico de Auditoria
        </button>
      </div>

      <div className="card">
        {tab === 'clubs' && (
          <>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Gestão de Clubes</h3>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar clube (Nome, ID...)" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>
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
                      <th>ID</th>
                      <th>Nome / Apelido</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubs.map((club) => (
                      <tr key={club.id}>
                        <td><span style={{ color: 'var(--text-muted)' }}>#{club.platform_id}</span></td>
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
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Todos os Usuários</h3>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar usuário (Nome, ID...)" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>
            {editingUser && (
              <div className={styles.editModal}>
                <h4>Editando {editingUser.display_name}</h4>
                <form onSubmit={handleSaveUser} className="flex flex-col gap-4" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Cargo (Role)</label>
                    <select 
                      className="form-input" 
                      value={editingUser.role} 
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                    >
                      <option value="player">Jogador</option>
                      <option value="backer">Investidor</option>
                      <option value="club">Clube</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saldo (R$)</label>
                    <input 
                      type="number" 
                      min={0} 
                      step={0.01} 
                      className="form-input" 
                      value={editingUser.balance} 
                      onChange={(e) => setEditingUser({...editingUser, balance: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="btn btn-gold" disabled={loadingId === 'saving'}>
                      {loadingId === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
            {!editingUser && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Cargo</th>
                      <th>Saldo</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((p) => (
                      <tr key={p.id}>
                        <td><span style={{ color: 'var(--text-muted)' }}>#{p.platform_id}</span></td>
                        <td>
                          {p.display_name}
                          {p.nickname && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.nickname}</div>}
                        </td>
                        <td><span className="badge badge-player">{p.role}</span></td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatBRL(p.balance)}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => setEditingUser(p)}>
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'logs' && (
          <>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Histórico de Auditoria</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Registros imutáveis de alterações sensíveis.
            </p>
            {logs.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum log registrado ainda.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Autor (Admin)</th>
                      <th>Alvo</th>
                      <th>Detalhes da Alteração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem' }}>{formatDate(log.created_at)}</td>
                        <td>{log.admin?.display_name ?? 'Sistema'}</td>
                        <td>{log.target_user?.display_name ?? 'Desconhecido'}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {log.old_data?.role !== log.new_data?.role && (
                              <span><strong>Role:</strong> {log.old_data?.role} ➔ <span style={{ color: 'var(--color-accent)' }}>{log.new_data?.role}</span></span>
                            )}
                            {log.old_data?.balance !== log.new_data?.balance && (
                              <span><strong>Saldo:</strong> {formatBRL(log.old_data?.balance)} ➔ <span style={{ color: 'var(--color-success)' }}>{formatBRL(log.new_data?.balance)}</span></span>
                            )}
                            {log.old_data?.is_verified !== log.new_data?.is_verified && (
                              <span><strong>Verificado:</strong> {log.old_data?.is_verified ? 'Sim' : 'Não'} ➔ <span style={{ color: 'var(--color-success)' }}>{log.new_data?.is_verified ? 'Sim' : 'Não'}</span></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
