'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const navLinks = [
    { href: '/marketplace', label: 'Marketplace' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>♠</span>
          <span className={styles.logoText}>Stake<span className={styles.logoAccent}>Hub</span></span>
        </Link>

        {/* Desktop links */}
        <div className={`${styles.links} hide-mobile`}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth actions */}
        <div className={`${styles.actions} hide-mobile`}>
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-outline btn-sm">
                Meu Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-outline btn-sm">
                Entrar
              </Link>
              <Link href="/auth/login?tab=signup" className="btn btn-primary btn-sm">
                Cadastrar
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className={`${styles.hamburger} hide-desktop`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? styles.close : ''}>
            {menuOpen ? '✕' : '☰'}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.mobileDivider} />
          {user ? (
            <>
              <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                Meu Dashboard
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className={styles.mobileLink}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                Entrar
              </Link>
              <Link href="/auth/login?tab=signup" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                Cadastrar
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
