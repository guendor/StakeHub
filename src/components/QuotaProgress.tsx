interface QuotaProgressProps {
  total: number;
  taken: number;
}

export default function QuotaProgress({ total, taken }: QuotaProgressProps) {
  const pct = total > 0 ? Math.min((taken / total) * 100, 100) : 0;
  const isFull = pct >= 100;

  return (
    <div>
      <div className="progress-track">
        <div
          className={`progress-fill${isFull ? ' full' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {taken} / {total} cotas
        </span>
        <span style={{ fontSize: '0.78rem', color: isFull ? 'var(--color-gold)' : 'var(--text-muted)' }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
