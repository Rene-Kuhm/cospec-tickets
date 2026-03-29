import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-10"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        <div className="flex items-center gap-2.5">
          <WifiIcon className="w-6 h-6 opacity-90" />
          <span className="font-semibold text-lg tracking-tight">COSPEC</span>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-snug mb-3" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Gestión de reclamos<br />técnicos en tiempo real
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Secretaría · Técnicos · Administración
          </p>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          COSPEC Comunicaciones · Eduardo Castex, La Pampa
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <WifiIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>COSPEC</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Bienvenido
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Ingresá con tu cuenta de COSPEC
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Usuario">
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                placeholder="admin"
                required
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                placeholder="••••••••"
                required
              />
            </Field>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm"
                style={{ background: '#FFF0F0', color: '#D92D20', border: '1px solid #FFC9C9' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: loading ? 'var(--accent)' : 'var(--accent)' }}
              onMouseEnter={e => !loading && (e.target.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => e.target.style.background = 'var(--accent)'}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function WifiIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}
