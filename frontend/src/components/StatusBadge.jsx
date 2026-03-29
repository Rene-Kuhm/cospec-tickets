const STATUSES = {
  new:        { label: 'Nuevo',        cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  reviewing:  { label: 'En Revisión',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  on_the_way: { label: 'En Camino',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  resolved:   { label: 'Resuelto',     cls: 'bg-green-100 text-green-700 border-green-200' },
};

const PRIORITIES = {
  low:    { label: 'Baja',    cls: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal',  cls: 'bg-blue-100 text-blue-600' },
  high:   { label: 'Alta',    cls: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-600' },
};

export function StatusBadge({ status }) {
  const cfg = STATUSES[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITIES[priority] || { label: priority, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
