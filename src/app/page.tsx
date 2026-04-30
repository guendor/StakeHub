import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { computeListingValues, type Listing } from '@/types';
import ListingCard from '@/components/ListingCard';
import styles from './page.module.css';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: rawListings } = await supabase
    .from('listings')
    .select('*, profiles(*), interests(id, quotas_wanted)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(6);

  const listings: Listing[] = (rawListings ?? []).map(computeListingValues);

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <p className="section-label animate-fade-up">O marketplace de poker staking do Brasil</p>
            <h1 className={`${styles.heroTitle} animate-fade-up animate-delay-1`}>
              Conectando <span className="gradient-text">Jogadores</span> e{' '}
              <span className="gradient-text">Investidores</span>
            </h1>
            <p className={`${styles.heroSub} animate-fade-up animate-delay-2`}>
              Publique cotas de torneios, encontre backers qualificados e acompanhe
              seus staking deals — tudo em um só lugar.
            </p>
            <div className={`${styles.heroCtas} animate-fade-up animate-delay-3`}>
              <Link href="/auth/login?tab=signup&role=player" className="btn btn-gold btn-lg">
                ♠ Sou Jogador
              </Link>
              <Link href="/marketplace" className="btn btn-primary btn-lg">
                🔎 Explorar Marketplace
              </Link>
            </div>
          </div>

          <div className={`${styles.heroVisual} animate-fade-in animate-delay-2`}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardBadge}>🎯 Aberto</div>
              <div className={styles.heroCardTitle}>Main Event BSOP 2026</div>
              <div className={styles.heroCardStat}>
                <span>Buy-in</span><strong>R$ 3.200</strong>
              </div>
              <div className={styles.heroCardStat}>
                <span>Preço/cota</span><strong style={{ color: 'var(--color-gold)' }}>R$ 384</strong>
              </div>
              <div className={styles.heroCardStat}>
                <span>Cotas</span><strong>12 / 15</strong>
              </div>
              <div className={styles.heroCardProgress}>
                <div style={{ width: '80%' }} />
              </div>
              <div className={styles.heroCardPlayer}>
                <span>🃏</span>
                <span>Felipe Tavares</span>
                <span className="badge badge-player">Jogador</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <p className="section-label">Como funciona</p>
            <h2>Três passos simples</h2>
          </div>
          <div className="grid-3">
            {HOW_STEPS.map((step, i) => (
              <div
                key={i}
                className={`card ${styles.stepCard} animate-fade-up`}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p style={{ fontSize: '0.9rem' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {listings.length > 0 && (
        <section className={styles.featuredSection}>
          <div className="container">
            <div className={styles.sectionHead}>
              <div>
                <p className="section-label">Anúncios recentes</p>
                <h2>Oportunidades abertas</h2>
              </div>
              <Link href="/marketplace" className="btn btn-outline">
                Ver todos →
              </Link>
            </div>
            <div className="grid-3">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l} animate delay={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={`container ${styles.ctaInner}`}>
          <div>
            <h2 style={{ marginBottom: 'var(--space-3)' }}>
              Pronto para começar?
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
              Crie seu perfil gratuitamente e publique seu primeiro anúncio de staking hoje.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/auth/login?tab=signup&role=player" className="btn btn-gold btn-lg">
              Sou Jogador
            </Link>
            <Link href="/auth/login?tab=signup&role=backer" className="btn btn-primary btn-lg">
              Sou Investidor
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

const HOW_STEPS = [
  {
    icon: '📝',
    title: '1. Crie seu perfil',
    desc: 'Cadastre-se como Jogador ou Investidor. Jogadores completam seu perfil com bio e conquistas.',
  },
  {
    icon: '🎯',
    title: '2. Publique ou explore',
    desc: 'Jogadores publicam anúncios com detalhes do torneio. Investidores filtram e encontram oportunidades.',
  },
  {
    icon: '🤝',
    title: '3. Registre interesse',
    desc: 'Investidores registram interesse nas cotas desejadas. O deal é fechado entre as partes diretamente.',
  },
];
