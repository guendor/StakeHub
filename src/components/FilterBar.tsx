'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import styles from './FilterBar.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: 'Abertos' },
  { value: 'funded', label: 'Fundados' },
  { value: 'in_progress', label: 'Em jogo' },
  { value: 'settled', label: 'Encerrados' },
];

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className={styles.bar}>
      {/* Status filter */}
      <select
        className={`form-select ${styles.select}`}
        value={searchParams.get('status') ?? ''}
        onChange={(e) => updateFilter('status', e.target.value)}
        aria-label="Filtrar por status"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Buy-in min */}
      <div className={styles.rangeGroup}>
        <span className={styles.rangeLabel}>Buy-in mín (R$)</span>
        <input
          type="number"
          min={0}
          step={50}
          className={`form-input ${styles.rangeInput}`}
          placeholder="0"
          value={searchParams.get('min_buyin') ?? ''}
          onChange={(e) => updateFilter('min_buyin', e.target.value)}
          aria-label="Buy-in mínimo"
        />
      </div>

      {/* Buy-in max */}
      <div className={styles.rangeGroup}>
        <span className={styles.rangeLabel}>Buy-in máx (R$)</span>
        <input
          type="number"
          min={0}
          step={50}
          className={`form-input ${styles.rangeInput}`}
          placeholder="Qualquer"
          value={searchParams.get('max_buyin') ?? ''}
          onChange={(e) => updateFilter('max_buyin', e.target.value)}
          aria-label="Buy-in máximo"
        />
      </div>

      {/* Date from */}
      <input
        type="date"
        className={`form-input ${styles.dateInput}`}
        value={searchParams.get('date_from') ?? ''}
        onChange={(e) => updateFilter('date_from', e.target.value)}
        aria-label="Data de início"
        title="De"
      />

      {/* Clear */}
      {(searchParams.toString()) && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push(pathname)}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
