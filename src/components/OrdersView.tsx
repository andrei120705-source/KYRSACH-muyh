import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Check, ChevronRight, Copy, Download, FileText, LayoutGrid, List, PenTool, Plus, Search, Share2, Trash2, UserCheck, X, Zap } from 'lucide-react';
import { api, exportCsv } from '../api/client';
import { BODY_TYPE_LABELS, type BodyType, type Client, type Driver, ORDER_STATUS_META, type Order, type OrderStatus, PAYMENT_STATUS_META, POPULAR_CITIES, type PaymentStatus, type TariffCalculation, type Vehicle, estimateDistanceKm, formatMoney } from '../types/logistics';
import { type RoadType, quickCompareCityPair } from '../utils/tollRoads';
import { useToast } from './ToastProvider';

export function OrdersView({ clients, vehicles, drivers, selectedOrderId, onSelectOrderId, onDataChanged, onOpenDocumentForOrder }: { clients: Client[]; vehicles: Vehicle[]; drivers: Driver[]; selectedOrderId: number | null; onSelectOrderId: (id: number | null) => void; onDataChanged: () => void; onOpenDocumentForOrder: (id: number) => void }) {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);

  const loadOrders = async () => { try { setOrders(await api.getOrders({ status: statusFilter, search })); } catch {} };
  useEffect(() => { loadOrders(); }, [statusFilter]);
  useEffect(() => { if (selectedOrderId) api.getOrder(selectedOrderId).then(setDetail).catch(() => setDetail(null)); else setDetail(null); }, [selectedOrderId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? orders : orders.filter((o) => o.order_number.toLowerCase().includes(q) || o.cargo_name.toLowerCase().includes(q) || o.origin_city.toLowerCase().includes(q) || o.destination_city.toLowerCase().includes(q) || (o.client_name || '').toLowerCase().includes(q));
  }, [orders, search]);

  const refreshAll = async () => { await loadOrders(); onDataChanged(); if (selectedOrderId) setDetail(await api.getOrder(selectedOrderId)); };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по № заявки, городу, грузу..." className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${viewMode === 'table' ? 'bg-white shadow-xs' : 'text-slate-500'}`}><List className="w-3.5 h-3.5" />Таблица</button>
              <button onClick={() => setViewMode('kanban')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-white shadow-xs' : 'text-slate-500'}`}><LayoutGrid className="w-3.5 h-3.5" />Канбан</button>
            </div>
            <button onClick={() => { exportCsv('orders.csv', ['№', 'Клиент', 'Маршрут', 'Сумма'], filtered.map((o) => [o.order_number, o.client_name || '', `${o.origin_city}-${o.destination_city}`, o.total_cost])); notify('CSV выгружен'); }} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"><Download className="w-4 h-4" />CSV</button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"><Plus className="w-4 h-4" />Новая заявка</button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {([['all', 'Все'], ['new', 'Новые'], ['assigned', 'Назначены'], ['in_transit', 'В пути'], ['completed', 'Завершены']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setStatusFilter(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-500"><th className="py-3 px-4">Заявка</th><th className="py-3 px-4">Клиент / Груз</th><th className="py-3 px-4">Маршрут</th><th className="py-3 px-4">ТС / Водитель</th><th className="py-3 px-4">Статус</th><th className="py-3 px-4 text-right">Сумма</th><th className="py-3 px-4 text-right"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => {
                const st = ORDER_STATUS_META[o.status], pay = PAYMENT_STATUS_META[o.payment_status];
                const isDebtor = o.payment_status === 'unpaid' && ['in_transit', 'delivered', 'completed'].includes(o.status);
                return (
                  <tr key={o.id} onClick={() => onSelectOrderId(o.id)} className={`cursor-pointer ${isDebtor ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 font-mono font-bold">{o.order_number}{Boolean(o.is_urgent) && <span className="ml-1 text-rose-600"><Zap className="w-3 h-3 inline" /></span>}</td>
                    <td className="py-3 px-4"><div className="font-semibold">{o.client_name}</div><div className="text-slate-500">{o.cargo_name}</div></td>
                    <td className="py-3 px-4"><div className="font-medium flex items-center gap-1">{o.origin_city}<ChevronRight className="w-3 h-3" />{o.destination_city}</div><div className="text-slate-500">{o.distance_km} км</div></td>
                    <td className="py-3 px-4">{o.plate_number ? <div><div className="font-semibold">{o.brand_model}</div><div className="text-slate-500">{o.driver_name}</div></div> : <button onClick={(e) => { e.stopPropagation(); setAssignTarget(o); }} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold inline-flex items-center gap-1"><UserCheck className="w-3 h-3" />Назначить</button>}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full border font-medium ${st.badgeClass}`}>{st.label}</span><div className="mt-1"><span className={`px-1.5 py-0.5 rounded border text-[10px] ${pay.badgeClass}`}>{pay.label}</span></div></td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">{formatMoney(o.total_cost)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => onOpenDocumentForOrder(o.id)} className="p-1.5 text-slate-500 hover:text-blue-600"><FileText className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['new', 'assigned', 'in_transit', 'completed'] as OrderStatus[]).map((st) => (
            <div key={st} className="rounded-2xl bg-slate-100 p-3 space-y-2">
              <div className="text-xs font-bold uppercase text-slate-700">{ORDER_STATUS_META[st].label}</div>
              {filtered.filter((o) => o.status === st).map((o) => (<div key={o.id} onClick={() => onSelectOrderId(o.id)} className="cursor-pointer rounded-xl bg-white p-3 border border-slate-200 text-xs"><div className="font-mono font-bold">{o.order_number}</div><div className="font-semibold mt-1">{o.origin_city} → {o.destination_city}</div><div className="text-slate-500 mt-1">{formatMoney(o.total_cost)}</div></div>))}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateOrderModal clients={clients} onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await refreshAll(); notify('Заявка создана'); }} />}
      {assignTarget && <AssignModal order={assignTarget} vehicles={vehicles} drivers={drivers} onClose={() => setAssignTarget(null)} onAssigned={async () => { setAssignTarget(null); await refreshAll(); notify('ТС и водитель назначены'); }} />}
      {detail && <OrderDetailModal order={detail} onClose={() => onSelectOrderId(null)} onOpenAssign={() => setAssignTarget(detail)} onOpenDocument={() => onOpenDocumentForOrder(detail.id)} onUpdated={refreshAll} />}
    </div>
  );
}

function CreateOrderModal({ clients, onClose, onCreated }: { clients: Client[]; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id || 1); const [cargoName, setCargoName] = useState(''); const [weightTons, setWeightTons] = useState(14); const [volumeM3, setVolumeM3] = useState(55); const [bodyType, setBodyType] = useState<BodyType>('tent'); const [originCity, setOriginCity] = useState('Минск'); const [destinationCity, setDestinationCity] = useState('Москва'); const [roadChoice, setRoadChoice] = useState<RoadType>('toll'); const [tariff, setTariff] = useState<TariffCalculation | null>(null);
  const roadCompare = useMemo(() => quickCompareCityPair(originCity, destinationCity, estimateDistanceKm(originCity, destinationCity)), [originCity, destinationCity]);
  const distanceKm = roadChoice === 'toll' ? roadCompare.toll.distanceKm : roadCompare.free.distanceKm;
  useEffect(() => { api.calculateTariff({ clientId, bodyType, distanceKm, weightTons }).then(setTariff).catch(() => {}); }, [clientId, bodyType, distanceKm, weightTons]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between"><h3 className="text-sm font-bold flex items-center gap-2"><Calculator className="w-4 h-4 text-sky-400" /> Новая заявка</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <form onSubmit={async (e) => { e.preventDefault(); await api.createOrder({ client_id: clientId, cargo_name: cargoName, weight_tons: weightTons, volume_m3: volumeM3, body_type_required: bodyType, origin_city: originCity, destination_city: destinationCity, distance_km: distanceKm, notes: `Вариант: ${roadChoice === 'toll' ? 'по платным дорогам' : 'по бесплатным дорогам'}` }); onCreated(); }} className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <select value={clientId} onChange={(e) => setClientId(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2">{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)} className="rounded-xl border border-slate-200 px-3 py-2">{Object.entries(BODY_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <input required value={cargoName} onChange={(e) => setCargoName(e.target.value)} placeholder="Наименование груза *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={originCity} onChange={(e) => setOriginCity(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2">{POPULAR_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2">{POPULAR_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="number" value={weightTons} onChange={(e) => setWeightTons(Number(e.target.value))} placeholder="Вес, т" className="rounded-xl border border-slate-200 px-2 py-2" />
            <input type="number" value={volumeM3} onChange={(e) => setVolumeM3(Number(e.target.value))} placeholder="Объём, м³" className="rounded-xl border border-slate-200 px-2 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRoadChoice('toll')} className={`p-2.5 rounded-xl border text-left ${roadChoice === 'toll' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}><div className="font-bold text-amber-800">₽ Платная ({roadCompare.toll.distanceKm} км)</div><div>Затраты: {formatMoney(roadCompare.toll.total)} · ~{roadCompare.toll.totalEtaHours} ч</div></button>
            <button type="button" onClick={() => setRoadChoice('free')} className={`p-2.5 rounded-xl border text-left ${roadChoice === 'free' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}><div className="font-bold text-emerald-800">✓ Бесплатная ({roadCompare.free.distanceKm} км)</div><div>Затраты: {formatMoney(roadCompare.free.total)} · ~{roadCompare.free.totalEtaHours} ч</div></button>
          </div>
          {tariff && <div className="rounded-xl bg-slate-900 text-white p-3 flex justify-between items-center"><span>Итого клиенту ({distanceKm} км):</span><strong className="text-lg">{formatMoney(tariff.totalCost)}</strong></div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Создать заявку</button></div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ order, vehicles, drivers, onClose, onAssigned }: { order: Order; vehicles: Vehicle[]; drivers: Driver[]; onClose: () => void; onAssigned: () => void }) {
  const { notify } = useToast();
  const suitable = vehicles.filter((v) => v.status !== 'maintenance');
  const availDrivers = drivers.filter((d) => d.status !== 'vacation' && d.status !== 'sick');
  const [vehicleId, setVehicleId] = useState(suitable[0]?.id || 0);
  const [driverId, setDriverId] = useState(availDrivers[0]?.id || 0);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between"><h3 className="text-sm font-bold">Назначение · {order.order_number}</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <form onSubmit={async (e) => { e.preventDefault(); try { await api.assignOrder(order.id, vehicleId, driverId); onAssigned(); } catch (err: unknown) { notify(err instanceof Error ? err.message : 'Ошибка', 'error'); } }} className="p-5 space-y-3 text-xs">
          <select value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2">{suitable.map((v) => <option key={v.id} value={v.id}>{v.brand_model} ({v.plate_number}) · {v.capacity_tons} т</option>)}</select>
          <select value={driverId} onChange={(e) => setDriverId(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2">{availDrivers.map((d) => <option key={d.id} value={d.id}>{d.full_name} ({d.license_categories})</option>)}</select>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Назначить</button></div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onOpenAssign, onOpenDocument, onUpdated }: { order: Order; onClose: () => void; onOpenAssign: () => void; onOpenDocument: () => void; onUpdated: () => Promise<void> }) {
  const { notify } = useToast();
  const [showPod, setShowPod] = useState(false);
  const [podSigner, setPodSigner] = useState(order.pod_signer || order.client_contact || '');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const changeStatus = async (status: OrderStatus) => { await api.updateOrderStatus(order.id, { status }); await onUpdated(); notify(`Статус: ${ORDER_STATUS_META[status].label}`); };
  const savePod = async () => {
    if (!podSigner.trim() || !canvasRef.current) return;
    await api.saveOrderPod(order.id, { signer: podSigner, signature: canvasRef.current.toDataURL('image/png'), seal_ok: true });
    setShowPod(false); await onUpdated(); notify('Подпись ePOD сохранена');
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div><div className="font-mono font-bold text-sm">{order.order_number} · {order.origin_city} → {order.destination_city}</div><div className="text-xs text-slate-300">{order.client_name}</div></div>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard?.writeText(`Трекинг ${order.order_number}: ${ORDER_STATUS_META[order.status].label} (${order.progress_percent}%)`).catch(() => {}); notify('Отчёт скопирован'); }} className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-200 text-xs font-semibold inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /><Copy className="w-3 h-3" /></button>
            <button onClick={onOpenDocument} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-semibold">ТТН / CMR</button>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {order.status === 'new' && <button onClick={onOpenAssign} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold">Назначить ТС</button>}
            {['assigned', 'loading'].includes(order.status) && <button onClick={() => changeStatus('in_transit')} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold">В пути</button>}
            {['in_transit', 'delivered'].includes(order.status) && <button onClick={() => changeStatus('completed')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />Завершить</button>}
            <select value={order.payment_status} onChange={async (e) => { await api.patchOrder(order.id, { payment_status: e.target.value as PaymentStatus }); await onUpdated(); notify('Оплата обновлена'); }} className="ml-auto rounded-lg border border-slate-200 px-2 py-1 font-semibold"><option value="unpaid">Не оплачен</option><option value="partial">Предоплата</option><option value="paid">Оплачен</option></select>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 space-y-1"><div><strong>Груз:</strong> {order.cargo_name} ({order.weight_tons} т · {order.volume_m3} м³)</div><div><strong>ТС:</strong> {order.brand_model || '—'} ({order.plate_number || '—'}) · Водитель: {order.driver_name || '—'}</div><div><strong>Сумма:</strong> {formatMoney(order.total_cost)}</div></div>
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex justify-between font-bold"><span className="flex items-center gap-1"><PenTool className="w-3.5 h-3.5 text-emerald-600" /> Цифровая подпись ePOD</span><button onClick={() => setShowPod(!showPod)} className="text-blue-600">Подписать</button></div>
            {order.pod_signature && !showPod && <div className="flex items-center justify-between"><span>Подписал: {order.pod_signer}</span><img src={order.pod_signature} alt="ePOD" className="h-10 border rounded" /></div>}
            {showPod && (
              <div className="space-y-2">
                <input value={podSigner} onChange={(e) => setPodSigner(e.target.value)} placeholder="ФИО получателя" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" />
                <canvas ref={canvasRef} width={400} height={90} onPointerDown={(e) => { const c = canvasRef.current, ctx = c?.getContext('2d'); if (!c || !ctx) return; const r = c.getBoundingClientRect(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); drawing.current = true; }} onPointerMove={(e) => { if (!drawing.current || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'), r = canvasRef.current.getBoundingClientRect(); ctx?.lineTo(e.clientX - r.left, e.clientY - r.top); ctx?.stroke(); }} onPointerUp={() => { drawing.current = false; }} className="w-full h-[90px] bg-white rounded-lg border-2 border-dashed border-slate-300 touch-none" />
                <button onClick={savePod} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Сохранить ePOD</button>
              </div>
            )}
          </div>
          <div className="flex justify-end"><button onClick={async () => { await api.deleteOrder(order.id); onClose(); await onUpdated(); notify('Заявка удалена', 'info'); }} className="inline-flex items-center gap-1 text-rose-600 font-semibold"><Trash2 className="w-3.5 h-3.5" />Удалить заявку</button></div>
        </div>
      </div>
    </div>
  );
}
