import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Award, BarChart3, ChevronDown, ChevronUp, DollarSign, Navigation, Package, TrendingUp, Truck, Users, Wallet, Wrench } from 'lucide-react';
import { type DashboardData, ORDER_STATUS_META, type OrderStatus, formatMoney, formatNumber } from '../types/logistics';

const PIE_COLORS = ['#0284c7', '#4f46e5', '#d97706', '#2563eb', '#0d9488', '#10b981', '#e11d48'];

export function DashboardView({ data, loading, onNavigate, onOpenOrder }: { data: DashboardData | null; loading: boolean; onNavigate: (tab: string) => void; onOpenOrder: (orderId: number) => void }) {
  const [collapsed, setCollapsed] = useState({ kpis: false, motivation: false, charts: false, operations: false });
  const toggleSection = (k: keyof typeof collapsed) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));
  if (loading || !data) return <div className="p-8 text-center text-sm text-slate-500">Загрузка аналитики...</div>;

  const { kpis, monthlyDynamics, statusCounts, activeTrips, serviceAlerts } = data;
  const totalLogistPay = 65000 + Math.round(Math.max(0, kpis.totalMargin) * 0.08);
  const salaryProgress = Math.min(100, Math.round((totalLogistPay / 140000) * 100));
  const receivables = Math.max(0, kpis.totalRevenue - kpis.paidRevenue);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">Блоки дашборда:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {([['kpis', 'KPI', DollarSign], ['motivation', 'Мотивация', Award], ['charts', 'Графики', BarChart3], ['operations', 'Рейсы и ТО', Navigation]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => toggleSection(id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${collapsed[id] ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-900 text-white border-slate-900'}`}>
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>{collapsed[id] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      {!collapsed.kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Выручка</span><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{formatMoney(kpis.totalRevenue)}</div>
            <div className="mt-2 flex justify-between text-xs"><span className="text-slate-500">Оплачено: {formatMoney(kpis.paidRevenue)}</span><span className="text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {kpis.marginPercent}%</span></div>
          </div>
          <div onClick={() => onNavigate('orders')} className="relative overflow-hidden cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-sky-400" />
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Активные рейсы</span><Navigation className="w-5 h-5 text-blue-600" /></div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{kpis.activeTripsCount}</div>
            <div className="mt-2 flex justify-between text-xs"><span className="text-amber-600 font-medium">{kpis.newOrdersCount} новых</span><span className="text-slate-500">Завершено: {kpis.completedCount}</span></div>
          </div>
          <div onClick={() => onNavigate('fleet')} className="relative overflow-hidden cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 to-violet-500" />
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Автопарк</span><Truck className="w-5 h-5 text-indigo-600" /></div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{kpis.fleetUtilization}%</div>
            <div className="mt-2 text-xs text-slate-500">{kpis.busyVehicles} из {kpis.totalVehicles} ТС в рейсе</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-slate-500">Водители</span><Users className="w-5 h-5 text-amber-600" /></div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{kpis.availableDrivers} / {kpis.totalDrivers}</div>
            <div className="mt-2 text-xs text-slate-500">Пробег: {formatNumber(kpis.totalDistance)} км</div>
          </div>
        </div>
      )}

      {!collapsed.motivation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Мотивация и KPI логиста</div>
              <div className="text-2xl font-bold tabular-nums">{formatMoney(totalLogistPay)}</div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${salaryProgress}%` }} /></div>
            </div>
            <button onClick={() => onNavigate('exchange')} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold">Биржа CMR24 →</button>
          </div>
          <div className="rounded-2xl bg-white border border-rose-200 p-5 flex flex-col justify-between">
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-rose-600">Дебиторка</span><Wallet className="w-4 h-4 text-rose-600" /></div>
            <div className="text-2xl font-bold tabular-nums mt-2">{formatMoney(receivables)}</div>
            <button onClick={() => onNavigate('orders')} className="text-xs font-semibold text-rose-600 text-left mt-1">Проверить счета →</button>
          </div>
        </div>
      )}

      {!collapsed.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-base font-semibold mb-3">Финансовая динамика</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyDynamics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => formatMoney(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-base font-semibold mb-2">Статусы заявок</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={statusCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72}>{statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!collapsed.operations && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-center"><h3 className="text-base font-semibold">Активные рейсы</h3><button onClick={() => onNavigate('tracking')} className="text-xs font-semibold text-blue-600 flex items-center gap-1">Карта <ArrowRight className="w-3.5 h-3.5" /></button></div>
            {activeTrips.slice(0, 5).map((trip) => {
              const meta = ORDER_STATUS_META[trip.status as OrderStatus];
              return (
                <div key={trip.id} onClick={() => onOpenOrder(trip.id)} className="cursor-pointer rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50">
                  <div className="flex justify-between items-center"><span className="font-semibold text-sm">{trip.order_number} · {trip.origin_city} → {trip.destination_city}</span><span className={`px-2 py-0.5 rounded-full text-xs border ${meta.badgeClass}`}>{meta.label}</span></div>
                  <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {trip.cargo_name}</div>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-base font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-500" /> Контроль ТО</h3>
            {serviceAlerts.map((v) => (<div key={v.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2 text-xs"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /><div><div className="font-semibold">{v.brand_model} ({v.plate_number})</div><div className="text-slate-600">Требуется ТО / ремонт</div></div></div>))}
          </div>
        </div>
      )}
    </div>
  );
}
