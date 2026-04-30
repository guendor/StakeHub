import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'StakeHub — Marketplace de Poker Staking',
    template: '%s | StakeHub',
  },
  description:
    'Conectando jogadores de poker com investidores. Publique cotas de torneios, encontre backers e cresça seu jogo com StakeHub.',
  keywords: ['poker staking', 'cavalagem poker', 'poker brasil', 'backer', 'horse poker'],
  openGraph: {
    siteName: 'StakeHub',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="page-shell">
          <Navbar />
          <main className="page-main">{children}</main>
          <footer style={{
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-8) 0',
            textAlign: 'center',
          }}>
            <div className="container">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                © 2026 StakeHub · Marketplace de Poker Staking · Pagamentos não processados na plataforma
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
