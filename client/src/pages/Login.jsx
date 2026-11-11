import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Loader2,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  CalendarCheck,
  FolderKanban,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Stagger helper for the entrance animation.
const delay = (ms) => ({ animationDelay: `${ms}ms` });

const BAR_HEIGHTS = [38, 62, 48, 80, 56, 92, 70];

// Decorative brand panel (desktop only): drifting gradient blobs, a bar chart
// that grows in, and two floating module cards echoing the sidebar's
// Attendance (blue) / Projects (green) accents.
function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] overflow-hidden bg-slate-950 text-white">
      {/* Animated background */}
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-blue-600/35 blur-3xl login-blob" />
      <div
        className="absolute bottom-[-8rem] right-[-6rem] w-[30rem] h-[30rem] rounded-full bg-emerald-500/25 blur-3xl login-blob"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl login-blob"
        style={{ animationDelay: '-12s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
        <div className="flex items-center gap-2.5 login-fade-up">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TAL Analytics</span>
        </div>

        {/* Illustration */}
        <div className="relative mx-auto w-full max-w-md h-80 login-fade-in" style={delay(200)}>
          <div className="absolute inset-x-6 bottom-6 top-14 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-white/60">Weekly overview</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">Live</span>
            </div>
            <div className="flex-1 flex items-end gap-3">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500/70 to-sky-300/90 login-bar"
                  style={{ height: `${h}%`, ...delay(400 + i * 90) }}
                />
              ))}
            </div>
          </div>

          <div className="absolute -left-2 top-2 login-float">
            <div className="flex items-center gap-3 rounded-xl bg-white text-slate-900 shadow-2xl shadow-blue-900/40 px-4 py-3 login-fade-up" style={delay(700)}>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 leading-none mb-1">Attendance</p>
                <p className="text-sm font-semibold leading-none">Records synced</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 bottom-0 login-float" style={{ animationDelay: '-3s' }}>
            <div className="flex items-center gap-3 rounded-xl bg-white text-slate-900 shadow-2xl shadow-emerald-900/40 px-4 py-3 login-fade-up" style={delay(900)}>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 leading-none mb-1">Projects</p>
                <p className="text-sm font-semibold leading-none">Status tracked</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-fade-up" style={delay(300)}>
          <h2 className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight">
            Attendance &amp; project records,
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent">
              all in one place.
            </span>
          </h2>
          <p className="mt-3 text-sm text-white/60 max-w-md">
            Upload reports, track employees and follow every project from a single dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, icon: Icon, style, children }) {
  return (
    <div className="space-y-1.5 login-fade-up" style={style}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-600" />
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60';

export default function Login() {
  const { login, isAuthenticated, isChecking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | submitting | success

  // Already logged in (e.g. navigated to /login manually) - skip the form,
  // but not while the success animation is playing.
  if (!isChecking && isAuthenticated && phase === 'idle') {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phase !== 'idle') return;
    setError('');
    setPhase('submitting');
    try {
      await login(username.trim(), password);
      setPhase('success');
      setTimeout(() => navigate(redirectTo, { replace: true }), 650);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response ? 'Login failed. Please try again.' : 'Cannot reach the server. Please try again later.')
      );
      setShaking(true);
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';

  return (
    <div className="min-h-screen flex bg-slate-50">
      <BrandPanel />

      <div className="relative flex-1 flex items-center justify-center px-4 py-10 sm:px-8 overflow-hidden">
        {/* Soft animated glow (also gives mobile some life) */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-200/50 blur-3xl login-blob lg:opacity-60" />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-200/50 blur-3xl login-blob lg:opacity-60"
          style={{ animationDelay: '-9s' }}
        />

        <div className="relative w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8 login-fade-up">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">TAL Analytics</span>
          </div>

          <div
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && shaking) setShaking(false);
            }}
            className={`rounded-2xl bg-white/90 backdrop-blur border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6 sm:p-8 ${
              shaking ? 'login-shake' : 'login-fade-up'
            }`}
          >
            <div className="login-fade-up" style={delay(100)}>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <Field id="username" label="Username" icon={User} style={delay(180)}>
                <input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  required
                  className={inputClass}
                />
              </Field>

              <Field id="password" label="Password" icon={KeyRound} style={delay(260)}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 login-fade-up"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 login-fade-up" style={delay(340)}>
                <button
                  type="submit"
                  disabled={busy || !username || !password}
                  className={`group relative w-full h-11 overflow-hidden rounded-lg text-sm font-semibold text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed ${
                    phase === 'success'
                      ? 'bg-emerald-600 shadow-emerald-600/30'
                      : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg'
                  }`}
                >
                  {phase === 'submitting' && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent login-shimmer" />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {phase === 'idle' && (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                    {phase === 'submitting' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in…
                      </>
                    )}
                    {phase === 'success' && (
                      <>
                        <Check className="w-5 h-5 login-pop" />
                        Welcome!
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>

          <p
            className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 login-fade-up"
            style={delay(450)}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Authorized personnel only. Contact your admin for access.
          </p>
        </div>
      </div>
    </div>
  );
}
