import type { UserRole } from '../types/logistics';
export type NavTab = 'dashboard' | 'orders' | 'exchange' | 'tracking' | 'fleet' | 'drivers' | 'clients' | 'documents';
export interface AppUser { login: string; fullName: string; role: UserRole; }
interface DemoAccount extends AppUser { password: string; }
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { login: 'director', password: '1234', fullName: 'Орлов Сергей Николаевич', role: 'director' },
  { login: 'dispatcher', password: '1234', fullName: 'Лебедева Анна Викторовна', role: 'dispatcher' },
  { login: 'manager', password: '1234', fullName: 'Карпов Илья Андреевич', role: 'logist' },
];
export const ROLE_LABELS: Record<UserRole, string> = { director: 'Руководитель ТК', dispatcher: 'Диспетчер-логист', logist: 'Менеджер по клиентам' };
export const ROLE_TABS: Record<UserRole, NavTab[]> = {
  director: ['dashboard', 'orders', 'exchange', 'tracking', 'fleet', 'drivers', 'clients', 'documents'],
  dispatcher: ['dashboard', 'orders', 'exchange', 'tracking', 'fleet', 'drivers', 'documents'],
  logist: ['dashboard', 'orders', 'exchange', 'tracking', 'clients', 'documents'],
};
export const ROLE_DEFAULT_TAB: Record<UserRole, NavTab> = { director: 'dashboard', dispatcher: 'orders', logist: 'orders' };
export function canResetDemo(role: UserRole): boolean { return role === 'director'; }
const SESSION_KEY = 'translogist_session_v1';
export function authenticate(login: string, password: string): AppUser | null {
  const acc = DEMO_ACCOUNTS.find((a) => a.login.toLowerCase() === login.trim().toLowerCase() && a.password === password);
  return acc ? { login: acc.login, fullName: acc.fullName, role: acc.role } : null;
}
export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    return parsed?.login && parsed?.role && parsed.role in ROLE_TABS ? parsed : null;
  } catch { return null; }
}
export function saveSession(user: AppUser) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {} }
export function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }
export function initials(fullName: string): string { return fullName.split(' ').slice(0, 2).map((s) => s[0] || '').join('').toUpperCase(); }
