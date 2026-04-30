'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './AuthClient.module.css';

type Tab = 'login' | 'signup';
type Role = 'player' | 'backer' | 'club';

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'login');
  const [role, setRole] = useState<Role>((searchParams.get('role') as Role) ?? 'player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const supabase = createClient();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup') setTab('signup');
    const roleParam = searchParams.get('role');
    if (roleParam === 'backer') setRole('backer');
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push(redirect);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        display_name: name.trim() || email.split('@')[0],
      });
    }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={`card ${styles.card}`}>
        <div className={styles.logoWrap}>
          <span className={styles.logoIcon}>♠</span>
          <span className={styles.logoText}>Stake<span style={{ color: 'var(--color-accent)' }}>Hub</span></span>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
            id="auth-tab-login"
          >
            Entrar
          </button>
          <button
            className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
            id="auth-tab-signup"
          >
            Criar conta
          </button>
        </div>

        {success ? (
          <div className="alert alert-success">{success}</div>
        ) : tab === 'login' ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">E-mail</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
              id="auth-submit-login"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className={styles.form}>
            <div className={styles.roleSelector}>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'player' ? styles.roleBtnActive : ''}`}
                onClick={() => setRole('player')}
                id="auth-role-player"
              >
                <span className={styles.roleIcon}>♠</span>
                <span className={styles.roleLabel}>Sou Jogador</span>
                <span className={styles.roleDesc}>Quero vender cotas</span>
              </button>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'backer' ? styles.roleBtnActive : ''}`}
                onClick={() => setRole('backer')}
                id="auth-role-backer"
              >
                <span className={styles.roleIcon}>💼</span>
                <span className={styles.roleLabel}>Sou Investidor</span>
                <span className={styles.roleDesc}>Quero comprar cotas</span>
              </button>
              <button
                type="button"
                className={`${styles.roleBtn} ${role === 'club' ? styles.roleBtnActive : ''}`}
                onClick={() => setRole('club')}
                id="auth-role-club"
              >
                <span className={styles.roleIcon}>🏛️</span>
                <span className={styles.roleLabel}>Sou um Clube</span>
                <span className={styles.roleDesc}>Organizo torneios</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name">Nome de exibição</label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                placeholder="Seu apelido ou nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-signup-email">E-mail</label>
              <input
                id="auth-signup-email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-signup-password">Senha</label>
              <input
                id="auth-signup-password"
                type="password"
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
              id="auth-submit-signup"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
