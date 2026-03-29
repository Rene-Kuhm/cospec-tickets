const STATUSES = {
  new:        { label: 'Nuevo',       dot: '#9CA3AF', bg: '#F3F4F6', color: '#374151' },
  reviewing:  { label: 'En Revisión', dot: '#4F3FE6', bg: '#EEF0FF', color: '#4F3FE6' },
  on_the_way: { label: 'En Camino',   dot: '#D97706', bg: '#FFFBEB', color: '#92400E' },
  resolved:   { label: 'Resuelto',    dot: '#059669', bg: '#ECFDF5', color: '#065F46' },
};

const PRIORITIES = {
  low:    { label: 'Baja',     bg: '#F3F4F6', color: '#6B7280' },
  normal: { label: 'Normal',   bg: '#EEF0FF', color: '#4F3FE6' },
  high:   { label: 'Alta',     bg: '#FFF7ED', color: '#C2410C' },
  urgent: { label: '🔴 Urgente', bg: '#FFF0F0', color: '#D92D20' },
};

export function StatusBadge({ status }) {
  const cfg = STATUSES[status] || { label: status, dot: '#9CA3AF', bg: '#F3F4F6', color: '#374151' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITIES[priority] || { label: priority, bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}
