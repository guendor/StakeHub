import { type ListingStatus } from '@/types';

const labels: Record<ListingStatus, string> = {
  open: 'Aberto',
  funded: 'Fundado',
  in_progress: 'Em jogo',
  settled: 'Encerrado',
};

const dots: Record<ListingStatus, string> = {
  open: '●',
  funded: '●',
  in_progress: '●',
  settled: '●',
};

export default function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span style={{ fontSize: '0.5rem' }}>{dots[status]}</span>
      {labels[status]}
    </span>
  );
}
