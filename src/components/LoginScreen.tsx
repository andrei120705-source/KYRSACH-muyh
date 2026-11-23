import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Truck, User } from 'lucide-react';
import { type AppUser, DEMO_ACCOUNTS, ROLE_LABELS, authenticate } from '../utils/auth';

export function LoginScreen({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authenticate(login, password);
    if (!user) { setError('Неверный логин или пароль'); return; }
    setError(''); onLogin(user);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/70 backdrop-blur-md">
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><Truck className="w-6 h-6 text-white" /></div>
            <div><div className="font-bold text-white">ТрансЛогист PRO</div><div className="text-xs text-blue-100">TMS Control Tower</div></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white leading-snug">Автоматизация деятельности транспортной компании</h2>
            <ul className="text-sm text-blue-100 space-y-1.5">
              <li>• Заявки, диспетчеризация и биржа CMR24</li>
              <li>• Прокладка маршрутов по дорогам на Google Карте</li>
              <li>• Автопарк, ТО, ГСМ и водители</li>
              <li>• ТТН, CMR, акты и финансовая аналитика</li>
            </ul>
          </div>
          <div className="text-[11px] text-blue-200">ООО «ТрансЛогист Экспресс»</div>
        </div>
        <div className="p-8">
          <h1 className="text-xl font-bold text-white">Вход в систему</h1>
          <p className="text-xs text-slate-400 mt-1">Войдите под учётной записью сотрудника — доступные разделы зависят от роли.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Логин</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus value={login} onChange={(e) => setLogin(e.target.value)} placeholder="director" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Пароль</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            {error && <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-200">{error}</div>}
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white"><LogIn className="w-4 h-4" /> Войти</button>
          </form>
          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Демо-аккаунты (пароль 1234) — нажмите для входа</div>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button key={acc.login} type="button" onClick={() => onLogin({ login: acc.login, fullName: acc.fullName, role: acc.role })} className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left">
                  <span><span className="block text-xs font-semibold text-white">{acc.fullName}</span><span className="block text-[11px] text-slate-400">{ROLE_LABELS[acc.role]}</span></span>
                  <span className="font-mono text-[11px] text-sky-300">{acc.login}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
