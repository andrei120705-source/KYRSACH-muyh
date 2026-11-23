import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ClipboardList, Search, Truck, Users, X } from 'lucide-react';
import type { Client, Driver, Order, Vehicle } from '../types/logistics';
interface CommandPaletteProps { open: boolean; onClose: () => void; orders: Order[]; vehicles: Vehicle[]; drivers: Driver[]; clients: Client[]; onNavigate: (tab: string) => void; onOpenOrder: (orderId: number) => void; }
export function CommandPalette({ open, onClose, orders, vehicles, drivers, clients, onNavigate, onOpenOrder }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
      matchedOrders: orders.filter((o) => !q || o.order_number.toLowerCase().includes(q) || o.origin_city.toLowerCase().includes(q) || o.destination_city.toLowerCase().includes(q) || o.cargo_name.toLowerCase().includes(q)).slice(0, 4),
      matchedVehicles: vehicles.filter((v) => !q || v.plate_number.toLowerCase().includes(q) || v.brand_model.toLowerCase().includes(q)).slice(0, 3),
      matchedDrivers: drivers.filter((d) => !q || d.full_name.toLowerCase().includes(q)).slice(0, 3),
      matchedClients: clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.inn.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [query, orders, vehicles, drivers, clients]);
  if (!open) return null;
  return (
    <div onClick={onClose} className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-[12vh] p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Быстрый поиск: № заявки, город, гос. номер, водитель, клиент..." className="flex-1 text-sm focus:outline-none text-slate-900" />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          {results.matchedOrders.length > 0 && (<div><div className="px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">Заявки</div>{results.matchedOrders.map((o) => (<button key={o.id} onClick={() => { onOpenOrder(o.id); onClose(); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-left"><span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" /><span className="font-mono font-bold">{o.order_number}</span><span>{o.origin_city} → {o.destination_city}</span></span><span className="text-slate-400">{o.client_name}</span></button>))}</div>)}
          {results.matchedVehicles.length > 0 && (<div><div className="px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">Автопарк</div>{results.matchedVehicles.map((v) => (<button key={v.id} onClick={() => { onNavigate('fleet'); onClose(); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-left"><span className="flex items-center gap-2"><Truck className="w-4 h-4 text-indigo-600" /><span className="font-semibold">{v.brand_model}</span></span><span className="font-mono text-slate-500">{v.plate_number}</span></button>))}</div>)}
          {results.matchedDrivers.length > 0 && (<div><div className="px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">Водители</div>{results.matchedDrivers.map((d) => (<button key={d.id} onClick={() => { onNavigate('drivers'); onClose(); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-left"><span className="flex items-center gap-2"><Users className="w-4 h-4 text-amber-600" /><span className="font-semibold">{d.full_name}</span></span><span className="text-slate-500">{d.license_categories}</span></button>))}</div>)}
          {results.matchedClients.length > 0 && (<div><div className="px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">Клиенты</div>{results.matchedClients.map((c) => (<button key={c.id} onClick={() => { onNavigate('clients'); onClose(); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-left"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600" /><span className="font-semibold">{c.name}</span></span><span className="font-mono text-slate-400">ИНН {c.inn}</span></button>))}</div>)}
        </div>
      </div>
    </div>
  );
}
