import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Clock, ShieldAlert, Wallet, Wrench, UserX } from 'lucide-react';
import { type Driver, type Order, type Vehicle, formatMoney } from '../types/logistics';
import type { NavTab } from '../utils/auth';
interface NotificationCenterProps { orders: Order[]; vehicles: Vehicle[]; drivers: Driver[]; allowedTabs: NavTab[]; onOpenOrder: (orderId: number) => void; onNavigate: (tab: NavTab) => void; }
type Severity = 'critical' | 'warning' | 'info';
interface AppNotification { id: string; severity: Severity; icon: React.ComponentType<{ className?: string }>; title: string; description: string; orderId?: number; tab?: NavTab; }
const DISMISSED_KEY = 'translogist_dismissed_notifications';
function parseDate(v: string | null | undefined): Date | null { if (!v) return null; const d = new Date(v.replace(' ', 'T')); return Number.isNaN(d.getTime()) ? null : d; }
function daysBetween(a: Date, b: Date): number { return Math.floor((b.getTime() - a.getTime()) / 86400000); }
export function buildNotifications(orders: Order[], vehicles: Vehicle[], drivers: Driver[], now: Date = new Date()): AppNotification[] {
  const list: AppNotification[] = [];
  for (const o of orders) {
    const active = ['assigned', 'loading', 'in_transit'].includes(o.status);
    const arrival = parseDate(o.planned_arrival);
    if (active && arrival && arrival < now) {
      list.push({ id: `late-${o.id}-${o.planned_arrival}`, severity: 'critical', icon: Clock, title: `Опоздание рейса ${o.order_number}`, description: `${o.origin_city} → ${o.destination_city}`, orderId: o.id });
    }
    if (o.status === 'new' && !o.vehicle_id) {
      list.push({ id: `unassigned-${o.id}`, severity: 'warning', icon: AlertTriangle, title: `Не назначен транспорт: ${o.order_number}`, description: `${o.origin_city} → ${o.destination_city}`, orderId: o.id });
    }
    if (o.payment_status === 'unpaid' && ['delivered', 'completed'].includes(o.status)) {
      list.push({ id: `debt-${o.id}`, severity: 'warning', icon: Wallet, title: `Не оплачен рейс ${o.order_number}`, description: `${o.client_name || 'Клиент'}: ${formatMoney(o.total_cost)}`, orderId: o.id });
    }
    if (o.is_adr && o.driver_id && active) {
      const d = drivers.find((x) => x.id === o.driver_id);
      if (d && !/ADR/i.test(d.license_categories)) list.push({ id: `adr-${o.id}-${d.id}`, severity: 'critical', icon: ShieldAlert, title: `Нет допуска ADR: ${o.order_number}`, description: d.full_name, orderId: o.id });
    }
  }
  for (const v of vehicles) {
    const left = v.next_service_km - v.mileage_km;
    if (v.status !== 'maintenance' && left <= 8000) list.push({ id: `service-${v.id}-${v.next_service_km}`, severity: left <= 0 ? 'critical' : 'warning', icon: Wrench, title: left <= 0 ? `Просрочено ТО: ${v.plate_number}` : `Скоро ТО: ${v.plate_number}`, description: `${v.brand_model}: ${Math.abs(left)} км`, tab: 'fleet' });
  }
  for (const d of drivers) {
    const until = parseDate(d.medical_cert_until);
    if (until && daysBetween(now, until) <= 30) list.push({ id: `med-${d.id}-${d.medical_cert_until}`, severity: daysBetween(now, until) < 0 ? 'critical' : 'warning', icon: UserX, title: `Медсправка: ${d.full_name.split(' ')[0]}`, description: `До ${d.medical_cert_until}`, tab: 'drivers' });
  }
  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  return list.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
const SEVERITY_STYLE: Record<Severity, { dot: string; icon: string }> = {
  critical: { dot: 'bg-rose-500', icon: 'text-rose-600 bg-rose-50' },
  warning: { dot: 'bg-amber-500', icon: 'text-amber-600 bg-amber-50' },
  info: { dot: 'bg-sky-500', icon: 'text-sky-600 bg-sky-50' },
};
export function NotificationCenter({ orders, vehicles, drivers, allowedTabs, onOpenOrder, onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; } });
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed.slice(-300))); } catch {} }, [dismissed]);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick); return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);
  const visible = useMemo(() => buildNotifications(orders, vehicles, drivers).filter((n) => (!n.tab || allowedTabs.includes(n.tab)) && !dismissed.includes(n.id)), [orders, vehicles, drivers, allowedTabs, dismissed]);
  const criticalCount = visible.filter((n) => n.severity === 'critical').length;
  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Уведомления" className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600">
        <Bell className="w-4 h-4" />
        {visible.length > 0 && <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${criticalCount > 0 ? 'bg-rose-600' : 'bg-amber-500'}`}>{visible.length}</span>}
      </button>
      {open && (
        <div className="animate-fadeIn absolute right-0 mt-2 w-[min(92vw,400px)] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Уведомления ({visible.length})</div>
            {visible.length > 0 && <button onClick={() => setDismissed((prev) => [...prev, ...visible.map((n) => n.id)])} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600"><CheckCheck className="w-3.5 h-3.5" /> Прочитать все</button>}
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {visible.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-500">Новых уведомлений нет</div>}
            {visible.map((n) => {
              const Icon = n.icon; const st = SEVERITY_STYLE[n.severity];
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${st.icon}`}><Icon className="w-4 h-4" /></div>
                  <button onClick={() => { if (n.orderId) onOpenOrder(n.orderId); else if (n.tab) onNavigate(n.tab); setOpen(false); }} className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-semibold text-slate-900 truncate">{n.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{n.description}</div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
