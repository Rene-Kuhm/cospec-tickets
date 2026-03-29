export default function AppHeader({ section, user, onLogout, actions }) {
  return (
    <header className="flex items-center justify-between px-6 py-0 h-14 shrink-0"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>COSPEC</span>
        <span className="text-xs px-2 py-0.5 rounded-md font-medium"
          style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
          {section}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid var(--border)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            {user.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-primary)' }}>
            {user.name}
          </span>
          <button
            onClick={onLogout}
            className="text-xs px-2 py-1 rounded transition"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.target.style.color = '#D92D20'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
